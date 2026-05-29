import { Router } from 'express';
import { HotelController } from './hotel.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

/**
 * Routes publiques
 */

// Recherche d'hôtels
router.get('/search', HotelController.searchHotels);

// Offres pour un hôtel spécifique
router.get('/:hotelId/offers', HotelController.getHotelOffers);

/**
 * Routes protégées (authentification requise)
 */

// Créer une nouvelle réservation
router.post('/bookings', authMiddleware, HotelController.createBooking);

// Récupérer l'historique des réservations de l'utilisateur
router.get('/bookings/user/:userId', authMiddleware, HotelController.getUserBookings);

// Récupérer les réservations futures
router.get('/bookings/user/:userId/upcoming', authMiddleware, HotelController.getUpcomingBookings);

// Exporter les réservations en CSV
router.get('/bookings/export/csv', authMiddleware, HotelController.exportBookingsCSV);

// Annuler une réservation
router.delete('/bookings/:bookingId', authMiddleware, HotelController.cancelBooking);

export default router;
