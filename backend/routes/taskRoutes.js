// const express = require('express');
// const router = express.Router();
// const { protect, authorize } = require('../middleware/auth');
// const validate = require('../middleware/validate');
// const { morningTaskRules, eveningTaskRules, reviewRules } = require('../validators/taskValidators');
// const ctrl = require('../controllers/taskController');

// router.use(protect);

// // Team leads may also submit their own morning/evening plan, same as an
// // employee (self-reporting) - resolveTargetEmployee in the controller
// // still enforces this is self-only, never on behalf of someone else.
// router.post('/morning', authorize('employee', 'team_lead'), morningTaskRules, validate, ctrl.submitMorningTasks);
// router.post('/evening', authorize('employee', 'team_lead'), eveningTaskRules, validate, ctrl.submitEveningTasks);
// router.get('/day', ctrl.getDayReport);
// router.get('/missing', authorize('admin', 'team_lead'), ctrl.getMissingUpdates);
// router.get('/', ctrl.listReports);
// router.get('/:id', ctrl.getReportById);
// router.patch('/:id/review', authorize('admin', 'team_lead'), reviewRules, validate, ctrl.reviewReport);
// router.post('/:id/tasks/:taskId/reassign', authorize('admin', 'team_lead'), ctrl.reassignTask);

// module.exports = router;


const express = require('express');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const validate = require('../middleware/validate');

const {
  morningTaskRules,
  eveningTaskRules,
  reviewRules,
} = require('../validators/taskValidators');

const ctrl = require('../controllers/taskController');

router.use(protect);

/*
|--------------------------------------------------------------------------
| ASSIGN TASK
|--------------------------------------------------------------------------
| Team Lead:
|   - Can assign tasks only to employees assigned to them
|
| Admin:
|   - Can assign tasks to any active employee
|
| Employee:
|   - Not allowed
|--------------------------------------------------------------------------
*/

router.post(
  '/assign',
  authorize('admin', 'team_lead'),
  ctrl.assignTask
);

/*
|--------------------------------------------------------------------------
| MORNING TASK
|--------------------------------------------------------------------------
*/

router.post(
  '/morning',
  authorize('employee', 'team_lead'),
  morningTaskRules,
  validate,
  ctrl.submitMorningTasks
);

/*
|--------------------------------------------------------------------------
| EVENING TASK
|--------------------------------------------------------------------------
*/

router.post(
  '/evening',
  authorize('employee', 'team_lead'),
  eveningTaskRules,
  validate,
  ctrl.submitEveningTasks
);

/*
|--------------------------------------------------------------------------
| GET DAY REPORT
|--------------------------------------------------------------------------
*/

router.get(
  '/day',
  ctrl.getDayReport
);

/*
|--------------------------------------------------------------------------
| MISSING UPDATES
|--------------------------------------------------------------------------
*/

router.get(
  '/missing',
  authorize('admin', 'team_lead'),
  ctrl.getMissingUpdates
);

/*
|--------------------------------------------------------------------------
| LIST REPORTS
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  ctrl.listReports
);

/*
|--------------------------------------------------------------------------
| GET SINGLE REPORT
|--------------------------------------------------------------------------
*/

router.get(
  '/:id',
  ctrl.getReportById
);

/*
|--------------------------------------------------------------------------
| REVIEW REPORT
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/review',
  authorize('admin', 'team_lead'),
  reviewRules,
  validate,
  ctrl.reviewReport
);

/*
|--------------------------------------------------------------------------
| REASSIGN TASK
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/tasks/:taskId/reassign',
  authorize('admin', 'team_lead'),
  ctrl.reassignTask
);

module.exports = router;