const validator = require('validator');
const he = require('he'); // HTML entities encoding

/**
 * Sanitizer utility for input validation and encoding
 * Implements 3-layer security: Frontend -> Middleware -> Database
 */

// Dangerous characters that need special handling
const DANGEROUS_CHARS = {
    QUOTES: /["'`]/g,
    SQL_CHARS: /[;$\\]/g,
    SCRIPT_CHARS: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    HTML_TAGS: /<[^>]*>/g
};

// Special encoding maps
const ENCODING_MAP = {
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
    '$': '&#x24;',
    ';': '&#x3B;',
    '\\': '&#x5C;'
};

/**
 * Encode dangerous characters for safe storage
 * @param {string} input - Input string to encode
 * @returns {string} - Encoded string
 */
function encodeDangerousChars(input) {
    if (!input || typeof input !== 'string') return input;
    
    let encoded = input;
    
    // Encode specific dangerous characters
    for (const [char, encoding] of Object.entries(ENCODING_MAP)) {
        encoded = encoded.replace(new RegExp('\\' + char, 'g'), encoding);
    }
    
    return encoded;
}

/**
 * Decode previously encoded characters
 * @param {string} input - Encoded string
 * @returns {string} - Decoded string
 */
function decodeDangerousChars(input) {
    if (!input || typeof input !== 'string') return input;
    
    let decoded = input;
    
    // Decode specific characters (escape regex special characters)
    for (const [char, encoding] of Object.entries(ENCODING_MAP)) {
        const escapedEncoding = encoding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        decoded = decoded.replace(new RegExp(escapedEncoding, 'g'), char);
    }
    
    return decoded;
}

/**
 * Sanitize username input
 * Rules: No dots, encode dangerous chars, alphanumeric + _ - only
 * @param {string} username - Username to sanitize
 * @returns {object} - {isValid, sanitized, errors}
 */
function sanitizeUsername(username) {
    const errors = [];
    
    if (!username || typeof username !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Tên đăng nhập không hợp lệ'] };
    }
    
    // Trim whitespace
    let sanitized = username.trim().toLowerCase();
    
    // Check for dots (not allowed)
    if (sanitized.includes('.')) {
        errors.push('Tên đăng nhập không hợp lệ');
    }
    
    // Check for dangerous characters that need encoding
    const hasDangerousChars = /["'`$;\\]/.test(sanitized);
    if (hasDangerousChars) {
        sanitized = encodeDangerousChars(sanitized);
    }
    
    // Final validation: only allow alphanumeric, underscore, hyphen (and encoded chars)
    const allowedPattern = /^[a-zA-Z0-9_\-&#x;&quot;]*$/;
    if (!allowedPattern.test(sanitized)) {
        errors.push('Tên đăng nhập chứa ký tự không hợp lệ');
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors,
        hasEncoding: hasDangerousChars
    };
}

/**
 * Sanitize password input
 * Rules: Allow ,'" but encode them, block script injection
 * @param {string} password - Password to sanitize
 * @returns {object} - {isValid, sanitized, errors}
 */
function sanitizePassword(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Mật khẩu không hợp lệ'] };
    }
    
    let sanitized = password;
    
    // Check for script injection attempts
    if (DANGEROUS_CHARS.SCRIPT_CHARS.test(sanitized)) {
        errors.push('Mật khẩu chứa nội dung không hợp lệ');
    }
    
    // Encode dangerous characters while preserving password strength characters
    const hasDangerousChars = /["'`$;\\]/.test(sanitized);
    if (hasDangerousChars) {
        sanitized = encodeDangerousChars(sanitized);
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors,
        hasEncoding: hasDangerousChars
    };
}

/**
 * Sanitize email input
 * @param {string} email - Email to sanitize
 * @returns {object} - {isValid, sanitized, errors}
 */
function sanitizeEmail(email) {
    const errors = [];
    
    if (!email || typeof email !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Email không hợp lệ'] };
    }
    
    // Normalize email
    let sanitized = validator.normalizeEmail(email.trim());
    
    if (!sanitized) {
        errors.push('Định dạng email không hợp lệ');
        return { isValid: false, sanitized: email, errors };
    }
    
    // Additional encoding for dangerous characters
    const hasDangerousChars = /["'`$;\\]/.test(sanitized);
    if (hasDangerousChars) {
        sanitized = encodeDangerousChars(sanitized);
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors,
        hasEncoding: hasDangerousChars
    };
}

/**
 * Sanitize phone input
 * @param {string} phone - Phone to sanitize
 * @returns {object} - {isValid, sanitized, errors}
 */
function sanitizePhone(phone) {
    const errors = [];
    
    if (!phone) {
        return { isValid: true, sanitized: '', errors: [] };
    }
    
    if (typeof phone !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Số điện thoại không hợp lệ'] };
    }
    
    // Remove all non-numeric characters except +
    let sanitized = phone.replace(/[^\d+]/g, '');
    
    // Encode any remaining dangerous characters (shouldn't be any after cleaning)
    const hasDangerousChars = /["'`$;\\]/.test(sanitized);
    if (hasDangerousChars) {
        sanitized = encodeDangerousChars(sanitized);
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors,
        hasEncoding: hasDangerousChars
    };
}

/**
 * Sanitize address/text input
 * @param {string} text - Text to sanitize
 * @returns {object} - {isValid, sanitized, errors}
 */
function sanitizeText(text) {
    const errors = [];
    
    if (!text) {
        return { isValid: true, sanitized: '', errors: [] };
    }
    
    if (typeof text !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Dữ liệu không hợp lệ'] };
    }
    
    let sanitized = text.trim();
    
    // Remove HTML tags
    sanitized = sanitized.replace(DANGEROUS_CHARS.HTML_TAGS, '');
    
    // Check for script injection
    if (DANGEROUS_CHARS.SCRIPT_CHARS.test(sanitized)) {
        errors.push('Nội dung chứa mã không hợp lệ');
    }
    
    // Encode dangerous characters
    const hasDangerousChars = /["'`$;\\]/.test(sanitized);
    if (hasDangerousChars) {
        sanitized = encodeDangerousChars(sanitized);
    }
    
    // Final HTML entity encoding for additional safety
    sanitized = he.encode(sanitized, { allowUnsafeSymbols: false });
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors,
        hasEncoding: hasDangerousChars
    };
}

/**
 * Comprehensive input sanitizer
 * @param {object} inputData - Object containing form data
 * @param {object} fieldTypes - Object mapping field names to types
 * @returns {object} - {isValid, sanitizedData, errors}
 */
function sanitizeInputData(inputData, fieldTypes = {}) {
    const sanitizedData = {};
    const allErrors = {};
    let isValid = true;
    
    for (const [field, value] of Object.entries(inputData)) {
        const fieldType = fieldTypes[field] || 'text';
        let result;
        
        switch (fieldType) {
            case 'username':
                result = sanitizeUsername(value);
                break;
            case 'password':
                result = sanitizePassword(value);
                break;
            case 'email':
                result = sanitizeEmail(value);
                break;
            case 'phone':
                result = sanitizePhone(value);
                break;
            case 'text':
            default:
                result = sanitizeText(value);
                break;
        }
        
        sanitizedData[field] = result.sanitized;
        
        if (!result.isValid) {
            isValid = false;
            allErrors[field] = result.errors;
        }
    }
    
    return {
        isValid,
        sanitizedData,
        errors: allErrors
    };
}

/**
 * Check if input contains potentially dangerous patterns
 * @param {string} input - Input to check
 * @returns {boolean} - True if suspicious
 */
function isSuspiciousInput(input) {
    if (!input || typeof input !== 'string') return false;
    
    const suspiciousPatterns = [
        /union\s+select/i,
        /drop\s+table/i,
        /delete\s+from/i,
        /insert\s+into/i,
        /update\s+set/i,
        /script\s*>/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
}

module.exports = {
    encodeDangerousChars,
    decodeDangerousChars,
    sanitizeUsername,
    sanitizePassword,
    sanitizeEmail,
    sanitizePhone,
    sanitizeText,
    sanitizeInputData,
    isSuspiciousInput,
    DANGEROUS_CHARS,
    ENCODING_MAP
};
