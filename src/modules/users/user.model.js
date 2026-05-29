const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/database');

class User {
  static async safeSelect(query, replacements = [], fallback = []) {
    try {
      return await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT,
      });
    } catch (error) {
      const message = error?.message || '';
      if (
        message.includes("doesn't exist") ||
        message.includes('Unknown table') ||
        message.includes('ER_NO_SUCH_TABLE')
      ) {
        return fallback;
      }

      throw error;
    }
  }

  static async getUserColumns() {
    if (this.userColumns) {
      return this.userColumns;
    }

    const description = await sequelize.getQueryInterface().describeTable('users');
    this.userColumns = Object.keys(description);
    return this.userColumns;
  }

  static hasColumn(columns, columnName) {
    return columns.includes(columnName);
  }

  static async findById(id) {
    const columns = await this.getUserColumns();
    const selectColumns = ['id', 'email', 'firstName', 'lastName', 'role'].filter(
      (column) => this.hasColumn(columns, column)
    );

    if (this.hasColumn(columns, 'preferredLanguage')) {
      selectColumns.push('preferredLanguage');
    }

    if (this.hasColumn(columns, 'emailNotifications')) {
      selectColumns.push('emailNotifications');
    }

    if (this.hasColumn(columns, 'smsNotifications')) {
      selectColumns.push('smsNotifications');
    }

    if (this.hasColumn(columns, 'createdAt')) {
      selectColumns.push('createdAt');
    }

    const whereClauses = ['id = ?'];
    if (this.hasColumn(columns, 'isDeleted')) {
      whereClauses.push('(isDeleted IS NULL OR isDeleted = false)');
    }

    const results = await sequelize.query(
      `
        SELECT ${selectColumns.join(', ')}
        FROM users
        WHERE ${whereClauses.join(' AND ')}
        LIMIT 1
      `,
      {
        replacements: [id],
        type: QueryTypes.SELECT,
      }
    );

    const user = results[0];

    if (!user) {
      return null;
    }

    return {
      preferredLanguage: 'en',
      emailNotifications: true,
      smsNotifications: false,
      ...user,
    };
  }

  static async updateProfile(id, data) {
    const columns = await this.getUserColumns();
    const updates = [];
    const replacements = [];

    if (this.hasColumn(columns, 'firstName')) {
      updates.push('firstName = ?');
      replacements.push(data.firstName);
    }

    if (this.hasColumn(columns, 'lastName')) {
      updates.push('lastName = ?');
      replacements.push(data.lastName);
    }

    if (this.hasColumn(columns, 'preferredLanguage')) {
      updates.push('preferredLanguage = ?');
      replacements.push(data.preferredLanguage || 'en');
    }

    if (this.hasColumn(columns, 'updatedAt')) {
      updates.push('updatedAt = NOW()');
    }

    if (updates.length > 0) {
      replacements.push(id);

      await sequelize.query(
        `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE id = ?
        `,
        {
          replacements,
          type: QueryTypes.UPDATE,
        }
      );
    }

    return this.findById(id);
  }

  static async getBookingHistory(userId) {
    return this.safeSelect(
      `
        SELECT
          tb.id,
          tb.pickupLocation,
          tb.dropoffLocation,
          tb.pickupTime,
          tb.vehicleType,
          tb.status,
          COALESCE(tb.finalPrice, tb.estimatedPrice, 0) AS amount,
          p.status AS paymentStatus,
          tb.createdAt
        FROM transport_bookings tb
        LEFT JOIN payments p ON tb.id = p.bookingId
        WHERE tb.userId = ?
        ORDER BY tb.createdAt DESC
      `,
      [userId],
      []
    );
  }

  static async getInvoices(userId) {
    return this.safeSelect(
      `
        SELECT
          id,
          bookingId,
          amount,
          paymentMethod,
          transactionId,
          status,
          createdAt
        FROM payments
        WHERE userId = ?
        ORDER BY createdAt DESC
      `,
      [userId],
      []
    );
  }

  static async getPreferences(userId) {
    const columns = await this.getUserColumns();
    const selectColumns = [];

    if (this.hasColumn(columns, 'preferredLanguage')) {
      selectColumns.push('preferredLanguage');
    }

    if (this.hasColumn(columns, 'emailNotifications')) {
      selectColumns.push('emailNotifications');
    }

    if (this.hasColumn(columns, 'smsNotifications')) {
      selectColumns.push('smsNotifications');
    }

    if (selectColumns.length === 0) {
      return {
        preferredLanguage: 'en',
        emailNotifications: true,
        smsNotifications: false,
      };
    }

    const results = await sequelize.query(
      `
        SELECT ${selectColumns.join(', ')}
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      {
        replacements: [userId],
        type: QueryTypes.SELECT,
      }
    );

    return {
      preferredLanguage: 'en',
      emailNotifications: true,
      smsNotifications: false,
      ...(results[0] || {}),
    };
  }

  static async updatePreferences(userId, data) {
    const columns = await this.getUserColumns();
    const {
      preferredLanguage = 'en',
      notificationPreferences = {},
    } = data;
    const updates = [];
    const replacements = [];

    if (this.hasColumn(columns, 'preferredLanguage')) {
      updates.push('preferredLanguage = ?');
      replacements.push(preferredLanguage);
    }

    if (this.hasColumn(columns, 'emailNotifications')) {
      updates.push('emailNotifications = ?');
      replacements.push(notificationPreferences.emailNotifications ?? true);
    }

    if (this.hasColumn(columns, 'smsNotifications')) {
      updates.push('smsNotifications = ?');
      replacements.push(notificationPreferences.smsNotifications ?? false);
    }

    if (this.hasColumn(columns, 'updatedAt')) {
      updates.push('updatedAt = NOW()');
    }

    if (updates.length > 0) {
      replacements.push(userId);

      await sequelize.query(
        `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE id = ?
        `,
        {
          replacements,
          type: QueryTypes.UPDATE,
        }
      );
    }

    return this.getPreferences(userId);
  }

  static async softDelete(userId) {
    const columns = await this.getUserColumns();
    const updates = [];

    if (this.hasColumn(columns, 'isDeleted')) {
      updates.push('isDeleted = true');
    }

    if (this.hasColumn(columns, 'deletedAt')) {
      updates.push('deletedAt = NOW()');
    }

    if (this.hasColumn(columns, 'updatedAt')) {
      updates.push('updatedAt = NOW()');
    }

    if (updates.length > 0) {
      await sequelize.query(
        `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE id = ?
        `,
        {
          replacements: [userId],
          type: QueryTypes.UPDATE,
        }
      );
    }

    return { message: 'Account deleted successfully' };
  }
}

module.exports = User;
