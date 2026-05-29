const Payment = require('./payment.model');
const { processStripePayment, processPayPalPayment, processCMIPayment } = require('../../utils/payment');
const { generateInvoiceHTML, sendEmailViaSendGrid } = require('../../utils/notifications');

exports.processPayment = async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, token } = req.body;
    const userId = req.user.id;

    let result;

    switch (paymentMethod) {
      case 'stripe':
        result = await processStripePayment(amount, token, `Booking #${bookingId}`);
        break;
      case 'paypal':
        result = await processPayPalPayment(amount, token, `Booking #${bookingId}`);
        break;
      case 'cmi':
        result = await processCMIPayment(amount, token, `Booking #${bookingId}`);
        break;
      default:
        return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    const payment = await Payment.create(
      {
        userId,
        bookingId,
        amount,
        paymentMethod,
        transactionId: result.transactionId,
        status: result.status || 'completed',
      },
      req.db
    );

    const invoiceData = {
      invoiceNumber: `INV-${payment.id}`,
      date: new Date().toISOString().split('T')[0],
      items: [{ description: `Booking #${bookingId}`, quantity: 1, unitPrice: amount, total: amount }],
      subtotal: amount,
      tax: 0,
      total: amount,
      customerName: req.user.name,
    };

    const invoiceHTML = generateInvoiceHTML(invoiceData);
    await sendEmailViaSendGrid(req.user.email, 'Invoice for your booking', invoiceHTML);

    res.json({
      success: true,
      payment,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await Payment.findByUserId(userId, req.db);

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const query = `SELECT * FROM payments WHERE id = ?`;

    req.db.query(query, [paymentId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: error.message });
      }

      if (!results.length) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      res.json(results[0]);
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const query = `SELECT * FROM payments WHERE id = ?`;

    req.db.query(query, [paymentId], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: error.message });
      }

      if (!results.length) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      const payment = results[0];

      await Payment.updateStatus(paymentId, 'refunded', req.db);

      const refundMessage = `Your refund of ${payment.amount} has been processed. It will appear in your account within 3-5 business days.`;
      await sendEmailViaSendGrid(req.user.email, 'Refund Confirmation', `<p>${refundMessage}</p>`);

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refundAmount: payment.amount,
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
