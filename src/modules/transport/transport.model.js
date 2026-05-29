const db = require('../../config/database');

class TransportModel {
  static async getFareConfig(vehicleType) {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM fare_config WHERE vehicle_type = ? LIMIT 1', [vehicleType]);
    connection.release();
    return rows.length ? rows[0] : null;
  }

  static async createBooking(data) {
    const connection = await db.getConnection();
    const query = `
      INSERT INTO transport_bookings
      (user_id, driver_id, vehicle_type, origin_address, origin_lat, origin_lng, dest_address, dest_lat, dest_lng,
       distance_meters, duration_seconds, fare_amount, fare_breakdown, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const params = [
      data.user_id,
      data.driver_id || null,
      data.vehicle_type,
      data.origin_address,
      data.origin_lat,
      data.origin_lng,
      data.dest_address,
      data.dest_lat,
      data.dest_lng,
      data.distance_meters,
      data.duration_seconds,
      data.fare_amount,
      JSON.stringify(data.fare_breakdown),
      data.status || 'confirmed'
    ];

    const [result] = await connection.query(query, params);
    connection.release();
    return { id: result.insertId, ...data };
  }

  static async getBookingById(id) {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM transport_bookings WHERE id = ?', [id]);
    connection.release();
    if (!rows.length) return null;
    const r = rows[0];
    r.fare_breakdown = JSON.parse(r.fare_breakdown || '{}');
    return r;
  }

  static async getBookingsByUser(userId) {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM transport_bookings WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    connection.release();
    return rows.map(r => ({ ...r, fare_breakdown: JSON.parse(r.fare_breakdown || '{}') }));
  }

  static async cancelBooking(id, reason = null) {
    const connection = await db.getConnection();
    const [result] = await connection.query(
      'UPDATE transport_bookings SET status = ?, cancelled_at = NOW(), cancelled_reason = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', reason, id]
    );
    connection.release();
    return result.affectedRows > 0;
  }

  static async findAvailableDriver(vehicleType) {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM drivers WHERE vehicle_type = ? AND available = 1 LIMIT 1', [vehicleType]);
    if (rows.length === 0) {
      connection.release();
      return null;
    }
    const driver = rows[0];
    // mark driver unavailable
    await connection.query('UPDATE drivers SET available = 0 WHERE id = ?', [driver.id]);
    connection.release();
    return driver;
  }
}

module.exports = TransportModel;
class Transport {
  static getTableName() {
    return 'transport_bookings';
  }

  static getColumns() {
    return [
      'id',
      'userId',
      'pickupLocation',
      'dropoffLocation',
      'pickupTime',
      'vehicleType',
      'status',
      'estimatedPrice',
      'finalPrice',
      'driverId',
      'createdAt',
      'updatedAt',
    ];
  }

  static async create(data, db) {
    const { userId, pickupLocation, dropoffLocation, pickupTime, vehicleType, estimatedPrice } = data;

    const query = `
      INSERT INTO transport_bookings 
      (userId, pickupLocation, dropoffLocation, pickupTime, vehicleType, status, estimatedPrice, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
    `;

    return new Promise((resolve, reject) => {
      db.query(query, [userId, pickupLocation, dropoffLocation, pickupTime, vehicleType, estimatedPrice], (err, result) => {
        if (err) reject(err);
        resolve({ id: result.insertId, ...data, status: 'pending' });
      });
    });
  }

  static async findById(id, db) {
    const query = `SELECT * FROM transport_bookings WHERE id = ?`;

    return new Promise((resolve, reject) => {
      db.query(query, [id], (err, results) => {
        if (err) reject(err);
        resolve(results[0]);
      });
    });
  }

  static async findByUserId(userId, db) {
    const query = `SELECT * FROM transport_bookings WHERE userId = ? ORDER BY createdAt DESC`;

    return new Promise((resolve, reject) => {
      db.query(query, [userId], (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  }

  static async updateStatus(id, status, db) {
    const query = `UPDATE transport_bookings SET status = ?, updatedAt = NOW() WHERE id = ?`;

    return new Promise((resolve, reject) => {
      db.query(query, [status, id], (err) => {
        if (err) reject(err);
        resolve({ id, status });
      });
    });
  }
}

module.exports = Transport;
