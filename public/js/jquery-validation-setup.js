/**
 * jQuery Validation setup for form validation
 */

$(document).ready(function() {
    // Thiết lập jQuery Validate
    if ($.validator) {
        // Thêm các phương thức validation tùy chỉnh
        $.validator.addMethod('strongPassword', function(value, element) {
            return this.optional(element) || 
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(value);
        }, 'Mật khẩu phải chứa ít nhất: 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt');
        
        $.validator.addMethod('validUsername', function(value, element) {
            return this.optional(element) || /^[a-zA-Z][a-zA-Z0-9_-]{11,24}$/.test(value);
        }, 'Tên đăng nhập phải bắt đầu bằng chữ cái, chỉ chứa chữ cái, số, gạch ngang và gạch dưới');
        
        $.validator.addMethod('validPhone', function(value, element) {
            return this.optional(element) || /^(\+84|0)[35789][0-9]{8}$/.test(value);
        }, 'Số điện thoại không hợp lệ');
        
        // Cấu hình mặc định cho validator
        $.validator.setDefaults({
            errorElement: 'div',
            errorClass: 'invalid-feedback',
            errorPlacement: function(error, element) {
                if (element.attr('type') === 'checkbox') {
                    error.insertAfter(element.closest('.form-check'));
                } else if (element.hasClass('form-control') && element.next('.input-group-append').length) {
                    error.insertAfter(element.closest('.input-group'));
                } else if (element.parent('.input-group').length) {
                    error.insertAfter(element.parent());
                } else {
                    error.insertAfter(element);
                }
            },
            highlight: function(element, errorClass, validClass) {
                $(element).addClass('is-invalid').removeClass('is-valid');
                
                // Hiệu ứng rung lắc cho phần tử lỗi
                $(element).css('animation', 'none');
                setTimeout(function() {
                    $(element).css('animation', 'shake 0.6s cubic-bezier(.36,.07,.19,.97) both');
                }, 10);
            },
            unhighlight: function(element, errorClass, validClass) {
                $(element).removeClass('is-invalid');
                if ($(element).val()) {
                    $(element).addClass('is-valid');
                }
            },
            success: function(label, element) {
                $(element).addClass('is-valid').removeClass('is-invalid');
            }
        });
    }
    
    // Khởi tạo validation cho form đăng ký
    if ($('#registerForm').length) {
        $('#registerForm').validate({
            // Quy tắc validation
            rules: {
                username: {
                    required: true,
                    validUsername: true,
                    minlength: 12,
                    maxlength: 25
                },
                email: {
                    required: true,
                    email: true,
                    maxlength: 255
                },
                password: {
                    required: true,
                    minlength: 12,
                    strongPassword: true
                },
                confirmPassword: {
                    required: true,
                    equalTo: '#password'
                },
                phone: {
                    validPhone: true
                },
                address: {
                    maxlength: 500
                },
                agreeTerms: {
                    required: true
                }
            },
            
            // Thông báo lỗi tùy chỉnh
            messages: {
                username: {
                    required: 'Vui lòng nhập tên đăng nhập',
                    minlength: 'Tên đăng nhập phải có độ dài từ 12-25 ký tự',
                    maxlength: 'Tên đăng nhập phải có độ dài từ 12-25 ký tự'
                },
                email: {
                    required: 'Vui lòng nhập email',
                    email: 'Email không hợp lệ',
                    maxlength: 'Email không được vượt quá 255 ký tự'
                },
                password: {
                    required: 'Vui lòng nhập mật khẩu',
                    minlength: 'Mật khẩu phải có ít nhất 12 ký tự'
                },
                confirmPassword: {
                    required: 'Vui lòng nhập lại mật khẩu',
                    equalTo: 'Mật khẩu nhập lại không khớp'
                },
                address: {
                    maxlength: 'Địa chỉ không được vượt quá 500 ký tự'
                },
                agreeTerms: {
                    required: 'Bạn phải đồng ý với điều khoản sử dụng để tiếp tục'
                }
            },
            
            // Xử lý khi form hợp lệ
            submitHandler: function(form) {
                // Ẩn thông báo lỗi từ server
                $('#serverErrors').addClass('d-none');
                $('#errorList').empty();
                
                // Lấy dữ liệu form
                const formData = $(form).serializeArray();
                const data = {};
                formData.forEach(item => {
                    data[item.name] = item.value;
                });
                
                // Gửi request AJAX
                $.ajax({
                    url: '/api/auth/register',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(data),
                    headers: {
                        'CSRF-Token': $('input[name="_csrf"]').val()
                    },
                    success: function(response) {
                        if (response.success) {
                            showAlert('success', 'Đăng ký thành công! Vui lòng đăng nhập.');
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 2000);
                        } else {
                            handleServerErrors(response);
                        }
                    },
                    error: function(xhr) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            handleServerErrors(response);
                        } catch (e) {
                            showAlert('danger', 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
                        }
                    }
                });
                
                return false; // Ngăn form submit mặc định
            }
        });
    }
    
    // Xử lý hiển thị/ẩn mật khẩu
    $('#togglePassword').on('click', function() {
        const passwordInput = $('#password');
        const type = passwordInput.attr('type') === 'password' ? 'text' : 'password';
        passwordInput.attr('type', type);
        $(this).find('i').toggleClass('fa-eye fa-eye-slash');
    });
    
    $('#toggleConfirmPassword').on('click', function() {
        const confirmPasswordInput = $('#confirmPassword');
        const type = confirmPasswordInput.attr('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.attr('type', type);
        $(this).find('i').toggleClass('fa-eye fa-eye-slash');
    });
    
    // Kiểm tra độ mạnh mật khẩu
    $('#password').on('input', function() {
        const password = $(this).val();
        let strength = 0;
        
        // Length check
        if (password.length >= 12) strength += 25;
        
        // Character variety checks
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[a-z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 10;
        
        // Update strength indicator
        $('#passwordStrength').css('width', strength + '%');
        
        // Set color based on strength
        if (strength < 40) {
            $('#passwordStrength').removeClass().addClass('progress-bar bg-danger');
            $('#strengthText').text('Yếu');
        } else if (strength < 70) {
            $('#passwordStrength').removeClass().addClass('progress-bar bg-warning');
            $('#strengthText').text('Trung bình');
        } else {
            $('#passwordStrength').removeClass().addClass('progress-bar bg-success');
            $('#strengthText').text('Mạnh');
        }
    });
});

