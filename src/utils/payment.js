const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const processStripePayment = async (amount, token, description) => {
  try {
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100),
      currency: 'mad',
      source: token,
      description,
    });

    return {
      success: true,
      transactionId: charge.id,
      status: charge.status,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

const processPayPalPayment = async (amount, paymentToken, description) => {
  return {
    success: true,
    transactionId: `PPL-${Date.now()}`,
    status: 'completed',
  };
};

const processCMIPayment = async (amount, cardData, description) => {
  return {
    success: true,
    transactionId: `CMI-${Date.now()}`,
    status: 'completed',
  };
};

module.exports = {
  processStripePayment,
  processPayPalPayment,
  processCMIPayment,
};
