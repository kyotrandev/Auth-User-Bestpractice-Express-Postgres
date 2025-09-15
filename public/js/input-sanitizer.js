/**
 * Frontend Input Sanitizer 
 * Real-time validation and sanitization for user inputs
 */

class InputSanitizer {
    constructor() {
        this.dangerousChars = /["'`$;\\]/;
        this.suspiciousPatterns = [
            /script\s*>/i,
            /javascript:/i,
            /vbscript:/i,
            /on\w+\s*=/i,
            /union\s+select/i,
            /drop\s+table/i,
            /delete\s+from/i,
            /insert\s+into/i
        ];
        
        this.init();
    }
    
    init() {
        // Auto-attach to all form inputs
        $(document).ready(() => {
            this.attachValidators();
        });
    }
    
    attachValidators() {
        // Username validation
        $('input[name="username"], #username').on('input keyup', (e) => {
            this.validateUsername(e.target);
        });
        
        // Password validation
        $('input[name="password"], #password').on('input keyup', (e) => {
            this.validatePassword(e.target);
        });
        
        // Email validation
        $('input[name="email"], #email').on('input keyup', (e) => {
            this.validateEmail(e.target);
        });
        
        // Phone validation
        $('input[name="phone"], #phone').on('input keyup', (e) => {
            this.validatePhone(e.target);
        });
        
        // General text inputs
        $('input[type="text"], textarea').not('[name="username"], [name="email"], [name="phone"]').on('input keyup', (e) => {
            this.validateText(e.target);
        });
        
        // Prevent paste of dangerous content
        $('input, textarea').on('paste', (e) => {
            setTimeout(() => {
                this.validateOnPaste(e.target);
            }, 10);
        });
    }
    
    validateUsername(element) {
        const value = element.value;
        const $element = $(element);
        
        if (!value) {
            this.clearFieldError($element);
            return true;
        }
        
        // Check for dots (not allowed in username)
        if (value.includes('.')) {
            this.showFieldError($element, 'Tên đăng nhập không hợp lệ');
            return false;
        }
        
        // Check for dangerous characters
        if (this.dangerousChars.test(value)) {
            this.showFieldError($element, 'Tên đăng nhập chứa ký tự không hợp lệ');
            return false;
        }
        
        // Check for suspicious patterns
        if (this.isSuspicious(value)) {
            this.showFieldError($element, 'Tên đăng nhập không hợp lệ');
            return false;
        }
        
        // Check length and pattern
        if (value.length > 0 && (value.length < 12 || value.length > 25)) {
            this.showFieldError($element, 'Tên đăng nhập phải có từ 12-25 ký tự');
            return false;
        }
        
        // Check character pattern (letters, numbers, underscore, hyphen only)
        const validPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
        if (value.length >= 12 && !validPattern.test(value)) {
            this.showFieldError($element, 'Tên đăng nhập không hợp lệ');
            return false;
        }
        
        this.clearFieldError($element);
        return true;
    }
    
    validatePassword(element) {
        const value = element.value;
        const $element = $(element);
        
        if (!value) {
            this.clearFieldError($element);
            return true;
        }
        
        // Check for script injection
        if (this.isSuspicious(value)) {
            this.showFieldError($element, 'Mật khẩu chứa nội dung không hợp lệ');
            return false;
        }
        
        // Password strength validation
        if (value.length > 0 && value.length < 12) {
            this.showFieldError($element, 'Mật khẩu phải có ít nhất 12 ký tự');
            return false;
        }
        
        // Complex password pattern (for new passwords)
        if (element.name === 'password' && value.length >= 12) {
            const hasLower = /[a-z]/.test(value);
            const hasUpper = /[A-Z]/.test(value);
            const hasNumber = /\d/.test(value);
            const hasSpecial = /[@$!%*?&,'".]/.test(value);
            
            if (!(hasLower && hasUpper && hasNumber && hasSpecial)) {
                this.showFieldError($element, 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt');
                return false;
            }
        }
        
        this.clearFieldError($element);
        return true;
    }
    
    validateEmail(element) {
        const value = element.value;
        const $element = $(element);
        
        if (!value) {
            this.clearFieldError($element);
            return true;
        }
        
        // Basic email pattern
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
            this.showFieldError($element, 'Định dạng email không hợp lệ');
            return false;
        }
        
        // Check for suspicious patterns
        if (this.isSuspicious(value)) {
            this.showFieldError($element, 'Email chứa nội dung không hợp lệ');
            return false;
        }
        
        this.clearFieldError($element);
        return true;
    }
    
    validatePhone(element) {
        const value = element.value;
        const $element = $(element);
        
        if (!value) {
            this.clearFieldError($element);
            return true;
        }
        
        // Remove all non-numeric characters except +
        const cleanValue = value.replace(/[^\d+]/g, '');
        
        // Update field value if it was cleaned
        if (cleanValue !== value) {
            element.value = cleanValue;
        }
        
        // Vietnamese phone pattern
        const phonePattern = /^(\+84|0)[35789][0-9]{8}$/;
        if (cleanValue && !phonePattern.test(cleanValue)) {
            this.showFieldError($element, 'Số điện thoại không hợp lệ');
            return false;
        }
        
        this.clearFieldError($element);
        return true;
    }
    
    validateText(element) {
        const value = element.value;
        const $element = $(element);
        
        if (!value) {
            this.clearFieldError($element);
            return true;
        }
        
        // Check for suspicious patterns
        if (this.isSuspicious(value)) {
            this.showFieldError($element, 'Nội dung chứa mã không hợp lệ');
            return false;
        }
        
        // Check for HTML tags
        if (/<[^>]*>/.test(value)) {
            this.showFieldError($element, 'Nội dung không được chứa mã HTML');
            return false;
        }
        
        this.clearFieldError($element);
        return true;
    }
    
    validateOnPaste(element) {
        const fieldType = this.getFieldType(element);
        
        switch (fieldType) {
            case 'username':
                this.validateUsername(element);
                break;
            case 'password':
                this.validatePassword(element);
                break;
            case 'email':
                this.validateEmail(element);
                break;
            case 'phone':
                this.validatePhone(element);
                break;
            default:
                this.validateText(element);
        }
    }
    
    getFieldType(element) {
        const name = element.name;
        const id = element.id;
        
        if (name === 'username' || id === 'username') return 'username';
        if (name === 'password' || id === 'password' || name === 'newPassword' || name === 'currentPassword') return 'password';
        if (name === 'email' || id === 'email') return 'email';
        if (name === 'phone' || id === 'phone') return 'phone';
        
        return 'text';
    }
    
    isSuspicious(value) {
        return this.suspiciousPatterns.some(pattern => pattern.test(value));
    }
    
    showFieldError($element, message) {
        $element.addClass('is-invalid');
        
        // Find or create feedback element
        let $feedback = $element.siblings('.invalid-feedback');
        if ($feedback.length === 0) {
            // Handle input groups (like password with toggle button)
            const $parent = $element.closest('.input-group');
            if ($parent.length > 0) {
                $feedback = $parent.siblings('.invalid-feedback');
                if ($feedback.length === 0) {
                    $feedback = $('<div class="invalid-feedback"></div>');
                    $parent.after($feedback);
                }
            } else {
                $feedback = $('<div class="invalid-feedback"></div>');
                $element.after($feedback);
            }
        }
        
        $feedback.text(message).show();
        
        // Add shake animation
        $element.addClass('shake-animation');
        setTimeout(() => {
            $element.removeClass('shake-animation');
        }, 600);
    }
    
    clearFieldError($element) {
        $element.removeClass('is-invalid');
        $element.siblings('.invalid-feedback').hide();
        
        // Also check input groups
        const $parent = $element.closest('.input-group');
        if ($parent.length > 0) {
            $parent.siblings('.invalid-feedback').hide();
        }
    }
    
    validateForm($form) {
        let isValid = true;
        
        $form.find('input, textarea').each((index, element) => {
            const fieldType = this.getFieldType(element);
            let fieldValid = true;
            
            switch (fieldType) {
                case 'username':
                    fieldValid = this.validateUsername(element);
                    break;
                case 'password':
                    fieldValid = this.validatePassword(element);
                    break;
                case 'email':
                    fieldValid = this.validateEmail(element);
                    break;
                case 'phone':
                    fieldValid = this.validatePhone(element);
                    break;
                default:
                    fieldValid = this.validateText(element);
            }
            
            if (!fieldValid) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    sanitizeFormData($form) {
        const formData = {};
        
        $form.find('input, textarea, select').each((index, element) => {
            if (element.name) {
                let value = element.value;
                
                // Basic sanitization - dangerous chars will be handled by backend
                if (value && typeof value === 'string') {
                    // Remove obvious HTML tags
                    value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                    value = value.trim();
                }
                
                formData[element.name] = value;
            }
        });
        
        return formData;
    }
}

// Initialize the sanitizer
const inputSanitizer = new InputSanitizer();

// Make it globally available
window.InputSanitizer = inputSanitizer;
