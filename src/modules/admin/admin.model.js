const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/database');

class AdminModel {
  async safeSelect(query, replacements = []) {
    try {
      return await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT,
      });
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return [];
      }

      throw error;
    }
  }

  async safeSingle(query, replacements = [], fallback = {}) {
    const rows = await this.safeSelect(query, replacements);
    return rows[0] || fallback;
  }

  isMissingTableError(error) {
    const message = error?.message || '';

    return (
      message.includes("doesn't exist") ||
      message.includes('Unknown table') ||
      message.includes('ER_NO_SUCH_TABLE')
    );
  }

  toNumber(value) {
    return Number(value || 0);
  }

  formatGrowth(currentValue, previousValue) {
    const current = this.toNumber(currentValue);
    const previous = this.toNumber(previousValue);

    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  async getDashboardStats() {
    const [
      users,
      bookings,
      revenue,
      tickets,
      userGrowth,
      activeUsers,
      bookingStatuses,
      paymentStatuses,
    ] = await Promise.all([
      this.safeSingle('SELECT COUNT(*) AS totalUsers FROM users'),
      this.safeSingle('SELECT COUNT(*) AS totalBookings FROM transport_bookings'),
      this.safeSingle(
        "SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM payments WHERE status = 'completed'"
      ),
      this.safeSingle(
        "SELECT COUNT(*) AS pendingTickets FROM support_tickets WHERE status IN ('open', 'in-progress')"
      ),
      this.safeSingle(`
        SELECT
          SUM(
            CASE
              WHEN YEAR(createdAt) = YEAR(CURRENT_DATE())
                AND MONTH(createdAt) = MONTH(CURRENT_DATE())
              THEN 1
              ELSE 0
            END
          ) AS currentMonthUsers,
          SUM(
            CASE
              WHEN YEAR(createdAt) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
                AND MONTH(createdAt) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
              THEN 1
              ELSE 0
            END
          ) AS previousMonthUsers
        FROM users
      `),
      this.safeSingle(`
        SELECT COUNT(DISTINCT userId) AS activeUsers
        FROM transport_bookings
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `),
      this.safeSingle(`
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingBookings,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmedBookings,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedBookings
        FROM transport_bookings
      `),
      this.safeSingle(`
        SELECT
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedPayments,
          SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) AS refundedPayments
        FROM payments
      `),
    ]);

    return {
      totalUsers: this.toNumber(users.totalUsers),
      totalBookings: this.toNumber(bookings.totalBookings),
      totalRevenue: this.toNumber(revenue.totalRevenue),
      pendingTickets: this.toNumber(tickets.pendingTickets),
      monthlyGrowth: this.formatGrowth(
        userGrowth.currentMonthUsers,
        userGrowth.previousMonthUsers
      ),
      activeUsers: this.toNumber(activeUsers.activeUsers),
      stats: {
        pendingBookings: this.toNumber(bookingStatuses.pendingBookings),
        confirmedBookings: this.toNumber(bookingStatuses.confirmedBookings),
        completedBookings: this.toNumber(bookingStatuses.completedBookings),
        completedPayments: this.toNumber(paymentStatuses.completedPayments),
        refundedPayments: this.toNumber(paymentStatuses.refundedPayments),
      },
    };
  }

  async getUsers(filters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    const replacements = [];

    if (filters.role) {
      conditions.push('role = ?');
      replacements.push(filters.role);
    }

    if (filters.searchQuery) {
      conditions.push('(email LIKE ? OR firstName LIKE ? OR lastName LIKE ?)');
      replacements.push(
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [users, totalRow] = await Promise.all([
      this.safeSelect(
        `
          SELECT id, email, firstName, lastName, role, createdAt
          FROM users
          ${whereClause}
          ORDER BY createdAt DESC
          LIMIT ? OFFSET ?
        `,
        [...replacements, limit, offset]
      ),
      this.safeSingle(
        `
          SELECT COUNT(*) AS total
          FROM users
          ${whereClause}
        `,
        replacements,
        { total: 0 }
      ),
    ]);

    return {
      users,
      total: this.toNumber(totalRow.total),
      page,
    };
  }

  async getBookings(filters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    const replacements = [];

    if (filters.status) {
      conditions.push('tb.status = ?');
      replacements.push(filters.status);
    }

    if (filters.type) {
      conditions.push('tb.vehicleType = ?');
      replacements.push(filters.type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [bookings, totalRow] = await Promise.all([
      this.safeSelect(
        `
          SELECT
            tb.id,
            tb.userId,
            u.email,
            tb.pickupLocation,
            tb.dropoffLocation,
            tb.vehicleType,
            tb.status,
            COALESCE(tb.finalPrice, tb.estimatedPrice, 0) AS amount,
            tb.createdAt
          FROM transport_bookings tb
          LEFT JOIN users u ON u.id = tb.userId
          ${whereClause}
          ORDER BY tb.createdAt DESC
          LIMIT ? OFFSET ?
        `,
        [...replacements, limit, offset]
      ),
      this.safeSingle(
        `
          SELECT COUNT(*) AS total
          FROM transport_bookings tb
          ${whereClause}
        `,
        replacements,
        { total: 0 }
      ),
    ]);

    return {
      bookings,
      total: this.toNumber(totalRow.total),
      page,
    };
  }

  async getPayments() {
    const [payments, totals, methodBreakdown] = await Promise.all([
      this.safeSelect(`
        SELECT
          id,
          bookingId,
          userId,
          amount,
          paymentMethod AS method,
          status,
          transactionId,
          createdAt
        FROM payments
        ORDER BY createdAt DESC
        LIMIT 10
      `),
      this.safeSingle(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS totalRevenue,
          COUNT(*) AS totalTransactions
        FROM payments
      `),
      this.safeSelect(`
        SELECT
          paymentMethod AS method,
          COALESCE(SUM(amount), 0) AS totalAmount
        FROM payments
        WHERE status = 'completed'
        GROUP BY paymentMethod
      `),
    ]);

    return {
      payments,
      totalRevenue: this.toNumber(totals.totalRevenue),
      totalTransactions: this.toNumber(totals.totalTransactions),
      methodBreakdown,
    };
  }

  async getSupportTickets() {
    const [tickets, totalRow] = await Promise.all([
      this.safeSelect(`
        SELECT
          st.id,
          st.userId,
          u.email,
          st.subject,
          st.priority,
          st.status,
          st.createdAt
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.userId
        ORDER BY st.createdAt DESC
        LIMIT 10
      `),
      this.safeSingle(
        "SELECT COUNT(*) AS openTickets FROM support_tickets WHERE status IN ('open', 'in-progress')",
        [],
        { openTickets: 0 }
      ),
    ]);

    return {
      tickets,
      openTickets: this.toNumber(totalRow.openTickets),
    };
  }

  async approveContent(contentId, contentType) {
    return { contentId, contentType, status: 'approved' };
  }

  async rejectContent(contentId, contentType, reason) {
    return { contentId, contentType, status: 'rejected', reason };
  }

  async getSecurityLogs() {
    const logs = await this.safeSelect(`
      SELECT
        id,
        userId,
        type AS action,
        status,
        createdAt AS timestamp
      FROM notifications
      ORDER BY createdAt DESC
      LIMIT 20
    `);

    return { logs };
  }

  async getUserAnalytics() {
    const [newUsers, activeUsers, totals] = await Promise.all([
      this.safeSingle(
        `
          SELECT COUNT(*) AS newUsersThisMonth
          FROM users
          WHERE YEAR(createdAt) = YEAR(CURRENT_DATE())
            AND MONTH(createdAt) = MONTH(CURRENT_DATE())
        `,
        [],
        { newUsersThisMonth: 0 }
      ),
      this.safeSingle(
        `
          SELECT COUNT(DISTINCT userId) AS activeUsers
          FROM transport_bookings
          WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `,
        [],
        { activeUsers: 0 }
      ),
      this.safeSingle(
        `
          SELECT
            COUNT(DISTINCT userId) AS usersWithBookings,
            COUNT(*) AS totalBookings
          FROM transport_bookings
        `,
        [],
        { usersWithBookings: 0, totalBookings: 0 }
      ),
    ]);

    const usersWithBookings = this.toNumber(totals.usersWithBookings);
    const totalBookings = this.toNumber(totals.totalBookings);

    return {
      activeUsers: this.toNumber(activeUsers.activeUsers),
      newUsersThisMonth: this.toNumber(newUsers.newUsersThisMonth),
      churnRate: 0,
      avgBookingsPerUser:
        usersWithBookings === 0
          ? 0
          : Number((totalBookings / usersWithBookings).toFixed(1)),
    };
  }
}

module.exports = new AdminModel();
