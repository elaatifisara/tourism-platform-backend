const express = require('express');
const router = express.Router();
const controller = require('./support.controller');
const { verifyToken } = require('../../middleware/auth');

router.post('/ticket', verifyToken, controller.createTicket);
router.get('/tickets', verifyToken, controller.getUserTickets);
router.put('/ticket/:ticketId', verifyToken, controller.updateTicketStatus);
router.get('/faq', controller.getFAQ);

module.exports = router;
