const mongoose = require('mongoose');

// A single record per announcement the admin sends out. Fan-out to
// individual recipients happens via Notification (relatedModel:
// 'Announcement', relatedRecord: this doc's _id), so a Notification list
// item stays lightweight while this collection keeps one clean history
// entry per broadcast for the admin's own review screen.
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    audience: {
      type: String,
      enum: ['all', 'team_lead', 'employee'],
      default: 'all',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
