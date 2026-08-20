const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.use(protect);

// Static/admin-only routes registered before the '/:id/read' param route
// so 'announcements' and 'unread-count' are never swallowed by :id.
router.get('/unread-count', ctrl.getUnreadCount);
router.post('/announcement', authorize('admin'), ctrl.createAnnouncement);
router.get('/announcements', authorize('admin'), ctrl.listAnnouncements);

router.get('/', ctrl.listMyNotifications);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);

module.exports = router;
