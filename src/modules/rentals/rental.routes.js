const express = require('express');
const router = express.Router();
const rentalController = require('./rental.controller');

router.get('/vehicles', rentalController.getAvailableVehicles);

router.post('/booking', rentalController.createRental);

router.get('/booking/:rentalId', rentalController.getRental);

router.put('/booking/:rentalId/cancel', rentalController.cancelRental);

router.get('/bookings', rentalController.getUserRentals);

module.exports = router;
