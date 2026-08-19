const { body } = require('express-validator');

const morningTaskRules = [
  body('date').notEmpty().withMessage('Date is required.'),
  body('tasks').isArray({ min: 1 }).withMessage('At least one task is required.'),
  body('tasks.*.title').trim().notEmpty().withMessage('Task title is required.'),
  body('tasks.*.estimatedTimeMinutes').isFloat({ min: 0 }).withMessage('estimatedTimeMinutes must be a non-negative number.'),
  body('tasks.*.priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']).withMessage('Invalid priority.'),
];

const eveningTaskRules = [
  body('date').notEmpty().withMessage('Date is required.'),
  body('tasks').isArray({ min: 1 }).withMessage('At least one evening update is required.'),
  body('tasks.*.taskRef').isMongoId().withMessage('Invalid taskRef.'),
  body('tasks.*.status').isIn(['Completed', 'Partially Completed', 'Not Completed']).withMessage('Invalid status.'),
  body('tasks.*.completionPercentage').isFloat({ min: 0, max: 100 }).withMessage('completionPercentage must be 0-100.'),
  body('tasks.*.actualTimeSpentMinutes').isFloat({ min: 0 }).withMessage('actualTimeSpentMinutes must be a non-negative number.'),
];

const reviewRules = [
  body('action').isIn(['approved', 'needs_correction']).withMessage("action must be 'approved' or 'needs_correction'."),
];

module.exports = { morningTaskRules, eveningTaskRules, reviewRules };
