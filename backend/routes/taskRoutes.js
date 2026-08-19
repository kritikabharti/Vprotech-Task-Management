const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { morningTaskRules, eveningTaskRules, reviewRules } = require('../validators/taskValidators');
const ctrl = require('../controllers/taskController');

router.use(protect);

// Team leads may also submit their own morning/evening plan, same as an
// employee (self-reporting) - resolveTargetEmployee in the controller
// still enforces this is self-only, never on behalf of someone else.
router.post('/morning', authorize('employee', 'team_lead'), morningTaskRules, validate, ctrl.submitMorningTasks);
router.post('/evening', authorize('employee', 'team_lead'), eveningTaskRules, validate, ctrl.submitEveningTasks);
router.get('/day', ctrl.getDayReport);
router.get('/missing', authorize('admin', 'team_lead'), ctrl.getMissingUpdates);
router.get('/', ctrl.listReports);
router.get('/:id', ctrl.getReportById);
router.patch('/:id/review', authorize('admin', 'team_lead'), reviewRules, validate, ctrl.reviewReport);

module.exports = router;
