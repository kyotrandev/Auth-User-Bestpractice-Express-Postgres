const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

/**
 * Admin Controller - Quản lý người dùng và hệ thống
 */
class AdminController {

    /**
     * Lấy danh sách tất cả người dùng
     */
    static async getAllUsers(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                search = '', 
                role_id = null, 
                user_type = null 
            } = req.query;

            const offset = (page - 1) * limit;
            const options = { 
                limit: parseInt(limit), 
                offset, 
                search, 
                role_id: role_id ? parseInt(role_id) : null, 
                user_type 
            };

            const [users, total] = await Promise.all([
                User.getAll(options),
                User.count(options)
            ]);

            const totalPages = Math.ceil(total / limit);

            res.status(200).json({
                success: true,
                data: {
                    users,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Lỗi lấy danh sách người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách người dùng'
            });
        }
    }

    /**
     * Lấy thông tin chi tiết một người dùng
     */
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(parseInt(id));

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            res.status(200).json({
                success: true,
                data: { user }
            });

        } catch (error) {
            console.error('Lỗi lấy thông tin người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy thông tin người dùng'
            });
        }
    }

    /**
     * Tạo người dùng mới
     */
    static async createUser(req, res) {
        try {
            const { username, email, password, phone, address, role_id, user_type } = req.body;

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

            // Kiểm tra vai trò có tồn tại
            if (role_id) {
                const role = await Role.findById(role_id);
                if (!role) {
                    return res.status(400).json({
                        success: false,
                        message: 'Vai trò không tồn tại'
                    });
                }
            }

            const newUser = await User.createUser({
                username,
                email,
                password,
                phone,
                address,
                role_id,
                user_type
            });

            res.status(201).json({
                success: true,
                message: 'Tạo người dùng thành công',
                data: { user: newUser }
            });

        } catch (error) {
            console.error('Lỗi tạo người dùng:', error);

            // Xử lý lỗi database constraint
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'Tên đăng nhập hoặc email đã được sử dụng'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo người dùng'
            });
        }
    }

    /**
     * Cập nhật thông tin người dùng
     */
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { username, email, phone, address, role_id, user_type, is_active } = req.body;

            // Kiểm tra người dùng có tồn tại
            const existingUser = await User.findById(parseInt(id));
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            // Kiểm tra username đã tồn tại (nếu thay đổi)
            if (username && username !== existingUser.username) {
                const existingUsername = await User.usernameExists(username);
                if (existingUsername) {
                    return res.status(400).json({
                        success: false,
                        message: 'Tên đăng nhập đã được sử dụng'
                    });
                }
            }

            // Kiểm tra email đã tồn tại (nếu thay đổi)
            if (email && email !== existingUser.email) {
                const existingEmail = await User.emailExists(email);
                if (existingEmail) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email đã được sử dụng'
                    });
                }
            }

            // Kiểm tra vai trò có tồn tại
            if (role_id) {
                const role = await Role.findById(role_id);
                if (!role) {
                    return res.status(400).json({
                        success: false,
                        message: 'Vai trò không tồn tại'
                    });
                }
            }

            const updatedUser = await User.updateUser(parseInt(id), {
                username,
                email,
                phone,
                address,
                role_id,
                user_type,
                is_active
            });

            res.status(200).json({
                success: true,
                message: 'Cập nhật thông tin người dùng thành công',
                data: { user: updatedUser }
            });

        } catch (error) {
            console.error('Lỗi cập nhật người dùng:', error);

            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'Tên đăng nhập hoặc email đã được sử dụng'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật người dùng'
            });
        }
    }

    /**
     * Xóa người dùng (soft delete)
     */
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Không cho phép xóa chính mình
            if (parseInt(id) === req.session.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể xóa tài khoản của chính mình'
                });
            }

            const deleted = await User.deleteUser(parseInt(id));

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Xóa người dùng thành công'
            });

        } catch (error) {
            console.error('Lỗi xóa người dùng:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa người dùng'
            });
        }
    }

    /**
     * Đặt lại mật khẩu cho người dùng
     */
    static async resetUserPassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;

            if (!newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập mật khẩu mới'
                });
            }

            const success = await User.resetUserPassword(parseInt(id), newPassword);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Đặt lại mật khẩu thành công'
            });

        } catch (error) {
            console.error('Lỗi đặt lại mật khẩu:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi đặt lại mật khẩu'
            });
        }
    }

    /**
     * Mở khóa tài khoản người dùng
     */
    static async unlockUser(req, res) {
        try {
            const { id } = req.params;

            const success = await User.unlockUser(parseInt(id));

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Mở khóa tài khoản thành công'
            });

        } catch (error) {
            console.error('Lỗi mở khóa tài khoản:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi mở khóa tài khoản'
            });
        }
    }

    /**
     * Lấy danh sách vai trò
     */
    static async getAllRoles(req, res) {
        try {
            const roles = await Role.getAll();

            res.status(200).json({
                success: true,
                data: { roles }
            });

        } catch (error) {
            console.error('Lỗi lấy danh sách vai trò:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách vai trò'
            });
        }
    }

    /**
     * Lấy danh sách quyền
     */
    static async getAllPermissions(req, res) {
        try {
            const permissions = await Permission.getAll();

            res.status(200).json({
                success: true,
                data: { permissions }
            });

        } catch (error) {
            console.error('Lỗi lấy danh sách quyền:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách quyền'
            });
        }
    }

    /**
     * Lấy thống kê hệ thống
     */
    static async getSystemStatistics(req, res) {
        try {
            const [userStats] = await Promise.all([
                User.getUserStatistics()
            ]);

            res.status(200).json({
                success: true,
                data: {
                    usersByRole: userStats
                }
            });

        } catch (error) {
            console.error('Lỗi lấy thống kê hệ thống:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy thống kê hệ thống'
            });
        }
    }
}

module.exports = AdminController;
