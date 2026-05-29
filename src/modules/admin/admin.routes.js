const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');

router.get('/dashboard', adminController.getDashboard);

router.get('/users', adminController.getUsers);

router.get('/bookings', adminController.getBookings);

router.get('/payments', adminController.getPayments);

router.get('/support/tickets', adminController.getSupportTickets);

router.post('/content/approve', adminController.approveContent);
router.post('/content/reject', adminController.rejectContent);

router.get('/security/logs', adminController.getSecurityLogs);

router.get('/analytics/users', adminController.getUserAnalytics);

module.exports = router;
