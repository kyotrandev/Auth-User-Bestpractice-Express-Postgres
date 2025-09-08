const express = require('express');
const router = express.Router();

const UserController = require('../controllers/userController');
const { requireAuth, requireGuest, logUserActivity } = require('../middleware/auth');
const {
    validateRegistration,
    validateLogin,
    validatePasswordChange,
    validateForgotPassword,
    validateResetPassword,
    handleValidationErrors,
    detectBruteForce,
    sanitizeInput
} = require('../middleware/validators');

// // Apply user activity logging to all routes
// router.use(logUserActivity);

// Auth routes (không cần đăng nhập)
router.post('/auth/register',
    sanitizeInput,
    validateRegistration,
    handleValidationErrors,
    UserController.register
);

router.post('/auth/login',
    sanitizeInput,
    detectBruteForce,
    validateLogin,
    handleValidationErrors,
    UserController.login
);

router.post('/auth/forgot-password',
    validateForgotPassword,
    handleValidationErrors,
    UserController.forgotPassword
);

router.post('/auth/reset-password',
    validateResetPassword,
    handleValidationErrors,
    UserController.resetPassword
);

// Protected routes (cần đăng nhập)
router.post('/auth/logout',
    requireAuth,
    UserController.logout
);

router.post('/auth/change-password',
    requireAuth,
    validatePasswordChange,
    handleValidationErrors,
    UserController.changePassword
);

router.get('/user/profile',
    requireAuth,
    UserController.getProfile
);

module.exports = router;