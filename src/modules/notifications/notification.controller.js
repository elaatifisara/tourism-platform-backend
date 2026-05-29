const Notification = require('./notification.model');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.findByUserId(userId, req.db);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.markAsRead(notificationId, req.db);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `SELECT emailNotifications, smsNotifications FROM users WHERE id = ?`;

    req.db.query(query, [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: error.message });
      }

      res.json(results[0] || { emailNotifications: true, smsNotifications: false });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emailNotifications, smsNotifications } = req.body;

    const query = `
      UPDATE users SET emailNotifications = ?, smsNotifications = ? WHERE id = ?
    `;

    req.db.query(query, [emailNotifications, smsNotifications, userId], (err) => {
      if (err) {
        return res.status(500).json({ message: error.message });
      }

      res.json({
        userId,
        emailNotifications,
        smsNotifications,
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
