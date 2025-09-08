/**
 * Authentication Middleware
 */

/**
 * Kiểm tra user đã đăng nhập chưa
 */
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }

    // Nếu là API request, trả về JSON
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'Vui lòng đăng nhập để tiếp tục'
        });
    }

    // Nếu là request thường, redirect đến trang login
    return res.redirect('/login');
};

/**
 * Kiểm tra user chưa đăng nhập (cho trang login, register)
 */
const requireGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        // Nếu đã đăng nhập, redirect về trang chủ
        return res.redirect('/profile');
    }

    next();
};

/**
 * Middleware để truyền thông tin user vào view
 */
const addUserToLocals = (req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    next();
};

/**
 * Log hoạt động user
 */
const logUserActivity = (req, res, next) => {
    if (req.session && req.session.user) {
        const timestamp = new Date().toISOString();
        const userAgent = req.get('User-Agent');
        const ip = req.ip || req.connection.remoteAddress;

        console.log(`[${timestamp}] User ${req.session.user.username} - ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent}`);
    }

    next();
};

module.exports = {
    requireAuth,
    requireGuest,
    addUserToLocals,
    logUserActivity
};