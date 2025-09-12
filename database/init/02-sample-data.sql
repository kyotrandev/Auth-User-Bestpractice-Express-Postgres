-- Connect to the database
\c user_management;

-- =================================================================
-- DẰỮ LIỆU MẪU CHO HỆ THỐNG PHÂN QUYỀN RBAC
-- =================================================================

-- 1. THÊM DỮ LIỆU QUYỀN (PERMISSIONS)
INSERT INTO permissions (name, display_name, description, bit_value, module) VALUES
-- User Management (bit 1-8: 1, 2, 4, 8)
('users.create', 'Tạo người dùng', 'Quyền tạo tài khoản người dùng mới', 1, 'users'),
('users.read', 'Xem người dùng', 'Quyền xem thông tin người dùng', 2, 'users'),
('users.update', 'Cập nhật người dùng', 'Quyền sửa thông tin người dùng', 4, 'users'),
('users.delete', 'Xóa người dùng', 'Quyền xóa tài khoản người dùng', 8, 'users'),

-- Book Management (bit 9-16: 16, 32, 64, 128)
('books.create', 'Tạo sách', 'Quyền thêm sách mới vào thư viện', 16, 'books'),
('books.read', 'Xem sách', 'Quyền xem thông tin sách', 32, 'books'),
('books.update', 'Cập nhật sách', 'Quyền sửa thông tin sách', 64, 'books'),
('books.delete', 'Xóa sách', 'Quyền xóa sách khỏi thư viện', 128, 'books'),

-- Category Management (bit 17-20: 256, 512, 1024, 2048)
('categories.create', 'Tạo thể loại', 'Quyền tạo thể loại sách mới', 256, 'categories'),
('categories.read', 'Xem thể loại', 'Quyền xem danh sách thể loại', 512, 'categories'),
('categories.update', 'Cập nhật thể loại', 'Quyền sửa thông tin thể loại', 1024, 'categories'),
('categories.delete', 'Xóa thể loại', 'Quyền xóa thể loại sách', 2048, 'categories'),

-- Borrow Management (bit 21-28: 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288)
('borrow.create', 'Tạo phiếu mượn', 'Quyền tạo phiếu mượn sách', 4096, 'borrow'),
('borrow.read', 'Xem phiếu mượn', 'Quyền xem thông tin phiếu mượn', 8192, 'borrow'),
('borrow.update', 'Cập nhật phiếu mượn', 'Quyền sửa phiếu mượn (trước khi gửi)', 16384, 'borrow'),
('borrow.delete', 'Xóa phiếu mượn', 'Quyền xóa phiếu mượn (trước khi gửi)', 32768, 'borrow'),
('borrow.approve', 'Duyệt phiếu mượn', 'Quyền duyệt/từ chối phiếu mượn', 65536, 'borrow'),
('borrow.return', 'Trả sách', 'Quyền xử lý trả sách', 131072, 'borrow'),
('borrow.view_all', 'Xem tất cả phiếu mượn', 'Quyền xem tất cả phiếu mượn của người khác', 262144, 'borrow'),
('borrow.manage_overdue', 'Quản lý quá hạn', 'Quyền quản lý sách quá hạn', 524288, 'borrow'),

-- System Management (bit 29-32: 1048576, 2097152, 4194304, 8388608)
('system.admin', 'Quản trị hệ thống', 'Quyền quản trị toàn bộ hệ thống', 1048576, 'system'),
('system.view_logs', 'Xem nhật ký', 'Quyền xem nhật ký hoạt động', 2097152, 'system'),
('system.backup', 'Sao lưu dữ liệu', 'Quyền sao lưu và khôi phục dữ liệu', 4194304, 'system'),
('system.settings', 'Cài đặt hệ thống', 'Quyền thay đổi cài đặt hệ thống', 8388608, 'system')
ON CONFLICT (name) DO NOTHING;

-- 2. THÊM DỮ LIỆU VAI TRÒ (ROLES)
INSERT INTO roles (name, display_name, description, permissions) VALUES
-- Admin: Có tất cả quyền
('admin', 'Quản trị viên', 'Có quyền quản trị toàn bộ hệ thống', 
    1 + 2 + 4 + 8 + 16 + 32 + 64 + 128 + 256 + 512 + 1024 + 2048 + 
    4096 + 8192 + 16384 + 32768 + 65536 + 131072 + 262144 + 524288 + 
    1048576 + 2097152 + 4194304 + 8388608),

-- Librarian: Quản lý sách, thể loại, duyệt phiếu mượn
('librarian', 'Thủ thư', 'Quản lý sách, thể loại và xử lý phiếu mượn', 
    2 + 16 + 32 + 64 + 128 + 256 + 512 + 1024 + 2048 + 
    8192 + 65536 + 131072 + 262144 + 524288),

