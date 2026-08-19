const { body } = require('express-validator');

const createUserRules = [
  body('employeeCode').trim().notEmpty().withMessage('Employee ID is required.'),
  body('fullName').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().withMessage('A valid email is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').optional().isIn(['admin', 'team_lead', 'employee']).withMessage('Invalid role.'),
  body('department').optional({ nullable: true }).isMongoId().withMessage('Invalid department id.'),
  body('teamLead').optional({ nullable: true }).isMongoId().withMessage('Invalid team lead id.'),
];

module.exports = { createUserRules };
