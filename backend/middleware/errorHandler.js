const ApiError = require('../utils/apiError');

// Centralized error handler. Every route/controller should throw
// ApiError (or let asyncHandler forward rejected promises here) rather
// than sending responses directly on failure.
const errorHandler = (err, req, res, _next) => { // eslint-disable-line no-unused-vars
  let error = err;

  if (!(error instanceof ApiError)) {
    // Translate common non-ApiError failures into safe, useful responses.
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      error = new ApiError(400, 'Validation failed', messages);
    } else if (err.name === 'CastError') {
      error = new ApiError(400, `Invalid value for ${err.path}: ${err.value}`);
    } else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      error = new ApiError(409, `A record with this ${field} already exists.`);
    } else {
      error = new ApiError(500, process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message);
    }
  }

  if (error.statusCode >= 500) {
    console.error(err);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
  });
};

const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

module.exports = { errorHandler, notFound };
