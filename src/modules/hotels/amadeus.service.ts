import Amadeus from '@amadeus4dev/amadeus';
import NodeCache from 'node-cache';

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

// Cache pour le token avec TTL de 29 minutes (le token expire à 30 min)
const tokenCache = new NodeCache({ stdTTL: 1740 });

/**
 * Classe pour gérer l'intégration avec l'API Amadeus
 * Gère l'authentification OAuth2 et les appels à l'API
 */
export class AmadeusService {
  /**
   * Recherche d'hôtels par ville et dates
   * @param cityCode Code IATA de la ville (ex: "PAR" pour Paris)
   * @param checkInDate Date d'arrivée (YYYY-MM-DD)
   * @param checkOutDate Date de départ (YYYY-MM-DD)
   * @param adults Nombre d'adultes
   * @param rooms Nombre de chambres
   * @returns Liste des hôtels disponibles
   */
  static async searchHotels(
    cityCode: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number,
    rooms: number,
  ) {
    try {
      const response = await amadeus.shopping.hotelOffers.get({
        cityCode,
        checkInDate,
        checkOutDate,
        adults,
        roomQuantity: rooms,
        limit: 50,
        bestRateOnly: true,
      });

      return response.data;
    } catch (error) {
      console.error('Amadeus Hotel Search Error:', error);
      throw new Error('Erreur lors de la recherche d\'hôtels');
    }
  }

  /**
   * Récupère les détails et les offres pour un hôtel spécifique
   * @param hotelId ID de l'hôtel
   * @param checkInDate Date d'arrivée
   * @param checkOutDate Date de départ
   * @param adults Nombre d'adultes
   * @param rooms Nombre de chambres
   * @returns Détails de l'hôtel avec offres disponibles
   */
  static async getHotelOffers(
    hotelId: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number,
    rooms: number,
  ) {
    try {
      const response = await amadeus.shopping.hotelOffers.get({
        hotelIds: hotelId,
        checkInDate,
        checkOutDate,
        adults,
        roomQuantity: rooms,
      });

      return response.data;
    } catch (error) {
      console.error('Amadeus Hotel Offers Error:', error);
      throw new Error('Erreur lors de la récupération des offres');
    }
  }

  /**
   * Confirme une réservation via Amadeus
   * @param offer Offre d'hôtel à réserver
   * @param guestInfo Informations du client
   * @param contactInfo Contact du client
   * @returns Confirmations de réservation
   */
  static async confirmBooking(
    offer: any,
    guestInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    },
    contactInfo: {
      emailAddress: string;
      phones: Array<{ deviceType: string; countryCallingCode: string; number: string }>;
    },
  ) {
    try {
      const bookingPayload = {
        data: {
          offerId: offer.id,
          guests: [
            {
              id: 1,
              firstName: guestInfo.firstName,
              lastName: guestInfo.lastName,
              contact: contactInfo,
            },
          ],
          payments: [
            {
              id: 1,
              method: 'CREDIT_CARD',
              card: {
                vendorCode: 'VI', // VISA
                cardNumber: process.env.TEST_CARD_NUMBER || '4111111111111111',
                expiryDate: '2027-01',
                holderName: `${guestInfo.firstName} ${guestInfo.lastName}`,
              },
            },
          ],
        },
      };

      const response = await amadeus.booking.hotelBookings.post(bookingPayload);
      return response.data;
    } catch (error) {
      console.error('Amadeus Booking Error:', error);
      throw new Error('Erreur lors de la confirmation de réservation');
    }
  }

  /**
   * Récupère les détails d'une réservation confirmée
   * @param bookingId ID de la réservation Amadeus
   * @returns Détails de la réservation
   */
  static async getBookingDetails(bookingId: string) {
    try {
      const response = await amadeus.booking.hotelBookings.getOne(bookingId);
      return response.data;
    } catch (error) {
      console.error('Amadeus Get Booking Error:', error);
      throw new Error('Erreur lors de la récupération de la réservation');
    }
  }

  /**
   * Valide une offre d'hôtel
   * @param offerId ID de l'offre
   * @returns Offre validée
   */
  static async validateOffer(offerId: string) {
    try {
      const response = await amadeus.shopping.hotelOffers.get({
        offerId,
      });

      return response.data;
    } catch (error) {
      console.error('Amadeus Validate Offer Error:', error);
      throw new Error('Offre invalide ou expirée');
    }
  }

  /**
   * Cache les résultats de recherche avec une clé composée
   * @param key Clé de cache (ex: "CAR_2026-06-01_2026-06-07")
   * @param data Données à mettre en cache
   * @param ttl Durée de vie en secondes (défaut: 600s = 10 min)
   */
  static cacheSearch(key: string, data: any, ttl: number = 600) {
    tokenCache.set(key, data, ttl);
  }

  /**
   * Récupère les résultats en cache
   * @param key Clé de cache
   * @returns Données en cache ou null
   */
  static getCachedSearch(key: string) {
    return tokenCache.get(key) || null;
  }

  /**
   * Vérifie si une entrée est en cache
   * @param key Clé de cache
   * @returns true si en cache
   */
  static isCached(key: string): boolean {
    return tokenCache.has(key);
  }

  /**
   * Génère une clé de cache standardisée
   * @param cityCode Code de la ville
   * @param checkInDate Date d'arrivée
   * @param checkOutDate Date de départ
   * @param adults Nombre d'adultes
   * @param rooms Nombre de chambres
   * @returns Clé de cache
   */
  static generateCacheKey(
    cityCode: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number,
    rooms: number,
  ): string {
    return `hotel_${cityCode}_${checkInDate}_${checkOutDate}_${adults}_${rooms}`;
  }
}

export default AmadeusService;
