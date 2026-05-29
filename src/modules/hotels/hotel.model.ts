import db from '../../config/database';

export interface HotelBooking {
  id: number;
  user_id: number;
  hotel_id: string;
  hotel_name: string;
  city: string;
  check_in: string;
  check_out: string;
  rooms: number;
  adults: number;
  total_price: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  amadeus_booking_ref: string | null;
  payment_status: 'pending' | 'completed' | 'failed';
  payment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class HotelBookingModel {
  /**
   * Crée une nouvelle réservation d'hôtel
   */
  static async create(booking: Omit<HotelBooking, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const query = `
      INSERT INTO hotel_bookings (
        user_id, hotel_id, hotel_name, city, check_in, check_out,
        rooms, adults, total_price, currency, status,
        amadeus_booking_ref, payment_status, payment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result]: any = await db.execute(query, [
      booking.user_id,
      booking.hotel_id,
      booking.hotel_name,
      booking.city,
      booking.check_in,
      booking.check_out,
      booking.rooms,
      booking.adults,
      booking.total_price,
      booking.currency,
      booking.status,
      booking.amadeus_booking_ref || null,
      booking.payment_status,
      booking.payment_id || null,
    ]);

    return result.insertId;
  }

  /**
   * Récupère une réservation par ID
   */
  static async findById(id: number): Promise<HotelBooking | null> {
    const query = 'SELECT * FROM hotel_bookings WHERE id = ?';
    const [rows]: any = await db.execute(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Récupère toutes les réservations d'un utilisateur
   */
  static async findByUserId(userId: number): Promise<HotelBooking[]> {
    const query = `
      SELECT * FROM hotel_bookings
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const [rows]: any = await db.execute(query, [userId]);
    return rows;
  }

  /**
   * Récupère les réservations futures d'un utilisateur
   */
  static async findUpcomingBookings(userId: number): Promise<HotelBooking[]> {
    const query = `
      SELECT * FROM hotel_bookings
      WHERE user_id = ? AND check_in > CURDATE()
      ORDER BY check_in ASC
    `;
    const [rows]: any = await db.execute(query, [userId]);
    return rows;
  }

  /**
   * Met à jour une réservation
   */
  static async update(id: number, updates: Partial<HotelBooking>): Promise<boolean> {
    const allowedFields = [
      'status',
      'amadeus_booking_ref',
      'payment_status',
      'payment_id',
    ];

    const fields = Object.keys(updates).filter((key) => allowedFields.includes(key));
    if (fields.length === 0) return false;

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => (updates as any)[field]);

    const query = `UPDATE hotel_bookings SET ${setClause}, updated_at = NOW() WHERE id = ?`;
    const [result]: any = await db.execute(query, [...values, id]);

    return result.affectedRows > 0;
  }

  /**
   * Annule une réservation
   */
  static async cancel(id: number): Promise<boolean> {
    const query = `
      UPDATE hotel_bookings
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ? AND status IN ('pending', 'confirmed')
    `;
    const [result]: any = await db.execute(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Récupère les statistiques des réservations
   */
  static async getStats(userId: number) {
    const query = `
      SELECT
        COUNT(*) as total_bookings,
        SUM(total_price) as total_spent,
        AVG(total_price) as avg_price,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
      FROM hotel_bookings
      WHERE user_id = ?
    `;
    const [rows]: any = await db.execute(query, [userId]);
    return rows[0];
  }

  /**
   * Vérifie les conflits de réservation (double-booking)
   */
  static async checkConflict(
    hotelId: string,
    checkIn: string,
    checkOut: string,
    rooms: number,
  ): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM hotel_bookings
      WHERE hotel_id = ?
      AND status IN ('confirmed', 'pending')
      AND check_in < ? AND check_out > ?
      AND rooms >= ?
    `;
    const [rows]: any = await db.execute(query, [hotelId, checkOut, checkIn, rooms]);
    return rows[0].count > 0;
  }

  /**
   * Exporte les réservations au format CSV
   */
  static async exportUserBookings(userId: number): Promise<string> {
    const bookings = await this.findByUserId(userId);

    const headers = [
      'ID',
      'Hotel',
      'Ville',
      'Check-in',
      'Check-out',
      'Chambres',
      'Adultes',
      'Prix Total',
      'Devise',
      'Statut',
      'Date de Création',
    ];

    const rows = bookings.map((b) => [
      b.id,
      b.hotel_name,
      b.city,
      b.check_in,
      b.check_out,
      b.rooms,
      b.adults,
      b.total_price,
      b.currency,
      b.status,
      new Date(b.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  }
}

export default HotelBookingModel;
