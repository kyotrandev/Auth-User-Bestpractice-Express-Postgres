# Hệ thống Quản lý Thư viện với RBAC

## Tổng quan
Hệ thống quản lý thư viện được xây dựng dựa trên codebase quản lý tài khoản người dùng hiện có, bổ sung thêm:
- Hệ thống phân quyền dựa trên vai trò (RBAC)
- Quản lý sách và thể loại
- Quản lý phiếu mượn sách

## Cấu trúc Database

### Bảng Roles (Vai trò)
```sql
- id: ID vai trò
- name: Tên vai trò (admin, librarian, student, staff, teacher)
- display_name: Tên hiển thị
- description: Mô tả vai trò
- permissions: Quyền dưới dạng bit flags
```

### Bảng Permissions (Quyền)
```sql
- id: ID quyền
- name: Tên quyền (ví dụ: users.create, books.read)
- display_name: Tên hiển thị
- description: Mô tả quyền
- bit_value: Giá trị bit (1, 2, 4, 8, 16, ...)
- module: Module chức năng (users, books, categories, borrow, system)
```

### Bảng Books (Sách)
```sql
- id: ID sách
- book_code: Mã sách (duy nhất)
- title: Tên sách
- author: Tác giả
- publisher: Nhà xuất bản
- publish_year: Năm xuất bản
- category_id: ID thể loại
- description: Mô tả
- quantity: Tổng số lượng
- available_quantity: Số lượng có sẵn
- price: Giá sách
- isbn: Mã ISBN
```

### Bảng Categories (Thể loại)
```sql
- id: ID thể loại
- name: Tên thể loại
- description: Mô tả
- is_active: Trạng thái hoạt động
```

### Bảng Borrow_requests (Phiếu mượn)
```sql
- id: ID phiếu mượn
- user_id: ID người mượn
- request_date: Ngày yêu cầu
- expected_return_date: Ngày trả dự kiến
- status: Trạng thái (pending, approved, rejected, returned, overdue)
- notes: Ghi chú
- processed_by: ID người xử lý
- processed_at: Thời gian xử lý
```

### Bảng Borrow_request_details (Chi tiết phiếu mượn)
```sql
- id: ID chi tiết
- borrow_request_id: ID phiếu mượn
- book_id: ID sách
- quantity: Số lượng mượn
- return_date: Ngày trả thực tế
- is_returned: Đã trả hay chưa
```

## Vai trò và Quyền

### 1. Admin (Quản trị viên)
- **Quyền**: Tất cả quyền trong hệ thống
- **Chức năng**:
  - Quản lý người dùng (CRUD)
  - Phân quyền cho người dùng
  - Xem tất cả hoạt động hệ thống
  - Quản lý sách và thể loại
  - Xử lý phiếu mượn

### 2. Librarian (Thủ thư)
- **Quyền**: 
  - Quản lý sách (CRUD)
  - Quản lý thể loại (CRUD)
  - Duyệt/từ chối phiếu mượn
  - Xử lý trả sách
  - Xem tất cả phiếu mượn
- **Chức năng**:
  - Thêm, sửa, xóa sách và thể loại
  - Duyệt phiếu mượn của người dùng
  - Quản lý tình trạng sách

### 3. Student (Sinh viên)
- **Quyền**:
  - Xem sách và thể loại
  - Tạo, sửa, xóa phiếu mượn (trước khi gửi)
  - Xem phiếu mượn của mình
- **Chức năng**:
  - Tìm kiếm sách
  - Tạo phiếu mượn sách
  - Theo dõi tình trạng phiếu mượn

### 4. Staff (Cán bộ)
- **Quyền**: Tương tự như Student
- **Chức năng**: Tương tự như Student với thời hạn mượn có thể khác

### 5. Teacher (Giảng viên)
- **Quyền**: Tương tự như Student
- **Chức năng**: Tương tự như Student với đặc quyền mượn sách lâu hơn

## API Endpoints

### Authentication & User Management
```
POST   /api/register           - Đăng ký tài khoản
POST   /api/login              - Đăng nhập
POST   /api/logout             - Đăng xuất
POST   /api/change-password    - Đổi mật khẩu
POST   /api/forgot-password    - Quên mật khẩu
GET    /api/profile            - Lấy thông tin profile
```

### Admin - User Management
```
GET    /api/admin/users        - Lấy danh sách người dùng
GET    /api/admin/users/:id    - Lấy thông tin người dùng
POST   /api/admin/users        - Tạo người dùng mới
PUT    /api/admin/users/:id    - Cập nhật người dùng
DELETE /api/admin/users/:id    - Xóa người dùng
POST   /api/admin/users/:id/reset-password - Đặt lại mật khẩu
POST   /api/admin/users/:id/unlock - Mở khóa tài khoản
GET    /api/admin/roles        - Lấy danh sách vai trò
GET    /api/admin/permissions  - Lấy danh sách quyền
GET    /api/admin/statistics   - Thống kê hệ thống
```

