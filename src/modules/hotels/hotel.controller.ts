import { Request, Response } from 'express';
import AmadeusService from './amadeus.service';
import HotelBookingModel from './hotel.model';
import { sendBookingEmail } from '../../utils/notifications';
import { generateInvoicePDF } from '../../utils/invoiceGenerator';
import fs from 'fs/promises';
import path from 'path';

export class HotelController {
  /**
   * Recherche d'hôtels
   * GET /api/hotels/search?cityCode=CAR&checkIn=2026-06-01&checkOut=2026-06-07&adults=2&rooms=1
   */
  static async searchHotels(req: Request, res: Response) {
    try {
      const { cityCode, checkIn, checkOut, adults = 2, rooms = 1 } = req.query;

      // Validation des paramètres
      if (!cityCode || !checkIn || !checkOut) {
        return res.status(400).json({
          error: 'Paramètres manquants : cityCode, checkIn, checkOut requis',
        });
      }

      // Valider les dates
      const checkInDate = new Date(checkIn as string);
      const checkOutDate = new Date(checkOut as string);
      if (checkInDate >= checkOutDate) {
        return res.status(400).json({
          error: 'La date de départ doit être après la date d\'arrivée',
        });
      }

      // Générer la clé de cache
      const cacheKey = AmadeusService.generateCacheKey(
        cityCode as string,
        checkIn as string,
        checkOut as string,
        parseInt(adults as string) || 2,
        parseInt(rooms as string) || 1,
      );

      // Vérifier le cache
      if (AmadeusService.isCached(cacheKey)) {
        const cachedData = AmadeusService.getCachedSearch(cacheKey);
        return res.json({
          data: cachedData,
          cached: true,
          message: 'Résultats en cache',
        });
      }

      // Appeler l'API Amadeus
      const hotels = await AmadeusService.searchHotels(
        cityCode as string,
        checkIn as string,
        checkOut as string,
        parseInt(adults as string) || 2,
        parseInt(rooms as string) || 1,
      );

      // Mettre en cache
      AmadeusService.cacheSearch(cacheKey, hotels);

      res.json({
        data: hotels,
        cached: false,
        total: hotels.length,
      });
    } catch (error) {
      console.error('Search Hotels Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la recherche d\'hôtels',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Récupère les offres détaillées pour un hôtel
   * GET /api/hotels/:hotelId/offers?checkIn=2026-06-01&checkOut=2026-06-07&adults=2&rooms=1
   */
  static async getHotelOffers(req: Request, res: Response) {
    try {
      const { hotelId } = req.params;
      const { checkIn, checkOut, adults = 2, rooms = 1 } = req.query;

      if (!checkIn || !checkOut) {
        return res.status(400).json({
          error: 'Paramètres manquants : checkIn et checkOut requis',
        });
      }

      const offers = await AmadeusService.getHotelOffers(
        hotelId,
        checkIn as string,
        checkOut as string,
        parseInt(adults as string) || 2,
        parseInt(rooms as string) || 1,
      );

      res.json({
        data: offers,
        total: offers.length,
      });
    } catch (error) {
      console.error('Get Hotel Offers Error:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des offres',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  /**
   * Crée une réservation d'hôtel
   * POST /api/hotels/bookings
   */
  static async createBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const {
        offer,
        guestInfo,
        contactInfo,
        roomDetails,
      } = req.body;

      if (!offer || !guestInfo || !contactInfo) {
        return res.status(400).json({
          error: 'Données manquantes pour la réservation',
        });
      }

      // Valider l'offre auprès d'Amadeus
      const validatedOffer = await AmadeusService.validateOffer(offer.id);
      if (!validatedOffer) {
        return res.status(400).json({
          error: 'Offre invalide ou expirée',
        });
      }

      // Créer la réservation dans la BD
      const booking = await HotelBookingModel.create({
        user_id: userId,
        hotel_id: offer.hotel.id,
        hotel_name: offer.hotel.name,
        city: offer.hotel.cityCode,
        check_in: validatedOffer.checkInDate,
        check_out: validatedOffer.checkOutDate,
        rooms: roomDetails?.roomQuantity || 1,
        adults: guestInfo.numberOfAdults || 1,
        total_price: parseFloat(validatedOffer.priceTotal),
        currency: validatedOffer.currency,
        status: 'pending',
        amadeus_booking_ref: null,
        payment_status: 'pending',
        payment_id: null,
      });

      // Confirmer la réservation sur Amadeus
      let amadeusConfirmation;
      try {
        amadeusConfirmation = await AmadeusService.confirmBooking(
          validatedOffer,
          guestInfo,
          contactInfo,
        );

        // Mettre à jour le statut
        await HotelBookingModel.update(booking, {
          status: 'confirmed',
          amadeus_booking_ref: amadeusConfirmation.associatedRecords[0].reference,
          payment_status: 'completed',
        });
      } catch (amadeusError) {
        console.error('Amadeus Booking Error:', amadeusError);
        // La réservation est créée mais pas confirmée
      }

      // Envoyer un email de confirmation
      await sendBookingEmail({
        email: contactInfo.emailAddress,
        firstName: guestInfo.firstName,
        hotelName: offer.hotel.name,
        checkIn: validatedOffer.checkInDate,
        checkOut: validatedOffer.checkOutDate,
        totalPrice: validatedOffer.priceTotal,
        currency: validatedOffer.currency,
        bookingReference: amadeusConfirmation?.associatedRecords?.[0]?.reference || `BOOK-${booking}`,
      });

      // Générer une facture PDF
      const invoicePath = await generateInvoicePDF({
        bookingId: booking,
        hotelName: offer.hotel.name,
        guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
        checkIn: validatedOffer.checkInDate,
        checkOut: validatedOffer.checkOutDate,
        totalPrice: validatedOffer.priceTotal,
        currency: validatedOffer.currency,
      });

      res.status(201).json({
        id: booking,
        status: 'confirmed',
        amadeus_reference: amadeusConfirmation?.associatedRecords?.[0]?.reference,
        invoice_url: `/invoices/hotels/${booking}.pdf`,
        message: 'Réservation confirmée avec succès',
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
   * Récupère l'historique des réservations d'un utilisateur
   * GET /api/hotels/bookings/user/:userId
   */
  static async getUserBookings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || parseInt(req.params.userId);

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      // Vérifier que l'utilisateur ne peut voir que ses réservations
      if (userId !== (req as any).user?.id && (req as any).user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const bookings = await HotelBookingModel.findByUserId(userId);
      const stats = await HotelBookingModel.getStats(userId);

      res.json({
        bookings,
        stats,
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
   * Récupère les réservations futures d'un utilisateur
   * GET /api/hotels/bookings/user/:userId/upcoming
   */
  static async getUpcomingBookings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const bookings = await HotelBookingModel.findUpcomingBookings(userId);

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
   * DELETE /api/hotels/bookings/:bookingId
   */
  static async cancelBooking(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { bookingId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      // Vérifier que la réservation appartient à l'utilisateur
      const booking = await HotelBookingModel.findById(parseInt(bookingId));
      if (!booking || booking.user_id !== userId) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      // Vérifier que la réservation peut être annulée
      if (booking.status === 'cancelled') {
        return res.status(400).json({ error: 'Réservation déjà annulée' });
      }

      if (booking.status === 'completed') {
        return res.status(400).json({ error: 'Impossible d\'annuler une réservation terminée' });
      }

      // Annuler la réservation
      const success = await HotelBookingModel.cancel(parseInt(bookingId));

      if (!success) {
        return res.status(500).json({ error: 'Erreur lors de l\'annulation' });
      }

      res.json({
        message: 'Réservation annulée avec succès',
        bookingId: parseInt(bookingId),
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
   * Exporte les réservations au format CSV
   * GET /api/hotels/bookings/export/csv
   */
  static async exportBookingsCSV(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise' });
      }

      const csv = await HotelBookingModel.exportUserBookings(userId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hotel_bookings.csv"');
      res.send(csv);
    } catch (error) {
      console.error('Export CSV Error:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'export CSV',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }
}

export default HotelController;
