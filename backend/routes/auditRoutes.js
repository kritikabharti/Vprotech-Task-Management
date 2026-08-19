const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.use(protect, authorize('admin'));
router.get('/', ctrl.listAuditLogs);

module.exports = router;
