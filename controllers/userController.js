const User = require('../models/User');
const nodemailer = require('nodemailer');

/**
 * User Controller - Xử lý logic nghiệp vụ
 */
class UserController {

    /**
     * Đăng ký tài khoản mới
     */
    static async register(req, res) {
        try {
            const { username, password, email, phone, address } = req.body;

            // Kiểm tra username đã tồn tại
            const existingUsername = await User.usernameExists(username);
            if (existingUsername) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên đăng nhập đã được sử dụng'
                });
            }

            // Kiểm tra email đã tồn tại
            const existingEmail = await User.emailExists(email);
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng'
                });
            }

            // Tạo user mới
            const newUser = await User.create({
                username,
                password,
                email,
                phone,
                address
            });

            res.status(201).json({
                success: true,
                message: 'Đăng ký tài khoản thành công',
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email
                }
            });

        } catch (error) {
            console.error('Lỗi đăng ký:', error);

            // Xử lý lỗi database constraint
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'Tên đăng nhập hoặc email đã được sử dụng'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi đăng ký tài khoản'
            });
        }
    }

    /**
     * Đăng nhập
     */
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            // Tìm user theo username
            const user = await User.findByUsername(username);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Tên đăng nhập hoặc mật khẩu không đúng'
                });
            }

            // Kiểm tra account có bị khóa không
            const isLocked = await User.isAccountLocked(user.id);
            if (isLocked) {
                return res.status(423).json({
                    success: false,
                    message: 'Tài khoản đã bị khóa do quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.'
                });
            }

            // Kiểm tra mật khẩu
            const isValidPassword = await User.comparePassword(password, user.password_hash);
            if (!isValidPassword) {
                // Tăng số lần đăng nhập thất bại
                await User.incrementFailedAttempts(user.id);

                return res.status(401).json({
                    success: false,
                    message: 'Tên đăng nhập hoặc mật khẩu không đúng'
                });
            }

            // Kiểm tra mật khẩu có hết hạn không
            const isPasswordExpired = User.isPasswordExpired(user.password_created_at);
            if (isPasswordExpired) {
                return res.status(200).json({
                    success: true,
                    message: 'Mật khẩu đã hết hạn. Vui lòng đổi mật khẩu.',
                    passwordExpired: true,
                    user: {
                        id: user.id,
                        username: user.username
                    }
                });
            }

            // Cập nhật last login và reset failed attempts
            await User.updateLastLogin(user.id);

            // Lưu thông tin user vào session
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role_id: user.role_id,
                user_type: user.user_type,
                role_name: user.role_name,
                role_permissions: user.role_permissions
            };

            res.status(200).json({
                success: true,
                message: 'Đăng nhập thành công',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('Lỗi đăng nhập:', error);

            // Kiểm tra lỗi kết nối database
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return res.status(500).json({
                    success: false,
                    message: 'Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.',
                    errors: ['Lỗi kết nối cơ sở dữ liệu. Hãy đảm bảo PostgreSQL đang chạy.']
                });
            }

            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi đăng nhập'
            });
        }
    }

    /**
     * Đăng xuất
     */
    static async logout(req, res) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Có lỗi xảy ra khi đăng xuất'
                    });
                }

                res.clearCookie('connect.sid');
                res.status(200).json({
                    success: true,
                    message: 'Đăng xuất thành công'
                });
            });
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi đăng xuất'
            });
        }
    }

    /**
     * Thay đổi mật khẩu
     */
    static async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.session.user.id;

            // Lấy thông tin user hiện tại
            const user = await User.findByUsername(req.session.user.username);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            // Kiểm tra mật khẩu hiện tại
            const isValidCurrentPassword = await User.comparePassword(currentPassword, user.password_hash);
            if (!isValidCurrentPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Mật khẩu hiện tại không đúng'
                });
            }

            // Đổi mật khẩu
            await User.changePassword(userId, newPassword);

            res.status(200).json({
                success: true,
                message: 'Đổi mật khẩu thành công'
            });

        } catch (error) {
            console.error('Lỗi đổi mật khẩu:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi đổi mật khẩu'
            });
        }
    }

    /**
     * Quên mật khẩu - Gửi email reset
     */
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const result = await User.createPasswordResetToken(email);
            if (!result) {
                // Không tiết lộ email có tồn tại hay không
                return res.status(200).json({
                    success: true,
                    message: 'Nếu email tồn tại, chúng tôi đã gửi link reset mật khẩu'
                });
            }

            const { token, user } = result;

            // Cấu hình email
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Reset mật khẩu - User Management System',
                html: `
                    <h2>Reset mật khẩu</h2>
                    <p>Xin chào ${user.username},</p>
                    <p>Bạn đã yêu cầu reset mật khẩu. Click vào link bên dưới để reset:</p>
                    <a href="${resetUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset mật khẩu</a>
                    <p>Link này sẽ hết hạn sau 1 giờ.</p>
                    <p>Nếu bạn không yêu cầu reset mật khẩu, vui lòng bỏ qua email này.</p>
                `
            };

            await transporter.sendMail(mailOptions);

            res.status(200).json({
                success: true,
                message: 'Đã gửi link reset mật khẩu đến email của bạn'
            });

        } catch (error) {
            console.error('Lỗi quên mật khẩu:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xử lý yêu cầu'
            });
        }
    }

    /**
     * Reset mật khẩu với token
     */
    static async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            await User.usePasswordResetToken(token, newPassword);

            res.status(200).json({
                success: true,
                message: 'Reset mật khẩu thành công'
            });

        } catch (error) {
            console.error('Lỗi reset mật khẩu:', error);

            if (error.message === 'Token không hợp lệ hoặc đã hết hạn') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi reset mật khẩu'
            });
        }
    }

    /**
     * Lấy thông tin profile
     */
    static async getProfile(req, res) {
        try {
            const userId = req.session.user.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông tin user'
                });
            }

            res.status(200).json({
                success: true,
                user: user
            });

        } catch (error) {
            console.error('Lỗi lấy profile:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy thông tin profile'
            });
        }
    }
}

module.exports = UserController;