-- Student: Chỉ có thể mượn sách
('student', 'Sinh viên', 'Có thể tìm kiếm và mượn sách', 
    32 + 512 + 4096 + 8192 + 16384 + 32768),

-- Staff: Nhân viên có thể mượn sách
('staff', 'Cán bộ', 'Cán bộ có thể mượn sách', 
    32 + 512 + 4096 + 8192 + 16384 + 32768),

-- Teacher: Giảng viên có thể mượn sách với quyền cao hơn
('teacher', 'Giảng viên', 'Giảng viên có thể mượn sách với thời hạn dài hơn', 
    32 + 512 + 4096 + 8192 + 16384 + 32768)
ON CONFLICT (name) DO NOTHING;

-- 3. THÊM DỮ LIỆU THỂ LOẠI SÁCH
INSERT INTO categories (name, description) VALUES
('Khoa học máy tính', 'Sách về lập trình, thuật toán, cấu trúc dữ liệu'),
('Văn học', 'Tiểu thuyết, thơ ca, truyện ngắn'),
('Kinh tế', 'Sách về kinh tế học, quản trị kinh doanh'),
('Lịch sử', 'Sách về lịch sử Việt Nam và thế giới'),
('Khoa học tự nhiên', 'Vật lý, hóa học, sinh học, toán học'),
('Ngoại ngữ', 'Sách học tiếng Anh, tiếng Nhật, tiếng Trung'),
('Tâm lý học', 'Sách về tâm lý học và phát triển bản thân'),
('Nghệ thuật', 'Sách về hội họa, âm nhạc, điện ảnh')
ON CONFLICT (name) DO NOTHING;

-- 4. THÊM DỮ LIỆU SÁCH MẪU
INSERT INTO books (book_code, title, author, publisher, publish_year, category_id, description, quantity, available_quantity, price, isbn) VALUES
('CS001', 'Cấu trúc dữ liệu và giải thuật', 'Nguyễn Văn A', 'NXB Đại học Quốc gia', 2020, 1, 'Sách giảng dạy về cấu trúc dữ liệu cơ bản', 10, 8, 250000, '9781234567890'),
('CS002', 'Lập trình Java cơ bản', 'Trần Thị B', 'NXB Giáo dục', 2021, 1, 'Hướng dẫn lập trình Java từ cơ bản đến nâng cao', 15, 12, 300000, '9781234567891'),
('LIT001', 'Truyện Kiều', 'Nguyễn Du', 'NXB Văn học', 1990, 2, 'Tác phẩm kinh điển của văn học Việt Nam', 20, 15, 150000, '9781234567892'),
('ECO001', 'Kinh tế học vi mô', 'Phạm Văn C', 'NXB Kinh tế', 2019, 3, 'Giáo trình kinh tế học vi mô', 12, 10, 280000, '9781234567893'),
('HIS001', 'Lịch sử Việt Nam', 'Lê Thị D', 'NXB Chính trị Quốc gia', 2018, 4, 'Tổng quan lịch sử dân tộc Việt Nam', 8, 6, 200000, '9781234567894'),
('SCI001', 'Vật lý đại cương', 'Hoàng Văn E', 'NXB Khoa học', 2020, 5, 'Giáo trình vật lý cho sinh viên đại học', 25, 20, 350000, '9781234567895'),
('ENG001', 'English Grammar in Use', 'Raymond Murphy', 'Cambridge University Press', 2019, 6, 'Sách ngữ pháp tiếng Anh thực hành', 30, 25, 400000, '9781234567896'),
('PSY001', '7 thói quen hiệu quả', 'Stephen Covey', 'NXB Tổng hợp TP.HCM', 2017, 7, 'Sách phát triển bản thân nổi tiếng', 18, 14, 220000, '9781234567897')
ON CONFLICT (book_code) DO NOTHING;

-- 5. CẬP NHẬT DỮ LIỆU NGƯỜI DÙNG VỚI VAI TRÒ
INSERT INTO users (username, email, password_hash, phone, address, role_id, user_type, is_active) VALUES 
('admin_system', 'admin@library.edu.vn', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0901234567', 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', 1, 'admin', true),
('librarian_01', 'librarian@library.edu.vn', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0912345678', '123 Nguyễn Trãi, Thanh Xuân, Hà Nội', 2, 'librarian', true),
('student_001', 'student001@student.edu.vn', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0987654321', '456 Lê Duẩn, Hoàn Kiếm, Hà Nội', 3, 'student', true),
('staff_001', 'staff001@library.edu.vn', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0934567890', '789 Trần Phú, Ba Đình, Hà Nội', 4, 'staff', true),
('teacher_001', 'teacher001@library.edu.vn', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0945678901', '321 Láng, Đống Đa, Hà Nội', 5, 'teacher', true)
ON CONFLICT (username) DO NOTHING;

-- Quyền đã được cấp trong file 01-init.sql
