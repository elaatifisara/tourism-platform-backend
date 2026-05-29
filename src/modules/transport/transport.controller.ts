import { Request, Response } from 'express';
import TransportService from './transport.service';
import TransportModel from './transport.model';
import GoogleMapsService from './google-maps.service';

export class TransportController {
  /**
   * Calcule le tarif de transport
   * POST /api/transport/calculate-fare
   */
  static async calculateFare(req: Request, res: Response) {
    try {
      const {
        vehicleType,
        origin,
        destination,
        passengers = 1,
        luggage = 0,
        bookingDateTime,
      } = req.body;

      // Validation
      if (!vehicleType || !origin || !destination) {
        return res.status(400).json({
          error: 'Paramètres manquants : vehicleType, origin, destination requis',
        });
      }

      if (!['taxi', 'vtc', 'chauffeur'].includes(vehicleType)) {
        return res.status(400).json({
          error: 'Type de véhicule invalide : taxi, vtc ou chauffeur',
        });
      }

      // Calculer le tarif
      const fareBreakdown = await TransportService.calculateFare({
        vehicleType: vehicleType as any,
        origin,
        destination,
        passengers,
        luggage,
        bookingDateTime: bookingDateTime ? new Date(bookingDateTime) : undefined,
      });

      res.json({
        data: fareBreakdown,
        message: 'Tarif calculé avec succès',
      });
    } catch (error) {
      console.error('Calculate Fare Error:', error);
      res.status(500).json({
        error: 'Erreur lors du calcul du tarif',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Crée une réservation de transport
   * POST /api/transport/bookings
   */
  static async createBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const {
        vehicleType,
        pickupAddress,
        pickupLat,
        pickupLng,
        destinationAddress,
        destinationLat,
        destinationLng,
        scheduledTime,
        passengers,
        luggage,
        totalFare,
      } = req.body;

      // Validation
      if (
        !vehicleType ||
        !pickupAddress ||
        !destinationAddress ||
        !scheduledTime ||
        totalFare === undefined
      ) {
        return res.status(400).json({
          error: 'Données manquantes pour la réservation',
        });
      }

      // Vérifier que le tarif est raisonnable (recalculer côté serveur)
      const calculatedFare = await TransportService.calculateFare({
        vehicleType: vehicleType as any,
        origin: { lat: pickupLat, lng: pickupLng },
        destination: { lat: destinationLat, lng: destinationLng },
        passengers,
        luggage,
        bookingDateTime: new Date(scheduledTime),
      });

      // Vérifier que le tarif correspond (tolérance de 5%)
      const tolerance = calculatedFare.total * 0.05;
      if (Math.abs(parseFloat(totalFare as string) - calculatedFare.total) > tolerance) {
        return res.status(400).json({
          error: 'Le tarif fourni ne correspond pas au calcul serveur',
          expectedFare: calculatedFare.total,
          providedFare: totalFare,
        });
      }

      // Créer la réservation
      const bookingId = await TransportModel.create({
        user_id: userId,
        vehicle_type: vehicleType,
        pickup_address: pickupAddress,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        destination_address: destinationAddress,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        scheduled_time: new Date(scheduledTime),
        passengers,
        luggage,
        total_fare: calculatedFare.total,
        status: 'pending',
        payment_status: 'pending',
      });

      // Récupérer les chauffeurs disponibles
      const availableDrivers = await TransportService.getAvailableDrivers(
        pickupLat,
        pickupLng,
        new Date(scheduledTime),
        vehicleType,
      );

      // Assigner automatiquement le premier chauffeur disponible
      if (availableDrivers.length > 0) {
        const assignedDriver = availableDrivers[0];
        await TransportService.assignDriver(bookingId, assignedDriver.id);
      }

      res.status(201).json({
        id: bookingId,
        status: 'pending',
        estimatedFare: calculatedFare.total,
        pickupTime: scheduledTime,
        driverAssigned: availableDrivers.length > 0,
        message: 'Réservation créée avec succès',
      });
    } catch (error) {
      console.error('Create Booking Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la création de la réservation',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère les détails d'une réservation
   * GET /api/transport/bookings/:id
   */
  static async getBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const booking = await TransportModel.findById(parseInt(id));

      if (!booking) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      // Vérifier que la réservation appartient à l'utilisateur ou que c'est un admin
      if (booking.user_id !== userId && (req as any).user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      res.json({
        data: booking,
      });
    } catch (error) {
      console.error('Get Booking Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de la réservation',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère l'historique des réservations de l'utilisateur
   * GET /api/transport/bookings/user/:userId
   */
  static async getUserBookings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { status, limit = 50 } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      let bookings;

      if (status) {
        bookings = await TransportModel.findByStatus(status as string);
        // Filtrer par utilisateur
        bookings = bookings.filter((b) => b.user_id === userId);
      } else {
        bookings = await TransportModel.findByUserId(userId);
      }

      // Limiter les résultats
      bookings = bookings.slice(0, parseInt(limit as string));

      res.json({
        bookings,
        total: bookings.length,
      });
    } catch (error) {
      console.error('Get User Bookings Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des réservations',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère les réservations futures de l'utilisateur
   * GET /api/transport/bookings/user/:userId/upcoming
   */
  static async getUpcomingBookings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const bookings = await TransportModel.findUpcomingByUserId(userId);

      res.json({
        bookings,
        total: bookings.length,
      });
    } catch (error) {
      console.error('Get Upcoming Bookings Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des réservations futures',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Annule une réservation
   * PUT /api/transport/bookings/:id/cancel
   */
  static async cancelBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      // Récupérer la réservation
      const booking = await TransportModel.findById(parseInt(id));

      if (!booking) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      // Vérifier que la réservation appartient à l'utilisateur
      if (booking.user_id !== userId) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Annuler
      const success = await TransportService.cancelBooking(parseInt(id), reason);

      if (!success) {
        return res.status(500).json({ error: 'Erreur lors de l\'annulation' });
      }

      res.json({
        message: 'Réservation annulée avec succès',
        bookingId: parseInt(id),
      });
    } catch (error) {
      console.error('Cancel Booking Error:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'annulation de la réservation',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère les chauffeurs disponibles
   * GET /api/transport/drivers/available?lat=33.5&lng=-7.5&vehicleType=taxi&date=2026-06-01T10:00:00
   */
  static async getAvailableDrivers(req: Request, res: Response) {
    try {
      const { lat, lng, vehicleType, date } = req.query;

      if (!lat || !lng || !vehicleType || !date) {
        return res.status(400).json({
          error: 'Paramètres manquants : lat, lng, vehicleType, date requis',
        });
      }

      const drivers = await TransportService.getAvailableDrivers(
        parseFloat(lat as string),
        parseFloat(lng as string),
        new Date(date as string),
        vehicleType as string,
      );

      res.json({
        drivers,
        total: drivers.length,
      });
    } catch (error) {
      console.error('Get Available Drivers Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des chauffeurs',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère les statistiques utilisateur
   * GET /api/transport/user/stats
   */
  static async getUserStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const stats = await TransportService.getUserStats(userId);

      res.json({
        stats,
      });
    } catch (error) {
      console.error('Get User Stats Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Exporte l'historique en CSV
   * GET /api/transport/bookings/export/csv
   */
  static async exportBookingsCSV(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const csv = await TransportModel.exportUserBookings(userId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transport_bookings.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export CSV Error:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'export CSV',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère les statistiques d'une route
   * GET /api/transport/routes/stats?pickup=Casablanca&destination=Marrakech
   */
  static async getRouteStats(req: Request, res: Response) {
    try {
      const { pickup, destination, days = '30' } = req.query;

      if (!pickup || !destination) {
        return res.status(400).json({
          error: 'Paramètres manquants : pickup et destination requis',
        });
      }

      const stats = await TransportModel.getRouteStats(
        pickup as string,
        destination as string,
        parseInt(days as string),
      );

      res.json({
        stats,
      });
    } catch (error) {
      console.error('Get Route Stats Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère l'historique de prix
   * GET /api/transport/price-history?pickup=Casablanca&destination=Marrakech
   */
  static async getPriceHistory(req: Request, res: Response) {
    try {
      const { pickup, destination, days = '7' } = req.query;

      if (!pickup || !destination) {
        return res.status(400).json({
          error: 'Paramètres manquants : pickup et destination requis',
        });
      }

      const history = await TransportService.getPriceHistory(
        pickup as string,
        destination as string,
        parseInt(days as string),
      );

      res.json({
        history,
        total: history.length,
      });
    } catch (error) {
      console.error('Get Price History Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'historique',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }
}

export default TransportController;
