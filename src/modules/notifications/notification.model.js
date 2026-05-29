class Notification {
  static async create(data, db) {
    const { userId, type, title, message, status = 'sent' } = data;
    const query = `
      INSERT INTO notifications (userId, type, title, message, status, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    return new Promise((resolve, reject) => {
      db.query(query, [userId, type, title, message, status], (err, result) => {
        if (err) reject(err);
        resolve({ id: result.insertId, ...data });
      });
    });
  }

  static async findByUserId(userId, db) {
    const query = `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`;
    return new Promise((resolve, reject) => {
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  }

  static async markAsRead(notificationId, db) {
    const query = `UPDATE notifications SET status = 'read' WHERE id = ?`;
    return new Promise((resolve, reject) => {
      db.query(query, [notificationId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = Notification;
