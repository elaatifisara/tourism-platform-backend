import db from '../../config/database';

interface TransportBooking {
  id?: number;
  user_id: number;
  driver_id?: number;
  vehicle_type: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  scheduled_time: Date;
  passengers: number;
  luggage: number;
  total_fare: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed';
  payment_id?: string;
  booking_date?: Date;
  assigned_at?: Date;
  start_time?: Date;
  end_time?: Date;
  completed_at?: Date;
  cancellation_reason?: string;
  cancelled_at?: Date;
  notes?: string;
  rating?: number;
  review?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class TransportModel {
  /**
   * Crée une nouvelle réservation
   */
  static create(booking: TransportBooking): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO transport_bookings (
          user_id,
          vehicle_type,
          pickup_address,
          pickup_lat,
          pickup_lng,
          destination_address,
          destination_lat,
          destination_lng,
          scheduled_time,
          passengers,
          luggage,
          total_fare,
          status,
          payment_status,
          booking_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const values = [
        booking.user_id,
        booking.vehicle_type,
        booking.pickup_address,
        booking.pickup_lat,
        booking.pickup_lng,
        booking.destination_address,
        booking.destination_lat,
        booking.destination_lng,
        booking.scheduled_time,
        booking.passengers,
        booking.luggage,
        booking.total_fare,
        booking.status,
        booking.payment_status,
      ];

      db.query(query, values, (err, results: any) => {
        if (err) {
          console.error('Create Booking Error:', err);
          reject(err);
        } else {
          resolve(results.insertId);
        }
      });
    });
  }

  /**
   * Récupère une réservation par ID
   */
  static findById(id: number): Promise<TransportBooking | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM transport_bookings 
        WHERE id = ?
      `;

      db.query(query, [id], (err, results: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(results?.[0] || null);
        }
      });
    });
  }

  /**
   * Récupère toutes les réservations d'un utilisateur
   */
  static findByUserId(userId: number): Promise<TransportBooking[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM transport_bookings 
        WHERE user_id = ?
        ORDER BY booking_date DESC
        LIMIT 50
      `;

      db.query(query, [userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results as TransportBooking[]);
        }
      });
    });
  }

  /**
   * Récupère les réservations futures d'un utilisateur
   */
  static findUpcomingByUserId(userId: number): Promise<TransportBooking[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM transport_bookings 
        WHERE user_id = ? 
          AND scheduled_time > NOW()
          AND status != 'cancelled'
        ORDER BY scheduled_time ASC
      `;

      db.query(query, [userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results as TransportBooking[]);
        }
      });
    });
  }

  /**
   * Récupère les réservations par statut
   */
  static findByStatus(status: string): Promise<TransportBooking[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM transport_bookings 
        WHERE status = ?
        ORDER BY booking_date DESC
        LIMIT 100
      `;

      db.query(query, [status], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results as TransportBooking[]);
        }
      });
    });
  }

  /**
   * Met à jour une réservation
   */
  static update(id: number, updates: Partial<TransportBooking>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const allowedFields = [
        'driver_id',
        'status',
        'payment_status',
        'payment_id',
        'assigned_at',
        'start_time',
        'end_time',
        'completed_at',
        'cancellation_reason',
        'cancelled_at',
        'notes',
        'rating',
        'review',
      ];

      const setClause: string[] = [];
      const values: any[] = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (setClause.length === 0) {
        return resolve(false);
      }

      values.push(id);

      const query = `
        UPDATE transport_bookings 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;

      db.query(query, values, (err, results: any) => {
        if (err) {
          console.error('Update Booking Error:', err);
          reject(err);
        } else {
          resolve(results.affectedRows > 0);
        }
      });
    });
  }

  /**
   * Supprime une réservation (soft delete - marque comme annulée)
   */
  static delete(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE transport_bookings 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ?
      `;

      db.query(query, [id], (err, results: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.affectedRows > 0);
        }
      });
    });
  }

  /**
   * Récupère les réservations d'un chauffeur
   */
  static findByDriverId(driverId: number): Promise<TransportBooking[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM transport_bookings 
        WHERE driver_id = ?
        ORDER BY scheduled_time DESC
        LIMIT 50
      `;

      db.query(query, [driverId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results as TransportBooking[]);
        }
      });
    });
  }

  /**
   * Vérifie les conflits de réservation (même chauffeur, temps chevauché)
   */
  static checkDriverConflict(
    driverId: number,
    scheduledTime: Date,
    estimatedDuration: number,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const startTime = scheduledTime;
      const endTime = new Date(scheduledTime.getTime() + estimatedDuration * 60000);

      const query = `
        SELECT COUNT(*) as conflicts FROM transport_bookings 
        WHERE driver_id = ? 
          AND status IN ('assigned', 'in_progress')
          AND (
            (scheduled_time <= ? AND DATE_ADD(scheduled_time, INTERVAL estimated_duration MINUTE) > ?)
            OR (scheduled_time >= ? AND scheduled_time < ?)
          )
      `;

      db.query(
        query,
        [driverId, endTime, startTime, startTime, endTime],
        (err, results: any) => {
          if (err) {
            reject(err);
          } else {
            resolve((results?.[0]?.conflicts || 0) > 0);
          }
        },
      );
    });
  }

  /**
   * Exporte l'historique des réservations en CSV
   */
  static exportUserBookings(userId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          id,
          vehicle_type,
          pickup_address,
          destination_address,
          scheduled_time,
          passengers,
          total_fare,
          status,
          booking_date
        FROM transport_bookings
        WHERE user_id = ?
        ORDER BY booking_date DESC
      `;

      db.query(query, [userId], (err, results: any) => {
        if (err) {
          reject(err);
        } else {
          // Convertir en CSV
          const headers = [
            'ID',
            'Type de véhicule',
            'Départ',
            'Destination',
            'Horaire prévu',
            'Passagers',
            'Tarif',
            'Statut',
            'Date réservation',
          ];

          const rows = results.map((r: any) => [
            r.id,
            r.vehicle_type,
            r.pickup_address,
            r.destination_address,
            r.scheduled_time,
            r.passengers,
            r.total_fare,
            r.status,
            r.booking_date,
          ]);

          const csv =
            headers.join(',') +
            '\n' +
            rows.map((r: any) => r.map((v: any) => `"${v}"`).join(',')).join('\n');

          resolve(csv);
        }
      });
    });
  }

  /**
   * Obtient les statistiques d'une route
   */
  static getRouteStats(
    pickupAddress: string,
    destinationAddress: string,
    days: number = 30,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_bookings,
          AVG(total_fare) as avg_fare,
          MIN(total_fare) as min_fare,
          MAX(total_fare) as max_fare,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM transport_bookings
        WHERE pickup_address = ? 
          AND destination_address = ?
          AND booking_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `;

      db.query(
        query,
        [pickupAddress, destinationAddress, days],
        (err, results: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(results?.[0] || {});
          }
        },
      );
    });
  }
}

export default TransportModel;
