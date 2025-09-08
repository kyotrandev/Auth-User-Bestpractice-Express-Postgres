-- Connect to the database
\c user_management;


INSERT INTO users (username, email, password_hash, phone, address, is_active)
VALUES 
    ('admin_user123', 'admin@example.com', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0901234567', 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', true),
    ('john_doe12345', 'john@example.com', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0912345678', '123 Nguyễn Trãi, Thanh Xuân, Hà Nội', true),
    ('mary_smith123', 'mary@example.com', '$2a$12$R8jF0zRzaW.vWi.Kk2cmfOWzC8HOY0mHRGDK2ayAKn5KlbzOqI.7C', '0987654321', '456 Lê Duẩn, Hoàn Kiếm, Hà Nội', true)
ON CONFLICT (username) DO NOTHING;
