const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

// Verifies the JWT and attaches the fresh, authoritative user document
// to req.user. Every downstream handler must read identity/role from
// req.user - NEVER from req.body/req.params/req.query.
const protect = asyncHandler(async (req, _res, next) => {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authenticated. Please log in.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'User belonging to this token no longer exists.');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'This account has been deactivated.');
  }

  // If the password was changed after the token was issued, invalidate it.
  if (user.passwordChangedAt) {
    const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (decoded.iat < changedAtSeconds) {
      throw new ApiError(401, 'Password was recently changed. Please log in again.');
    }
  }

  req.user = user;
  next();
});

// Usage: authorize('admin', 'team_lead')
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action.');
  }
  next();
};

module.exports = { protect, authorize };
