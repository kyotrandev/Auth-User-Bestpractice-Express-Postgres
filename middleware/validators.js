const { body, validationResult } = require('express-validator');
const { 
    sanitizeInputData, 
    encodeDangerousChars, 
    isSuspiciousInput 
} = require('../utils/sanitizer');

// Password validation regex (updated to allow encoded characters)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&,'".])[A-Za-z\d@$!%*?&,.'"&#x;]{12,}$/;

// Username validation regex (updated to allow encoded characters)
const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_\-&#x;]*$/;

// Reserved usernames
const reservedUsernames = [
    'administrator', 'admin', 'support', 'root', 'postmaster',
    'abuse', 'webmaster', 'security', 'info', 'marketing',
    'sales', 'noreply', 'mail', 'email', 'help', 'api'
];

/**
 * Validation rules for user registration
 */
const validateRegistration = [
    body('username')
        .isLength({ min: 12, max: 25 })
        .withMessage('Tên đăng nhập phải có độ dài từ 12-25 ký tự')
        .matches(usernameRegex)
        .withMessage('Tên đăng nhập phải bắt đầu bằng chữ cái, chỉ chứa chữ cái, số, gạch ngang và gạch dưới')
        .custom((value) => {
            if (reservedUsernames.includes(value.toLowerCase())) {
                throw new Error('Tên đăng nhập này không được phép sử dụng');
            }
            return true;
        })
        .trim()
        .escape(),

    body('password')
        .isLength({ min: 12 })
        .withMessage('Mật khẩu phải có ít nhất 12 ký tự')
        .matches(passwordRegex)
        .withMessage('Mật khẩu phải chứa ít nhất: 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Xác nhận mật khẩu không khớp');
            }
            return true;
        }),

    body('email')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email không được vượt quá 255 ký tự'),

    body('phone')
        .optional()
        .matches(/^(\+84|0)[35789][0-9]{8}$/)
        .withMessage('Số điện thoại không hợp lệ')
        .isLength({ max: 20 })
        .withMessage('Số điện thoại không được vượt quá 20 ký tự')
        .trim(),

    body('address')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Địa chỉ không được vượt quá 500 ký tự')
        .trim()
        .escape()
];

/**
 * Validation rules for user login
 */
const validateLogin = [
    body('username')
        .notEmpty()
        .withMessage('Tên đăng nhập không được để trống')
        .isLength({ max: 25 })
        .withMessage('Tên đăng nhập không hợp lệ')
        .trim()
        .escape(),

    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống')
        .isLength({ max: 128 })
        .withMessage('Mật khẩu không hợp lệ')
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Mật khẩu hiện tại không được để trống'),

    body('newPassword')
        .isLength({ min: 12 })
        .withMessage('Mật khẩu mới phải có ít nhất 12 ký tự')
        .matches(passwordRegex)
        .withMessage('Mật khẩu mới phải chứa ít nhất: 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại');
            }
            return true;
        }),

    body('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Xác nhận mật khẩu mới không khớp');
            }
            return true;
        })
];

/**
 * Validation rules for forgot password
 */
const validateForgotPassword = [
    body('email')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email không hợp lệ')
];

/**
 * Validation rules for reset password
 */
const validateResetPassword = [
    body('token')
        .notEmpty()
        .withMessage('Token không được để trống')
        .isLength({ min: 64, max: 64 })
        .withMessage('Token không hợp lệ'),

    body('newPassword')
        .isLength({ min: 12 })
        .withMessage('Mật khẩu mới phải có ít nhất 12 ký tự')
        .matches(passwordRegex)
        .withMessage('Mật khẩu mới phải chứa ít nhất: 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'),

    body('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Xác nhận mật khẩu mới không khớp');
            }
            return true;
        })
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);

        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đầu vào không hợp lệ',
            errors: errorMessages
        });
    }

    next();
};

/**
 * Check for potential brute force attacks
 */
const detectBruteForce = (req, res, next) => {
    const { username } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Log suspicious activities
    const suspiciousPatterns = [
        /admin/i, /root/i, /test/i, /guest/i,
        /123456/, /password/, /qwerty/
    ];

    const isSuspicious = suspiciousPatterns.some(pattern =>
        pattern.test(username) || pattern.test(req.body.password || '')
    );

    if (isSuspicious) {
        console.warn(`Suspicious login attempt from ${clientIP}: ${username}`);
    }

    next();
};

/**
 * Advanced sanitization middleware - Layer 2 Security
 * Sanitizes all input data using custom sanitizer utility
 */
const sanitizeInput = (req, res, next) => {
    try {
        // Define field types for each request body field
        const fieldTypes = {
            username: 'username',
            password: 'password',
            newPassword: 'password',
            currentPassword: 'password',
            confirmPassword: 'password',
            confirmNewPassword: 'password',
            email: 'email',
            phone: 'phone',
            address: 'text',
            notes: 'text'
        };

        // Sanitize all input data
        const sanitizationResult = sanitizeInputData(req.body, fieldTypes);

        // Log suspicious activity
        for (const [field, value] of Object.entries(req.body)) {
            if (value && isSuspiciousInput(value)) {
                console.warn(`Suspicious input detected from ${req.ip}: ${field} = ${value.substring(0, 50)}...`);
            }
        }

        // If sanitization found errors, return them
        if (!sanitizationResult.isValid) {
            const errorMessages = [];
            for (const [field, errors] of Object.entries(sanitizationResult.errors)) {
                errorMessages.push(...errors);
            }

            return res.status(400).json({
                success: false,
                message: 'Dữ liệu đầu vào chứa nội dung không hợp lệ',
                errors: errorMessages
            });
        }

        // Replace request body with sanitized data
        req.body = sanitizationResult.sanitizedData;

        // Store original data for logging if needed
        req.originalBody = { ...req.body };

        next();
    } catch (error) {
        console.error('Error in sanitizeInput middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xử lý dữ liệu đầu vào'
        });
    }
};

module.exports = {
    validateRegistration,
    validateLogin,
    validatePasswordChange,
    validateForgotPassword,
    validateResetPassword,
    handleValidationErrors,
    detectBruteForce,
    sanitizeInput
};