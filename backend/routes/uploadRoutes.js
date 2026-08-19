const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadProfileImage } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const User = require('../models/User');

router.use(protect);

// POST /api/uploads/profile-image - the caller's own profile image only.
router.post(
  '/profile-image',
  asyncHandler(async (req, res, next) => {
    uploadProfileImage(req, res, async (err) => {
      if (err) return next(err instanceof ApiError ? err : new ApiError(400, err.message));
      if (!req.file) return next(new ApiError(400, 'No file uploaded.'));

      const relativePath = `/uploads/${req.file.filename}`;
      const user = await User.findById(req.user._id);
      user.profileImage = relativePath;
      await user.save();

      sendSuccess(res, 200, 'Profile image uploaded', { profileImage: relativePath });
    });
  })
);

module.exports = router;
