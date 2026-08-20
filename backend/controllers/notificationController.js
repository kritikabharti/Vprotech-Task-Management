const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { notifyMany } = require('../services/notificationService');
const { logAction } = require('../services/auditService');

// GET /api/notifications?isRead=&page=&limit=
const listMyNotifications = asyncHandler(async (req, res) => {
  const { isRead, page = 1, limit = 20 } = req.query;
  const filter = { recipient: req.user._id };
  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  sendSuccess(res, 200, 'Notifications fetched', { notifications, unreadCount }, { total, page: Number(page), limit: Number(limit) });
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw new ApiError(404, 'Notification not found.');
  if (String(notification.recipient) !== String(req.user._id)) {
    throw new ApiError(403, 'You cannot modify another user\u2019s notification.');
  }
  notification.isRead = true;
  await notification.save();
  sendSuccess(res, 200, 'Notification marked as read', { notification });
});

// PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  sendSuccess(res, 200, 'All notifications marked as read');
});

// GET /api/notifications/unread-count - lightweight poll target for the topbar bell badge.
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  sendSuccess(res, 200, 'Unread count fetched', { unreadCount });
});

// POST /api/notifications/announcement (admin only)
// Broadcasts a message to every active Team Lead and/or Employee, saving
// one Announcement record for history and a Notification row per recipient.
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, audience = 'all' } = req.body;
  if (!title || !title.trim()) throw new ApiError(400, 'Title is required.');
  if (!message || !message.trim()) throw new ApiError(400, 'Message is required.');
  if (!['all', 'team_lead', 'employee'].includes(audience)) {
    throw new ApiError(400, 'Audience must be all, team_lead, or employee.');
  }

  const roleFilter = audience === 'all' ? { role: { $in: ['team_lead', 'employee'] } } : { role: audience };
  const recipients = await User.find({ ...roleFilter, status: 'active' }).select('_id');

  const announcement = await Announcement.create({
    title: title.trim(),
    message: message.trim(),
    audience,
    createdBy: req.user._id,
    recipientCount: recipients.length,
  });

  await notifyMany(recipients.map((r) => r._id), {
    message: `${title.trim()}: ${message.trim()}`,
    type: 'announcement',
    relatedRecord: announcement._id,
    relatedModel: 'Announcement',
  });

  await logAction({
    user: req.user,
    action: 'announcement_created',
    module: 'Notification',
    description: `"${announcement.title}" to ${audience} (${recipients.length} recipients)`,
    req,
  });

  sendSuccess(res, 201, 'Announcement sent', { announcement });
});

// GET /api/notifications/announcements (admin only) - broadcast history.
const listAnnouncements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [announcements, total] = await Promise.all([
    Announcement.find()
      .populate('createdBy', 'fullName employeeCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Announcement.countDocuments(),
  ]);
  sendSuccess(res, 200, 'Announcements fetched', { announcements }, { total, page: Number(page), limit: Number(limit) });
});

module.exports = {
  listMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  createAnnouncement,
  listAnnouncements,
};
