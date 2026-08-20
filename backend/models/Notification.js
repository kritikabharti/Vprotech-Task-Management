const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'morning_reminder',
        'evening_reminder',
        'task_approved',
        'task_returned',
        'morning_submitted',
        'evening_submitted',
        'missing_update',
        'report_info',
        'announcement',
      ],
      required: true,
    },
    relatedRecord: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedModel: { type: String, enum: ['DailyTaskReport', 'User', 'Announcement', null], default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
