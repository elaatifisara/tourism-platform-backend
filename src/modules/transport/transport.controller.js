const TransportService = require('./transport.service');
const TransportModel = require('./transport.model');

exports.calculateFare = async (req, res) => {
  try {
    const { vehicleType, origin, destination, numBags, pickupTime } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    const result = await TransportService.calculateFare({ vehicleType, origin, destination, numBags, pickupTime });
    res.json({ data: result });
  } catch (error) {
    console.error('calculateFare error', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const userId = req.user?.userId || req.body.userId; // support both authenticated and ad-hoc
    const payload = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { booking, driver } = await TransportService.createBooking(userId, payload);
    res.status(201).json({ booking, driver });
  } catch (error) {
    console.error('createBooking error', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await TransportModel.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking });
  } catch (error) {
    console.error('getBookingById error', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getBookingsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await TransportModel.getBookingsByUser(userId);
    res.json({ bookings });
  } catch (error) {
    console.error('getBookingsByUser error', error);
    res.status(500).json({ error: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const ok = await TransportModel.cancelBooking(id, reason);
    if (!ok) return res.status(404).json({ error: 'Booking not found or already cancelled' });
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    console.error('cancelBooking error', error);
    res.status(500).json({ error: error.message });
  }
};
/**
 * TRANSPORT CONTROLLER - Gestion transport aéroport et calcul tarifaire
 * Responsabilités: Réservations, calcul prix, intégration Google Maps
 */

const Transport = require('./transport.model');
const TransportPricingEngine = require('../../utils/transportPricingEngine');
const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * CALCULER PRIX TRANSPORT
 * Applique tous les paramètres tarifaires
 */
exports.calculateFare = async (req, res) => {
  try {
    const { 
      pickupLocation, 
      dropoffLocation, 
      vehicleType, 
      pickupTime,
      bookingDate,
      passengerCount = 1
    } = req.body;

    if (!pickupLocation || !dropoffLocation || !vehicleType) {
      return res.status(400).json({
        error: 'Localisation départ, arrivée et type véhicule requis'
      });
    }

    // Étape 1: Obtenir distance et durée via Google Maps
    const distanceData = await getDistanceAndDuration(
      pickupLocation,
      dropoffLocation
    );

    if (!distanceData) {
      return res.status(400).json({
        error: 'Route non trouvée. Vérifiez les localisations.'
      });
    }

    const { distance, duration } = distanceData;

    // Étape 2: Calculer prix avec moteur tarifaire
    const fareBreakdown = await TransportPricingEngine.calculateFare({
      vehicleType,
      distance,
      duration,
      pickupTime,
      bookingDate,
      passengerCount
    });

    // Étape 3: Obtenir temps d'arrivée estimé du chauffeur
    const estimatedArrival = await getEstimatedArrival(pickupLocation);

    res.status(200).json({
      fareBreakdown,
      distance: `${(distance / 1000).toFixed(2)} km`,
      duration: `${Math.round(duration / 60)} min`,
      estimatedArrival: `${estimatedArrival} min`,
      totalPrice: fareBreakdown.total,
      currency: 'MAD'
    });
  } catch (error) {
    console.error('Fare calculation error:', error);
    res.status(500).json({ error: 'Erreur calcul tarifaire' });
  }
};

/**
 * Intégration Google Maps - Distance et durée
 */
async function getDistanceAndDuration(pickup, dropoff) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: pickup,
        destinations: dropoff,
        key: GOOGLE_MAPS_API_KEY,
        mode: 'driving'
      }
    });

    if (response.data.status !== 'OK' || response.data.rows[0].elements[0].status === 'ZERO_RESULTS') {
      return null;
    }

    const element = response.data.rows[0].elements[0];
    return {
      distance: element.distance.value, // metres
      duration: element.duration.value // secondes
    };
  } catch (error) {
    console.error('Google Maps error:', error);
    return null;
  }
}

/**
 * Estimer temps d'arrivée du chauffeur
 */
async function getEstimatedArrival(pickupLocation) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: '33.5731,-7.5898', // Centre Casablanca
        destinations: pickupLocation,
        key: GOOGLE_MAPS_API_KEY,
        mode: 'driving'
      }
    });

    if (response.data.status === 'OK') {
      const duration = response.data.rows[0].elements[0].duration.value;
      return Math.round(duration / 60);
    }
    return 15; // Défaut 15 min
  } catch (error) {
    console.error('Estimated arrival error:', error);
    return 15;
  }
}

/**
 * CRÉER RÉSERVATION TRANSPORT
 */
exports.createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      pickupLocation,
      dropoffLocation,
      vehicleType,
      pickupTime,
      bookingDate,
      passengers = 1,
      specialRequirements = '',
      paymentMethod
    } = req.body;

    // Créer réservation en base de données
    const booking = await Transport.create({
      userId,
      pickupLocation,
      dropoffLocation,
      vehicleType,
      pickupTime,
      bookingDate,
      passengers,
      status: 'confirmed',
      specialRequirements,
      paymentMethod
    }, req.db);

    res.status(201).json({
      message: 'Réservation créée',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Erreur création réservation' });
  }
};

/**
 * OBTENIR DÉTAILS RÉSERVATION
 */
exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Transport.findById(bookingId, req.db);
    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Erreur récupération réservation' });
  }
};

/**
 * OBTENIR MES RÉSERVATIONS
 */
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookings = await Transport.findByUserId(userId, req.db);

    res.json({
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Erreur récupération réservations' });
  }
};

/**
 * ANNULER RÉSERVATION
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Transport.findById(bookingId, req.db);
    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Réservation déjà annulée' });
    }

    // Calculer remboursement
    const hoursBeforePickup = (new Date(booking.pickupTime) - new Date()) / (60 * 60 * 1000);
    let refundAmount = 0;

    if (hoursBeforePickup > 24) {
      refundAmount = booking.estimatedPrice;
    } else if (hoursBeforePickup > 2) {
      refundAmount = booking.estimatedPrice * 0.5;
    }

    // Mettre à jour réservation
    await Transport.updateStatus(bookingId, 'cancelled', req.db);

    res.json({
      bookingId,
      status: 'cancelled',
      refundAmount,
      refundStatus: refundAmount > 0 ? 'refund_initiated' : 'no_refund'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Erreur annulation' });
  }
};

/**
 * OBTENIR STATUT RÉSERVATION
 */
exports.getBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Transport.findById(bookingId, req.db);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      bookingId,
      status: booking.status,
      updatedAt: booking.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
