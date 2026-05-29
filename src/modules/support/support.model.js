class SupportTicket {
  static async create(data, db) {
    const { userId, subject, description, priority = 'medium' } = data;
    const query = `
      INSERT INTO support_tickets (userId, subject, description, priority, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'open', NOW(), NOW())
    `;
    return new Promise((resolve, reject) => {
      db.query(query, [userId, subject, description, priority], (err, result) => {
        if (err) reject(err);
        resolve({ id: result.insertId, status: 'open', ...data });
      });
    });
  }

  static async findByUserId(userId, db) {
    const query = `SELECT * FROM support_tickets WHERE userId = ? ORDER BY createdAt DESC`;
    return new Promise((resolve, reject) => {
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  }

  static async updateStatus(id, status, db) {
    const query = `UPDATE support_tickets SET status = ?, updatedAt = NOW() WHERE id = ?`;
    return new Promise((resolve, reject) => {
      db.query(query, [status, id], (err) => {
        if (err) reject(err);
        resolve({ id, status });
      });
    });
  }
}

module.exports = SupportTicket;
