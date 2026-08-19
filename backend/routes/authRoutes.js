const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { loginRules, changePasswordRules } = require('../validators/authValidators');
const ctrl = require('../controllers/authController');

router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password/:token', authLimiter, ctrl.resetPassword);

router.use(protect);
router.post('/logout', ctrl.logout);
router.get('/me', ctrl.getMe);
router.patch('/change-password', changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