### Book Management
```
GET    /api/books              - Lấy danh sách sách
GET    /api/books/available    - Lấy sách có sẵn để mượn
GET    /api/books/:id          - Lấy thông tin sách
POST   /api/books              - Tạo sách mới (Librarian)
PUT    /api/books/:id          - Cập nhật sách (Librarian)
DELETE /api/books/:id          - Xóa sách (Librarian)
PATCH  /api/books/:id/quantity - Cập nhật số lượng
```

### Category Management
```
GET    /api/books/categories/all  - Lấy danh sách thể loại
GET    /api/books/categories/:id  - Lấy thông tin thể loại
POST   /api/books/categories      - Tạo thể loại (Librarian)
PUT    /api/books/categories/:id  - Cập nhật thể loại (Librarian)
DELETE /api/books/categories/:id  - Xóa thể loại (Librarian)
GET    /api/books/categories/stats - Thống kê theo thể loại
```

### Borrow Management
```
GET    /api/borrow             - Lấy danh sách phiếu mượn
GET    /api/borrow/my          - Phiếu mượn của tôi
GET    /api/borrow/:id         - Chi tiết phiếu mượn
POST   /api/borrow             - Tạo phiếu mượn mới
PUT    /api/borrow/:id         - Cập nhật phiếu mượn
DELETE /api/borrow/:id         - Xóa phiếu mượn
POST   /api/borrow/:id/approve - Duyệt phiếu mượn (Librarian)
POST   /api/borrow/:id/reject  - Từ chối phiếu mượn (Librarian)
GET    /api/borrow/statistics  - Thống kê phiếu mượn
```

## Cách sử dụng

### 1. Khởi tạo Database
```bash
# Chạy Docker container PostgreSQL
docker-compose up -d

# Database sẽ tự động được khởi tạo với schema và dữ liệu mẫu
```

### 2. Khởi động Server
```bash
npm install
npm start
```

### 3. Đăng nhập với tài khoản mẫu

#### Admin
- Username: `admin_system`
- Password: `StrongPassword123!`
- Có quyền: Quản lý toàn bộ hệ thống

#### Thủ thư
- Username: `librarian_01`
- Password: `StrongPassword123!`
- Có quyền: Quản lý sách, duyệt phiếu mượn

#### Sinh viên
- Username: `student_001`
- Password: `StrongPassword123!`
- Có quyền: Xem sách, tạo phiếu mượn

### 4. Các trang giao diện
- `/` - Trang chủ
- `/login` - Đăng nhập
- `/register` - Đăng ký
- `/books` - Danh sách sách
- `/borrow` - Quản lý phiếu mượn
- `/admin/users` - Quản lý người dùng (Admin)
- `/books/manage` - Quản lý sách (Thủ thư)

## Tính năng Bảo mật

### 1. Hệ thống phân quyền RBAC
- Phân quyền dựa trên bit flags
- Kiểm tra quyền ở middleware
- Tách biệt rõ ràng quyền theo vai trò

### 2. Xác thực và phân quyền
- Session-based authentication
- CSRF protection
- Password hashing với bcrypt
- Account lockout sau nhiều lần đăng nhập sai

### 3. Validation
- Input validation với express-validator
- Sanitization dữ liệu đầu vào
- SQL injection prevention

### 4. Audit Trail
- Ghi nhận hoạt động trong bảng audit_logs
- Track user sessions
- Lưu lịch sử thay đổi

## Luồng hoạt động

### 1. Quản lý người dùng (Admin)
1. Admin đăng nhập hệ thống
2. Vào trang quản lý người dùng
3. Tạo/sửa/xóa người dùng
4. Phân quyền vai trò cho người dùng

### 2. Quản lý sách (Thủ thư)
1. Thủ thư đăng nhập hệ thống
2. Vào trang quản lý sách
3. Thêm/sửa/xóa sách và thể loại
4. Cập nhật số lượng sách

### 3. Mượn sách (Người dùng)
1. Người dùng đăng nhập
2. Tìm kiếm sách cần mượn
3. Tạo phiếu mượn với danh sách sách
4. Gửi phiếu mượn để chờ duyệt
5. Thủ thư duyệt phiếu mượn
6. Người dùng nhận sách

## Cấu hình

### Environment Variables
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=user_management
DB_USER=app_user
DB_PASSWORD=TMDTCT07N@12345678
SESSION_SECRET=your-session-secret
BCRYPT_ROUNDS=12
PASSWORD_EXPIRY_DAYS=60
MAX_LOGIN_ATTEMPTS=5
```

### Cơ sở dữ liệu
- PostgreSQL 13+
- Sử dụng connection pooling
- Backup tự động (có thể cấu hình)

## Lưu ý

1. **Bảo mật**: Đảm bảo thay đổi mật khẩu mặc định và cấu hình SSL trong production
2. **Performance**: Cân nhắc indexing cho các truy vấn phức tạp
3. **Backup**: Thiết lập backup định kỳ cho database
4. **Monitoring**: Theo dõi logs và performance metrics
5. **Validation**: Luôn validate dữ liệu ở cả client và server side

## Mở rộng

Hệ thống có thể mở rộng thêm:
- Tính năng trả sách và tính phí phạt
- Notification system
- Báo cáo thống kê chi tiết
- Mobile app API
- Integration với hệ thống khác
