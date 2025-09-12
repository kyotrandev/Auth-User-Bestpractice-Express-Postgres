    const { pool } = require('../config/database');

/**
 * Role Model - Quản lý vai trò người dùng
 */
class Role {
    constructor(roleData) {
        this.id = roleData.id;
        this.name = roleData.name;
        this.display_name = roleData.display_name;
        this.description = roleData.description;
        this.permissions = roleData.permissions;
        this.is_active = roleData.is_active;
        this.created_at = roleData.created_at;
        this.updated_at = roleData.updated_at;
    }

    /**
     * Lấy tất cả vai trò
     */
    static async getAll() {
        try {
            const query = `
                SELECT id, name, display_name, description, permissions, is_active, created_at, updated_at
                FROM roles 
                WHERE is_active = true 
                ORDER BY id ASC
            `;
            const result = await pool.query(query);
            return result.rows.map(row => new Role(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm vai trò theo ID
     */
    static async findById(id) {
        try {
            const query = `
                SELECT id, name, display_name, description, permissions, is_active, created_at, updated_at
                FROM roles 
                WHERE id = $1 AND is_active = true
            `;
            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return new Role(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm vai trò theo tên
     */
    static async findByName(name) {
        try {
            const query = `
                SELECT id, name, display_name, description, permissions, is_active, created_at, updated_at
                FROM roles 
                WHERE name = $1 AND is_active = true
            `;
            const result = await pool.query(query, [name]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return new Role(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tạo vai trò mới
     */
    static async create(roleData) {
        try {
            const { name, display_name, description, permissions } = roleData;
            
            const query = `
                INSERT INTO roles (name, display_name, description, permissions)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, display_name, description, permissions, is_active, created_at, updated_at
            `;
            
            const values = [name, display_name, description, permissions || 0];
            const result = await pool.query(query, values);
            
            return new Role(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cập nhật vai trò
     */
    static async update(id, updateData) {
        try {
            const { name, display_name, description, permissions } = updateData;
            
            const query = `
                UPDATE roles 
                SET name = COALESCE($2, name),
                    display_name = COALESCE($3, display_name),
                    description = COALESCE($4, description),
                    permissions = COALESCE($5, permissions),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_active = true
                RETURNING id, name, display_name, description, permissions, is_active, created_at, updated_at
            `;
            
            const values = [id, name, display_name, description, permissions];
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return new Role(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa vai trò (soft delete)
     */
    static async delete(id) {
        try {
            const query = `
                UPDATE roles 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id
            `;
            
            const result = await pool.query(query, [id]);
            return result.rows.length > 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Kiểm tra vai trò có quyền cụ thể không
     */
    static hasPermission(rolePermissions, requiredPermission) {
        return (rolePermissions & requiredPermission) === requiredPermission;
    }

    /**
     * Thêm quyền vào vai trò
     */
    static async addPermission(roleId, permissionBitValue) {
        try {
            const query = `
                UPDATE roles 
                SET permissions = permissions | $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING permissions
            `;
            
            const result = await pool.query(query, [roleId, permissionBitValue]);
            return result.rows.length > 0 ? result.rows[0].permissions : null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa quyền khỏi vai trò
     */
    static async removePermission(roleId, permissionBitValue) {
        try {
            const query = `
                UPDATE roles 
                SET permissions = permissions & ~$2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING permissions
            `;
            
            const result = await pool.query(query, [roleId, permissionBitValue]);
            return result.rows.length > 0 ? result.rows[0].permissions : null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách quyền của vai trò
     */
    static async getRolePermissions(roleId) {
        try {
            const query = `
                SELECT r.permissions, p.name, p.display_name, p.description, p.bit_value, p.module
                FROM roles r
                CROSS JOIN permissions p
                WHERE r.id = $1 AND (r.permissions & p.bit_value) = p.bit_value
                ORDER BY p.module, p.bit_value
            `;
            
            const result = await pool.query(query, [roleId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Role;
