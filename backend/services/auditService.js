const AuditLog = require('../models/AuditLog');

async function logAction({ user, action, module: moduleName, description = '', req = null }) {
  try {
    await AuditLog.create({
      user: user._id,
      role: user.role,
      action,
      module: moduleName,
      description,
      ipAddress: req ? req.ip : '',
    });
  } catch (err) {
    // Audit logging must never break the primary request flow.
    console.error('Audit log write failed:', err.message);
  }
}



module.exports = { logAction };
