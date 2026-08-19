const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserRules } = require('../validators/userValidators');
const ctrl = require('../controllers/userController');

router.use(protect);

// Admin + team_lead can manage users within their scope (enforced in controller).
router.post('/', authorize('admin', 'team_lead'), createUserRules, validate, ctrl.createUser);
router.get('/', authorize('admin', 'team_lead'), ctrl.listUsers);
router.get('/team-leads', authorize('admin'), ctrl.listTeamLeads);
// getUser/updateUser stay open to all authenticated roles at the route
// level; assertInScope (in the controller) is what actually enforces
// "admin sees everyone, team_lead sees their team, everyone sees themselves".
router.get('/:id', ctrl.getUser);
router.patch('/:id', ctrl.updateUser);
router.patch('/:id/deactivate', authorize('admin', 'team_lead'), ctrl.deactivateUser);
router.patch('/:id/reactivate', authorize('admin'), ctrl.reactivateUser);
router.patch('/:id/assign', authorize('admin'), ctrl.assignUser);

module.exports = router;
