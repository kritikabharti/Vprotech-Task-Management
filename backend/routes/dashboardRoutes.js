const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(protect);

router.get('/employee', authorize('employee'), ctrl.employeeDashboard);
router.get('/team-lead', authorize('team_lead'), ctrl.teamLeadDashboard);
router.get('/admin', authorize('admin'), ctrl.adminDashboard);

module.exports = router;
