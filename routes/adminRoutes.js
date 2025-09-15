const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAdmin, requirePermission } = require('../middleware/permission');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validators');
const Permission = require('../models/Permission');

// Middleware validation
const validateUserId = [
    param('id').isInt({ min: 1 }).withMessage('ID người dùng phải là số nguyên dương'),
    handleValidationErrors
];

const validateCreateUser = [
    body('username')
        .isLength({ min: 3, max: 25 })
        .withMessage('Tên đăng nhập phải có từ 3-25 ký tự')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'),
    body('email')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt'),
    body('phone')
        .optional()
        .matches(/^[0-9]{10,11}$/)
        .withMessage('Số điện thoại phải có 10-11 số'),
    body('role_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID vai trò phải là số nguyên dương'),
    body('user_type')
        .optional()
        .isIn(['admin', 'librarian', 'student', 'staff', 'teacher'])
        .withMessage('Loại người dùng không hợp lệ'),
    handleValidationErrors
];

const validateUpdateUser = [
    body('username')
        .optional()
        .isLength({ min: 3, max: 25 })
        .withMessage('Tên đăng nhập phải có từ 3-25 ký tự')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('phone')
        .optional()
        .matches(/^[0-9]{10,11}$/)
        .withMessage('Số điện thoại phải có 10-11 số'),
    body('role_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID vai trò phải là số nguyên dương'),
    body('user_type')
        .optional()
        .isIn(['admin', 'librarian', 'student', 'staff', 'teacher'])
        .withMessage('Loại người dùng không hợp lệ'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('Trạng thái kích hoạt phải là boolean'),
    handleValidationErrors
];

const validateResetPassword = [
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa, 1 số và 1 ký tự đặc biệt'),
    handleValidationErrors
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Trang phải là số nguyên dương'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Số lượng bản ghi phải từ 1-100'),
    query('role_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID vai trò phải là số nguyên dương'),
    handleValidationErrors
];

// Routes quản lý người dùng

/**
 * @route   GET /api/admin/users
 * @desc    Lấy danh sách tất cả người dùng
 * @access  Admin only
 */
router.get('/users', 
    requireAdmin,
    validatePagination,
    AdminController.getAllUsers
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Lấy thông tin chi tiết một người dùng
 * @access  Admin only
 */
router.get('/users/:id', 
    requireAdmin,
    validateUserId,
    AdminController.getUserById
);

/**
 * @route   POST /api/admin/users
 * @desc    Tạo người dùng mới
 * @access  Admin only
 */
router.post('/users', 
    requireAdmin,
    validateCreateUser,
    AdminController.createUser
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Cập nhật thông tin người dùng
 * @access  Admin only
 */
router.put('/users/:id', 
    requireAdmin,
    validateUserId,
    validateUpdateUser,
    AdminController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Xóa người dùng (soft delete)
 * @access  Admin only
 */
router.delete('/users/:id', 
    requireAdmin,
    validateUserId,
    AdminController.deleteUser
);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Đặt lại mật khẩu cho người dùng
 * @access  Admin only
 */
router.post('/users/:id/reset-password', 
    requireAdmin,
    validateUserId,
    validateResetPassword,
    AdminController.resetUserPassword
);

/**
 * @route   POST /api/admin/users/:id/unlock
 * @desc    Mở khóa tài khoản người dùng
 * @access  Admin only
 */
router.post('/users/:id/unlock', 
    requireAdmin,
    validateUserId,
    AdminController.unlockUser
);

// Routes quản lý vai trò và quyền

/**
 * @route   GET /api/admin/roles
 * @desc    Lấy danh sách vai trò
 * @access  Admin only
 */
router.get('/roles', 
    requireAdmin,
    AdminController.getAllRoles
);

/**
 * @route   GET /api/admin/permissions
 * @desc    Lấy danh sách quyền
 * @access  Admin only
 */
router.get('/permissions', 
    requireAdmin,
    AdminController.getAllPermissions
);

// Routes thống kê

/**
 * @route   GET /api/admin/statistics
 * @desc    Lấy thống kê hệ thống
 * @access  Admin only
 */
router.get('/statistics', 
    requireAdmin,
    AdminController.getSystemStatistics
);

module.exports = router;
