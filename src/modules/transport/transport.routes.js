const router = require('express').Router();
const transportController = require('./transport.controller');
const { verifyToken } = require('../../middleware/auth');

// Calculate fare (public)
router.post('/calculate-fare', transportController.calculateFare);

// Create booking (requires auth ideally)
router.post('/bookings', verifyToken, transportController.createBooking);

// Get booking by id
router.get('/bookings/:id', verifyToken, transportController.getBookingById);

// Get bookings by user
router.get('/bookings/user/:userId', verifyToken, transportController.getBookingsByUser);

// Cancel booking
router.put('/bookings/:id/cancel', verifyToken, transportController.cancelBooking);

module.exports = router;
