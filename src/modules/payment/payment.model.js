class Payment {
  static getTableName() {
    return 'payments';
  }

  static async create(data, db) {
    const { userId, bookingId, amount, paymentMethod, transactionId, status } = data;

    const query = `
      INSERT INTO payments 
      (userId, bookingId, amount, paymentMethod, transactionId, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    return new Promise((resolve, reject) => {
      db.query(
        query,
        [userId, bookingId, amount, paymentMethod, transactionId, status],
        (err, result) => {
          if (err) reject(err);
          resolve({ id: result.insertId, ...data });
        }
      );
    });
  }

  static async findByTransactionId(transactionId, db) {
    const query = `SELECT * FROM payments WHERE transactionId = ?`;

    return new Promise((resolve, reject) => {
      db.query(query, [transactionId], (err, results) => {
        if (err) reject(err);
        resolve(results[0]);
      });
    });
  }

  static async findByUserId(userId, db) {
    const query = `SELECT * FROM payments WHERE userId = ? ORDER BY createdAt DESC`;

    return new Promise((resolve, reject) => {
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  }

  static async updateStatus(id, status, db) {
    const query = `UPDATE payments SET status = ?, updatedAt = NOW() WHERE id = ?`;

    return new Promise((resolve, reject) => {
      db.query(query, [status, id], (err) => {
        if (err) reject(err);
        resolve({ id, status });
      });
    });
  }
}

module.exports = Payment;
