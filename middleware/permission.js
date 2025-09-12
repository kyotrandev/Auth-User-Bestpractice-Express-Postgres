const User = require('../models/User');
const Permission = require('../models/Permission');

/**
 * Middleware kiểm tra quyền truy cập
 */

/**
 * Kiểm tra người dùng đã đăng nhập
 */
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập để truy cập chức năng này'
        });
    }
    next();
};

/**
 * Kiểm tra quyền dựa trên bit flags
 */
const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
                if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vui lòng đăng nhập để truy cập chức năng này'
                });
            }

            const userId = req.session.user.id;
            console.log("UserID:", userId, "Required Permission:", requiredPermission);
            const hasPermission = await User.hasPermission(userId, requiredPermission);

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thực hiện hành động này'
                });
            }

            next();
        } catch (error) {
            console.error('Lỗi kiểm tra quyền:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi kiểm tra quyền'
            });
        }
    };
};

/**
 * Kiểm tra quyền dựa trên tên quyền
 */
const requirePermissionByName = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vui lòng đăng nhập để truy cập chức năng này'
                });
            }

            const permission = await Permission.findByName(permissionName);
            if (!permission) {
                return res.status(500).json({
                    success: false,
                    message: 'Quyền không tồn tại trong hệ thống'
                });
            }

            const userId = req.session.user.id;
            const hasPermission = await User.hasPermission(userId, permission.bit_value);

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thực hiện hành động này'
                });
            }

            next();
        } catch (error) {
            console.error('Lỗi kiểm tra quyền:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi kiểm tra quyền'
            });
        }
    };
};

/**
 * Kiểm tra quyền admin
 */
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để truy cập chức năng này'
            });
        }

        // Fallback: Cho phép admin theo session khi DB chưa sẵn sàng
        if (req.session.user.user_type === 'admin') {
            return next();
        }

        const userId = req.session.user.id;
        const hasAdminPermission = await User.hasPermission(userId, Permission.PERMISSIONS.SYSTEM_ADMIN);
        if (!hasAdminPermission) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ quản trị viên mới có thể truy cập chức năng này'
            });
        }

        next();
    } catch (error) {
        console.error('Lỗi kiểm tra quyền admin:', error);
        // Nếu lỗi khi truy vấn quyền (ví dụ DB lỗi), dựa vào session như một phương án dự phòng an toàn
        if (req.session.user && req.session.user.user_type === 'admin') {
            return next();
        }
        return res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi kiểm tra quyền'
        });
    }
};

/**
 * Kiểm tra quyền thủ thư
 */
const requireLibrarian = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để truy cập chức năng này'
            });
        }

        const userId = req.session.user.id;
        const userPermissions = await User.getUserPermissions(userId);

        // Kiểm tra là admin hoặc thủ thư
        const isAdmin = (userPermissions.permissions & Permission.PERMISSIONS.SYSTEM_ADMIN) === Permission.PERMISSIONS.SYSTEM_ADMIN;
        const canManageBooks = (userPermissions.permissions & Permission.PERMISSIONS.BOOKS_CREATE) === Permission.PERMISSIONS.BOOKS_CREATE;

        if (!isAdmin && !canManageBooks) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ thủ thư hoặc quản trị viên mới có thể truy cập chức năng này'
            });
        }

        next();
    } catch (error) {
        console.error('Lỗi kiểm tra quyền thủ thư:', error);
        return res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi kiểm tra quyền'
        });
    }
};

/**
 * Kiểm tra quyền của chính người dùng hoặc admin
 */
const requireOwnerOrAdmin = (userIdParam = 'id') => {
    return async (req, res, next) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vui lòng đăng nhập để truy cập chức năng này'
                });
            }

            const currentUserId = req.session.user.id;
            const targetUserId = parseInt(req.params[userIdParam]) || parseInt(req.body.user_id);

            // Kiểm tra nếu là chính người dùng
            if (currentUserId === targetUserId) {
                return next();
            }

            // Kiểm tra quyền admin
            const hasAdminPermission = await User.hasPermission(currentUserId, Permission.PERMISSIONS.SYSTEM_ADMIN);
            if (hasAdminPermission) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể thao tác với dữ liệu của chính mình'
            });

        } catch (error) {
            console.error('Lỗi kiểm tra quyền owner/admin:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi kiểm tra quyền'
            });
        }
    };
};

/**
 * Middleware lấy thông tin quyền của user hiện tại
 */
const loadUserPermissions = async (req, res, next) => {
    try {
        if (req.session.user) {
            const userPermissions = await User.getUserPermissions(req.session.user.id);
            req.userPermissions = userPermissions;
        }
        next();
    } catch (error) {
        console.error('Lỗi lấy quyền người dùng:', error);
        next(); // Tiếp tục nhưng không có thông tin quyền
    }
};

module.exports = {
    requireAuth,
    requirePermission,
    requirePermissionByName,
    requireAdmin,
    requireLibrarian,
    requireOwnerOrAdmin,
    loadUserPermissions
};
