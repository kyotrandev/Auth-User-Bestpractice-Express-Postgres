-- Database initialization script for Docker

-- Create database
CREATE DATABASE user_management;

-- Connect to the database
\c user_management;

-- Create application user with limited privileges
CREATE USER app_user WITH PASSWORD 'TMDTCT07N@12345678';

-- Grant specific privileges
GRANT CONNECT ON DATABASE user_management TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_user;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(25) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT false
);

-- =================================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) DATABASE SCHEMA
-- Hệ thống phân quyền dựa trên vai trò cho ứng dụng quản lý thư viện
-- =================================================================

-- 1. BẢNG VAI TRÒ (ROLES)
-- Định nghĩa các vai trò trong hệ thống
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions BIGINT DEFAULT 0, -- Sử dụng bit flags để lưu quyền
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG QUYỀN (RIGHTS/PERMISSIONS)
-- Định nghĩa chi tiết các quyền và giá trị bit tương ứng
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    bit_value BIGINT NOT NULL UNIQUE, -- Giá trị bit (1, 2, 4, 8, 16, 32, ...)
    module VARCHAR(50), -- Module/chức năng (users, books, borrow, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CẬP NHẬT BẢNG USERS
-- Thêm cột role_id vào bảng users hiện có
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'student' CHECK (user_type IN ('admin', 'librarian', 'student', 'staff', 'teacher'));

-- 4. BẢNG THỂ LOẠI SÁCH
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG SÁCH
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    book_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publisher VARCHAR(255),
    publish_year INTEGER,
    category_id INTEGER REFERENCES categories(id),
    description TEXT,
    quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
    available_quantity INTEGER DEFAULT 0 CHECK (available_quantity >= 0),
    price DECIMAL(10,2),
    isbn VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. BẢNG PHIẾU MƯỢN
CREATE TABLE IF NOT EXISTS borrow_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_return_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'returned', 'overdue')),
    notes TEXT,
    processed_by INTEGER REFERENCES users(id), -- ID của thủ thư xử lý
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. BẢNG CHI TIẾT PHIẾU MƯỢN
CREATE TABLE IF NOT EXISTS borrow_request_details (
    id SERIAL PRIMARY KEY,
    borrow_request_id INTEGER REFERENCES borrow_requests(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    return_date TIMESTAMP,
    is_returned BOOLEAN DEFAULT false,
    condition_when_borrowed VARCHAR(50) DEFAULT 'good',
    condition_when_returned VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. BẢNG LỊCH SỬ PHIÊN LÀM VIỆC
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. BẢNG AUDIT LOG (Ghi nhận hoạt động)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant table privileges to app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON books TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON borrow_requests TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON borrow_request_details TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO app_user;

-- Grant sequence privileges
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE password_reset_tokens_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE roles_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE permissions_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE books_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE borrow_requests_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE borrow_request_details_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE user_sessions_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO app_user;

-- Create view for user info without sensitive data
CREATE VIEW user_profile AS 
SELECT 
    id,
    username,
    email,
    phone,
    address,
    created_at,
    last_login,
    is_active
FROM users;

GRANT SELECT ON user_profile TO app_user;
