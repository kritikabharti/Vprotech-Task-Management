const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
