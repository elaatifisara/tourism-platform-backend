const express = require('express');
const router = express.Router();
const controller = require('./notification.controller');
const { verifyToken } = require('../../middleware/auth');

router.get('/', verifyToken, controller.getNotifications);
router.put('/:notificationId/read', verifyToken, controller.markAsRead);
router.get('/preferences', verifyToken, controller.getPreferences);
router.put('/preferences', verifyToken, controller.updatePreferences);

module.exports = router;
