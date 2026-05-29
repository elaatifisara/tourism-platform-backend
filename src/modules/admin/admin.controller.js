const adminModel = require('./admin.model');

exports.checkAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

exports.getDashboard = async (req, res) => {
  try {
    const stats = await adminModel.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, role, searchQuery } = req.query;
    const users = await adminModel.getUsers({ page, role, searchQuery });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const { page = 1, status, type } = req.query;
    const bookings = await adminModel.getBookings({ page, status, type });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await adminModel.getPayments();
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSupportTickets = async (req, res) => {
  try {
    const tickets = await adminModel.getSupportTickets();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveContent = async (req, res) => {
  try {
    const { contentId, contentType } = req.body;
    const result = await adminModel.approveContent(contentId, contentType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectContent = async (req, res) => {
  try {
    const { contentId, contentType, reason } = req.body;
    const result = await adminModel.rejectContent(contentId, contentType, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSecurityLogs = async (req, res) => {
  try {
    const logs = await adminModel.getSecurityLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserAnalytics = async (req, res) => {
  try {
    const analytics = await adminModel.getUserAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
