const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { logAction } = require('../services/auditService');
const { sendPasswordResetEmail } = require('../services/emailService');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'This account has been deactivated. Contact your administrator.');
  }

  const token = signToken(user._id);
  await logAction({ user, action: 'login', module: 'Auth', description: 'User logged in', req });

  const safeUser = user.toJSON();
  sendSuccess(res, 200, 'Login successful', { token, user: safeUser });
});

// POST /api/auth/logout
// JWTs are stateless, so "logout" is a client-side token discard.
// This endpoint exists for audit-trail completeness and future
// server-side session/blacklist support.
const logout = asyncHandler(async (req, res) => {
  await logAction({ user: req.user, action: 'logout', module: 'Auth', req });
  sendSuccess(res, 200, 'Logged out successfully');
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'Current user', { user: req.user.toJSON() });
});

// PATCH /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters.');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();

  await logAction({ user, action: 'change_password', module: 'Auth', req });
  sendSuccess(res, 200, 'Password changed successfully. Please log in again.');
});

// POST /api/auth/forgot-password
// Issues a short-lived reset token and emails it via services/emailService.
// If SMTP isn't configured (see .env.example), emailService logs instead
// of sending, and - only outside production - the token is included in
// the response so the flow is still testable without a mail server.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  // Always respond the same way whether or not the user exists, to avoid
  // leaking which emails are registered.
  if (!user) {
    return sendSuccess(res, 200, 'If that email is registered, a reset link has been generated.');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const emailResult = await sendPasswordResetEmail(user, resetToken);

  sendSuccess(res, 200, 'If that email is registered, a reset link has been generated.', {
    // Only ever exposed when there's no real mail transport AND we're not
    // in production - never returned once SMTP is configured, and never
    // returned in production regardless of SMTP status.
    resetToken: process.env.NODE_ENV !== 'production' && !emailResult.sent ? resetToken : undefined,
  });
});

// POST /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) throw new ApiError(400, 'Reset token is invalid or has expired.');
  if (!req.body.newPassword || req.body.newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters.');
  }

  user.password = req.body.newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  sendSuccess(res, 200, 'Password has been reset. Please log in.');
});

module.exports = { login, logout, getMe, changePassword, forgotPassword, resetPassword };
