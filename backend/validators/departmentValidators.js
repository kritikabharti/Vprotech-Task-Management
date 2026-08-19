const { body } = require('express-validator');

const departmentRules = [
  body('name').trim().notEmpty().withMessage('Department name is required.'),
  body('code').trim().notEmpty().withMessage('Department code is required.'),
];

module.exports = { departmentRules };
