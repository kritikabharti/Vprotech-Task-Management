const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Run after an array of express-validator checks to turn failures into
// a consistent 400 ApiError instead of letting each controller handle it.
const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ApiError(400, 'Validation failed', details));
  }
  next();
};

module.exports = validate;
