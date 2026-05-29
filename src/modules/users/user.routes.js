const express = require('express');
const router = express.Router();
const controller = require('./user.controller');
const { verifyToken } = require('../../middleware/auth');

router.get('/profile', verifyToken, controller.getProfile);
router.put('/profile', verifyToken, controller.updateProfile);
router.get('/bookings', verifyToken, controller.getBookingHistory);
router.get('/invoices', verifyToken, controller.getInvoices);
router.get('/preferences', verifyToken, controller.getPreferences);
router.put('/preferences', verifyToken, controller.updatePreferences);
router.delete('/account', verifyToken, controller.deleteAccount);

module.exports = router;
