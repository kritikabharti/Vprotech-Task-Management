const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { departmentRules } = require('../validators/departmentValidators');
const ctrl = require('../controllers/departmentController');

router.use(protect);

router.get('/', ctrl.listDepartments); // all roles may view (for dropdowns etc.)
router.get('/:id', ctrl.getDepartment);
router.post('/', authorize('admin'), departmentRules, validate, ctrl.createDepartment);
router.patch('/:id', authorize('admin'), ctrl.updateDepartment);
router.delete('/:id', authorize('admin'), ctrl.deactivateDepartment);

module.exports = router;
