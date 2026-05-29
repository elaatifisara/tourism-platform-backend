const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');
const { verifyToken } = require('../../middleware/auth');

router.post('/process', verifyToken, controller.processPayment);
router.get('/history', verifyToken, controller.getPaymentHistory);
router.get('/:paymentId', verifyToken, controller.getPaymentDetails);
router.post('/:paymentId/refund', verifyToken, controller.refundPayment);

module.exports = router;
