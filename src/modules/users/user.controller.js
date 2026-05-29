const User = require('./user.model');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, preferredLanguage } = req.body;

    const user = await User.updateProfile(userId, {
      firstName,
      lastName,
      preferredLanguage,
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingHistory = async (req, res) => {
  try {
    const bookings = await User.getBookingHistory(req.user.id);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await User.getInvoices(req.user.id);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const preferences = await User.getPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const preferences = await User.updatePreferences(req.user.id, req.body);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const result = await User.softDelete(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
