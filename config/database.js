const { Pool } = require('pg');

// Database configuration with connection pooling
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    max: 10, // giảm số lượng client tối đa để giảm overhead
    min: 2, // duy trì ít nhất 2 kết nối sẵn sàng
    idleTimeoutMillis: 10000, // giảm thời gian chờ xuống 10 giây
    connectionTimeoutMillis: 1000, // giảm timeout kết nối xuống 1 giây
    allowExitOnIdle: false, // không đóng pool khi không có kết nối
    statement_timeout: 5000, // timeout cho các câu query
    query_timeout: 5000 // timeout cho các câu query
});

// Khởi tạo kết nối ban đầu
const initPool = async () => {
    try {
        const client = await pool.connect();
        console.log('Khởi tạo kết nối database thành công');
        client.release();
        return true;
    } catch (err) {
        console.error('Không thể khởi tạo kết nối database:', err);
        return false;
    }
};

// Thử kết nối ngay khi khởi động
initPool();

// Sự kiện khi kết nối thành công
pool.on('connect', () => {
    console.log('Kết nối database thành công');
});

// Sự kiện khi có lỗi kết nối
pool.on('error', (err) => {
    console.log('Lỗi kết nối database:', err);
});

// Hàm query với timeout và retry
const query = async (text, params, retries = 3) => {
    let lastError;

    for (let i = 0; i < retries; i++) {
        try {
            const start = Date.now();
            const res = await pool.query(text, params);
            const duration = Date.now() - start;

            // Log slow queries (>100ms)
            if (duration > 100) {
                console.log('Slow query:', { text, duration, rows: res.rowCount });
            }

            return res;
        } catch (err) {
            lastError = err;

            // Nếu lỗi là do kết nối, thử lại
            if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === '57P01') {
                console.log(`Lỗi kết nối database, thử lại lần ${i + 1}/${retries}:`, err.message);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1 giây trước khi thử lại
                continue;
            }

            // Nếu lỗi khác, ném ra ngoài
            throw err;
        }
    }

    throw lastError;
};

module.exports = {
    pool,
    query,
    initPool
};