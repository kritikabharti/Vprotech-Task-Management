const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/audit-logs?user=&module=&from=&to=&page=&limit=  (admin only, enforced by route)
const listAuditLogs = asyncHandler(async (req, res) => {
  const { user, module: moduleName, from, to, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (user) filter.user = user;
  if (moduleName) filter.module = moduleName;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).populate('user', 'fullName employeeCode role').sort({ timestamp: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Audit logs fetched', { logs }, { total, page: Number(page), limit: Number(limit) });
});

module.exports = { listAuditLogs };
