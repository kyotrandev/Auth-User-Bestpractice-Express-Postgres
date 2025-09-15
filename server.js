const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { pool, initPool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Khởi tạo kết nối database trước khi khởi động server
let dbConnected = false;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", // Allow inline scripts
                "https://code.jquery.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", // Allow inline styles
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://code.jquery.com"
            ]
        }
    }
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút.'
});

app.use(limiter);
app.use('/api/auth', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Setup express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layout');
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

// CSRF protection
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Routes
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);


// Serve HTML pages
app.get('/', (req, res) => {
    res.render('index', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Trang chủ'
    });
});

app.get('/register', (req, res) => {
    res.render('register', {
        csrfToken: req.csrfToken(),
        title: 'Đăng ký tài khoản'
    });
});

app.get('/login', (req, res) => {
    res.render('login', {
        csrfToken: req.csrfToken(),
        title: 'Đăng nhập'
    });
});

app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        csrfToken: req.csrfToken(),
        title: 'Quên mật khẩu'
    });
});

app.get('/change-password', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('change-password', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Đổi mật khẩu'
    });
});

app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Thông tin cá nhân'
    });
});

// Trang quản lý người dùng (Admin)
app.get('/admin/users', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('admin/users', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Quản lý người dùng'
    });
});

// Trang quản lý sách (Thủ thư)
app.get('/books/manage', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('books/manage', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Quản lý sách'
    });
});

// Trang danh sách sách (Public)
app.get('/books', (req, res) => {
    res.render('books/index', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Danh sách sách'
    });
});

// Trang phiếu mượn sách (User)
app.get('/borrow', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('borrow/index', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Phiếu mượn sách'
    });
});

// Trang tạo phiếu mượn mới
app.get('/borrow/create', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('borrow/create', { 
        user: req.session.user,
        csrfToken: req.csrfToken(),
        title: 'Tạo phiếu mượn'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Xử lý lỗi CSRF
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            message: 'Lỗi bảo mật: CSRF token không hợp lệ',
            errors: ['Vui lòng tải lại trang và thử lại']
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra trên server'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Server Closing...');
    try {
        if (pool) {
            console.log('Đóng kết nối database...');
            await pool.end();
        }
    } catch (err) {
        console.error('Lỗi khi đóng kết nối database:', err);
    }
    process.exit(0);
});

// Khởi động server sau khi kiểm tra kết nối database
const startServer = async () => {
    try {
        // Thử kết nối database trước khi khởi động server
        dbConnected = await initPool();
        
        if (!dbConnected) {
            console.warn('DB Connection Error');
        }
        
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Database connection status: ${dbConnected ? 'Connected' : 'Not connected'}`);
        });
    } catch (err) {
        console.error('Không thể khởi động server:', err);
        process.exit(1);
    }
};

startServer();