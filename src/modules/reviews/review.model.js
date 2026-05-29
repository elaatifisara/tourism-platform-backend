class Review {
  static async create(data, db) {
    const { userId, placeId, rating, content } = data;
    const query = `
      INSERT INTO reviews (userId, placeId, rating, content, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    return new Promise((resolve, reject) => {
      db.query(query, [userId, placeId, rating, content], (err, result) => {
        if (err) reject(err);
        resolve({ id: result.insertId, ...data });
      });
    });
  }

  static async findByPlaceId(placeId, db) {
    const query = `SELECT * FROM reviews WHERE placeId = ? ORDER BY createdAt DESC`;
    return new Promise((resolve, reject) => {
      db.query(query, [placeId], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  }

  static async getAverageRating(placeId, db) {
    const query = `SELECT AVG(rating) as averageRating, COUNT(*) as totalReviews FROM reviews WHERE placeId = ?`;
    return new Promise((resolve, reject) => {
      db.query(query, [placeId], (err, results) => {
        if (err) reject(err);
        resolve(results[0]);
      });
    });
  }
}

module.exports = Review;
