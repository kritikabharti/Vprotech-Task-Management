const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.use(protect);

router.get('/daily', ctrl.dailyReport);
router.get('/weekly', ctrl.weeklyReport);
router.get('/monthly', ctrl.monthlyReport);
router.get('/custom', ctrl.customReport);
router.get('/export', ctrl.exportReport);

module.exports = router;
