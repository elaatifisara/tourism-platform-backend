const SupportTicket = require('./support.model');
const { sendEmailViaSendGrid } = require('../../utils/notifications');

exports.createTicket = async (req, res) => {
  try {
    const { subject, description, priority = 'medium' } = req.body;
    const userId = req.user.id;

    const ticket = await SupportTicket.create({ userId, subject, description, priority }, req.db);

    await sendEmailViaSendGrid(
      req.user.email,
      'Support Ticket Created',
      `<p>Your support ticket has been created with ID: ${ticket.id}</p>
       <p>Subject: ${subject}</p>
       <p>We will respond as soon as possible.</p>`
    );

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const tickets = await SupportTicket.findByUserId(userId, req.db);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const result = await SupportTicket.updateStatus(ticketId, status, req.db);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFAQ = async (req, res) => {
  try {
    const faqs = [
      { id: 1, question: 'How do I book a transport?', answer: 'Use the transport booking page and follow the steps.' },
      { id: 2, question: 'What payment methods are accepted?', answer: 'We accept Stripe, PayPal, and local CMI payments.' },
      { id: 3, question: 'Can I cancel my booking?', answer: 'Yes, you can cancel with a full refund if done 24 hours before.' },
    ];

    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
