import { Router } from 'express';
import { TransportController } from './transport.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

/**
 * Routes publiques (calcul de tarif)
 */
router.post('/calculate-fare', TransportController.calculateFare);
router.get('/drivers/available', TransportController.getAvailableDrivers);
router.get('/routes/stats', TransportController.getRouteStats);
router.get('/price-history', TransportController.getPriceHistory);

/**
 * Routes protégées (authentification requise)
 */

// Créer une réservation
router.post('/bookings', authMiddleware, TransportController.createBooking);

// Récupérer une réservation
router.get('/bookings/:id', authMiddleware, TransportController.getBooking);

// Récupérer l'historique utilisateur
router.get('/bookings/user/:userId', authMiddleware, TransportController.getUserBookings);

// Récupérer les réservations futures
router.get('/bookings/user/:userId/upcoming', authMiddleware, TransportController.getUpcomingBookings);

// Exporter en CSV
router.get('/bookings/export/csv', authMiddleware, TransportController.exportBookingsCSV);

// Annuler une réservation
router.put('/bookings/:id/cancel', authMiddleware, TransportController.cancelBooking);

// Statistiques utilisateur
router.get('/user/stats', authMiddleware, TransportController.getUserStats);

export default router;
