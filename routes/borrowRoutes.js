const express = require('express');
const router = express.Router();
const BorrowController = require('../controllers/borrowController');
const { requireAuth, requirePermission } = require('../middleware/permission');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validators');
const Permission = require('../models/Permission');

// Middleware validation
const validateBorrowId = [
    param('id').isInt({ min: 1 }).withMessage('ID phiếu mượn phải là số nguyên dương'),
    handleValidationErrors
];

const validateCreateBorrowRequest = [
    body('expected_return_date')
        .isISO8601()
        .withMessage('Ngày trả dự kiến phải có định dạng ISO8601')
        .custom((value) => {
            const returnDate = new Date(value);
            const today = new Date();
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 6); // Tối đa 6 tháng
            
            if (returnDate <= today) {
                throw new Error('Ngày trả dự kiến phải lớn hơn ngày hiện tại');
            }
            
            if (returnDate > maxDate) {
                throw new Error('Ngày trả dự kiến không được quá 6 tháng');
            }
            
            return true;
        }),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Ghi chú không được vượt quá 500 ký tự'),
    body('books')
        .isArray({ min: 1, max: 10 })
        .withMessage('Phải chọn từ 1-10 cuốn sách'),
    body('books.*.book_id')
        .isInt({ min: 1 })
        .withMessage('ID sách phải là số nguyên dương'),
    body('books.*.quantity')
        .isInt({ min: 1, max: 5 })
        .withMessage('Số lượng mỗi sách phải từ 1-5 cuốn'),
    handleValidationErrors
];

const validateUpdateBorrowRequest = [
    body('expected_return_date')
        .optional()
        .isISO8601()
        .withMessage('Ngày trả dự kiến phải có định dạng ISO8601')
        .custom((value) => {
            if (value) {
                const returnDate = new Date(value);
                const today = new Date();
                const maxDate = new Date();
                maxDate.setMonth(maxDate.getMonth() + 6);
                
                if (returnDate <= today) {
                    throw new Error('Ngày trả dự kiến phải lớn hơn ngày hiện tại');
                }
                
                if (returnDate > maxDate) {
                    throw new Error('Ngày trả dự kiến không được quá 6 tháng');
                }
            }
            return true;
        }),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Ghi chú không được vượt quá 500 ký tự'),
    body('books')
        .optional()
        .isArray({ min: 1, max: 10 })
        .withMessage('Phải chọn từ 1-10 cuốn sách'),
    body('books.*.book_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID sách phải là số nguyên dương'),
    body('books.*.quantity')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Số lượng mỗi sách phải từ 1-5 cuốn'),
    handleValidationErrors
];

const validateProcessBorrowRequest = [
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Ghi chú không được vượt quá 500 ký tự'),
    handleValidationErrors
];

const validateRejectBorrowRequest = [
    body('notes')
        .notEmpty()
        .withMessage('Vui lòng nhập lý do từ chối')
        .isLength({ max: 500 })
        .withMessage('Lý do từ chối không được vượt quá 500 ký tự'),
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
    query('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected', 'returned', 'overdue'])
        .withMessage('Trạng thái không hợp lệ'),
    query('user_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID người dùng phải là số nguyên dương'),
    query('date_from')
        .optional()
        .isISO8601()
        .withMessage('Ngày bắt đầu phải có định dạng ISO8601'),
    query('date_to')
        .optional()
        .isISO8601()
        .withMessage('Ngày kết thúc phải có định dạng ISO8601'),
    handleValidationErrors
];

// ==================== BORROW REQUEST ROUTES ====================

/**
 * @route   GET /api/borrow
 * @desc    Lấy danh sách phiếu mượn (admin/librarian xem tất cả, user chỉ xem của mình)
 * @access  Authenticated users
 */
router.get('/', 
    requireAuth,
    validatePagination,
    BorrowController.getAllBorrowRequests
);

/**
 * @route   GET /api/borrow/my
 * @desc    Lấy phiếu mượn của người dùng hiện tại
 * @access  Authenticated users
 */
router.get('/my', 
    requireAuth,
    validatePagination,
    BorrowController.getMyBorrowRequests
);

/**
 * @route   GET /api/borrow/statistics
 * @desc    Lấy thống kê phiếu mượn
 * @access  Librarian or Admin
 */
router.get('/statistics', 
    requirePermission(Permission.PERMISSIONS.BORROW_VIEW_ALL),
    BorrowController.getBorrowStatistics
);

/**
 * @route   GET /api/borrow/:id
 * @desc    Lấy thông tin chi tiết phiếu mượn
 * @access  Owner or Admin/Librarian
 */
router.get('/:id', 
    requireAuth,
    validateBorrowId,
    BorrowController.getBorrowRequestById
);

/**
 * @route   GET /api/borrow/:id/books
 * @desc    Lấy chi tiết sách trong phiếu mượn
 * @access  Owner or Admin/Librarian
 */
router.get('/:id/books', 
    requireAuth,
    validateBorrowId,
    BorrowController.getBorrowRequestBooks
);

/**
 * @route   POST /api/borrow
 * @desc    Tạo phiếu mượn mới
 * @access  Student, Staff, Teacher
 */
router.post('/', 
    requirePermission(Permission.PERMISSIONS.BORROW_CREATE),
    validateCreateBorrowRequest,
    BorrowController.createBorrowRequest
);

/**
 * @route   PUT /api/borrow/:id
 * @desc    Cập nhật phiếu mượn (chỉ khi status = 'pending')
 * @access  Owner or Admin
 */
router.put('/:id', 
    requirePermission(Permission.PERMISSIONS.BORROW_UPDATE),
    validateBorrowId,
    validateUpdateBorrowRequest,
    BorrowController.updateBorrowRequest
);

/**
 * @route   POST /api/borrow/:id/approve
 * @desc    Duyệt phiếu mượn
 * @access  Librarian or Admin
 */
router.post('/:id/approve', 
    requirePermission(Permission.PERMISSIONS.BORROW_APPROVE),
    validateBorrowId,
    validateProcessBorrowRequest,
    BorrowController.approveBorrowRequest
);

/**
 * @route   POST /api/borrow/:id/reject
 * @desc    Từ chối phiếu mượn
 * @access  Librarian or Admin
 */
router.post('/:id/reject', 
    requirePermission(Permission.PERMISSIONS.BORROW_APPROVE),
    validateBorrowId,
    validateRejectBorrowRequest,
    BorrowController.rejectBorrowRequest
);

/**
 * @route   DELETE /api/borrow/:id
 * @desc    Xóa phiếu mượn (chỉ khi status = 'pending')
 * @access  Owner or Admin
 */
router.delete('/:id', 
    requirePermission(Permission.PERMISSIONS.BORROW_DELETE),
    validateBorrowId,
    BorrowController.deleteBorrowRequest
);

module.exports = router;
