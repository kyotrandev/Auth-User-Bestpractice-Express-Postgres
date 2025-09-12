const { pool } = require('../config/database');

/**
 * Permission Model - Quản lý quyền hệ thống
 */
class Permission {
    constructor(permissionData) {
        this.id = permissionData.id;
        this.name = permissionData.name;
        this.display_name = permissionData.display_name;
        this.description = permissionData.description;
        this.bit_value = permissionData.bit_value;
        this.module = permissionData.module;
        this.created_at = permissionData.created_at;
    }

    /**
     * Lấy tất cả quyền
     */
    static async getAll() {
        try {
            const query = `
                SELECT id, name, display_name, description, bit_value, module, created_at
                FROM permissions 
                ORDER BY module, bit_value ASC
            `;
            const result = await pool.query(query);
            return result.rows.map(row => new Permission(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy quyền theo module
     */
    static async getByModule(module) {
        try {
            const query = `
                SELECT id, name, display_name, description, bit_value, module, created_at
                FROM permissions 
                WHERE module = $1
                ORDER BY bit_value ASC
            `;
            const result = await pool.query(query, [module]);
            return result.rows.map(row => new Permission(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm quyền theo tên
     */
    static async findByName(name) {
        try {
            const query = `
                SELECT id, name, display_name, description, bit_value, module, created_at
                FROM permissions 
                WHERE name = $1
            `;
            const result = await pool.query(query, [name]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return new Permission(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm quyền theo bit value
     */
    static async findByBitValue(bitValue) {
        try {
            const query = `
                SELECT id, name, display_name, description, bit_value, module, created_at
                FROM permissions 
                WHERE bit_value = $1
            `;
            const result = await pool.query(query, [bitValue]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return new Permission(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách module duy nhất
     */
    static async getModules() {
        try {
            const query = `
                SELECT DISTINCT module 
                FROM permissions 
                ORDER BY module
            `;
            const result = await pool.query(query);
            return result.rows.map(row => row.module);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Chuyển đổi mảng tên quyền thành bit value tổng
     */
    static async permissionNamesToBitValue(permissionNames) {
        try {
            if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
                return 0;
            }

            const query = `
                SELECT SUM(bit_value) as total_permissions
                FROM permissions 
                WHERE name = ANY($1::text[])
            `;
            
            const result = await pool.query(query, [permissionNames]);
            return parseInt(result.rows[0].total_permissions) || 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Chuyển đổi bit value tổng thành mảng quyền
     */
    static async bitValueToPermissions(totalBitValue) {
        try {
            const query = `
                SELECT name, display_name, description, bit_value, module
                FROM permissions 
                WHERE (${totalBitValue} & bit_value) = bit_value
                ORDER BY module, bit_value
            `;
            
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Kiểm tra quyền dựa trên bit flags
     */
    static hasPermission(userPermissions, requiredPermission) {
        return (userPermissions & requiredPermission) === requiredPermission;
    }

    /**
     * Định nghĩa các quyền cơ bản
     */
    static get PERMISSIONS() {
        return {
            // User Management
            USERS_CREATE: 1,
            USERS_READ: 2,
            USERS_UPDATE: 4,
            USERS_DELETE: 8,

            // Book Management
            BOOKS_CREATE: 16,
            BOOKS_READ: 32,
            BOOKS_UPDATE: 64,
            BOOKS_DELETE: 128,

            // Category Management
            CATEGORIES_CREATE: 256,
            CATEGORIES_READ: 512,
            CATEGORIES_UPDATE: 1024,
            CATEGORIES_DELETE: 2048,

            // Borrow Management
            BORROW_CREATE: 4096,
            BORROW_READ: 8192,
            BORROW_UPDATE: 16384,
            BORROW_DELETE: 32768,
            BORROW_APPROVE: 65536,
            BORROW_RETURN: 131072,
            BORROW_VIEW_ALL: 262144,
            BORROW_MANAGE_OVERDUE: 524288,

            // System Management
            SYSTEM_ADMIN: 1048576,
            SYSTEM_VIEW_LOGS: 2097152,
            SYSTEM_BACKUP: 4194304,
            SYSTEM_SETTINGS: 8388608
        };
    }
}

module.exports = Permission;