// Xử lý lỗi từ server
function handleServerErrors(response) {
    if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
        // Xóa các lỗi cũ
        $('#errorList').empty();
        
        // Thêm từng lỗi vào danh sách và hiển thị lỗi trên form
        response.errors.forEach(error => {
            // Thêm vào danh sách lỗi
            $('<li>').text(error).appendTo('#errorList');
            
            // Hiển thị lỗi trên trường tương ứng
            if (error.includes('Tên đăng nhập')) {
                $('#username').addClass('is-invalid');
                $('#username').next('.invalid-feedback').text(error).show();
            } else if (error.includes('Email')) {
                $('#email').addClass('is-invalid');
                $('#email').next('.invalid-feedback').text(error).show();
            } else if (error.includes('Mật khẩu') && !error.includes('nhập lại')) {
                $('#password').addClass('is-invalid');
                $('#password').closest('.input-group').next('.invalid-feedback').text(error).show();
            } else if (error.includes('Xác nhận mật khẩu') || error.includes('nhập lại')) {
                $('#confirmPassword').addClass('is-invalid');
                $('#confirmPassword').closest('.input-group').next('.invalid-feedback').text(error).show();
            } else if (error.includes('điện thoại')) {
                $('#phone').addClass('is-invalid');
                $('#phone').next('.invalid-feedback').text(error).show();
            } else if (error.includes('Địa chỉ')) {
                $('#address').addClass('is-invalid');
                $('#address').next('.invalid-feedback').text(error).show();
            }
        });
        
        // Hiển thị alert box
        $('#serverErrors').removeClass('d-none');
        
        // Hiệu ứng nhấp nháy để thu hút sự chú ý
        $('#serverErrors').css('animation', 'none');
        setTimeout(() => {
            $('#serverErrors').css('animation', 'shake 0.6s cubic-bezier(.36,.07,.19,.97) both');
        }, 10);
        
        // Cuộn lên đầu form để người dùng thấy lỗi
        $('html, body').animate({
            scrollTop: $('#serverErrors').offset().top - 100
        }, 500);
    } else {
        // Nếu không có lỗi cụ thể, hiển thị thông báo chung
        showAlert('danger', response.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
}

// Hiển thị thông báo
function showAlert(type, message) {
    const alertContainer = $('#alertContainer');
    const alert = $('<div>')
        .addClass(`alert alert-${type} alert-dismissible fade show`)
        .html(`
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `);
    
    alertContainer.append(alert);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        alert.removeClass('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}
