/**
 * Security Test Script
 * Tests the 3-layer sanitization system against various attack vectors
 */

const { 
    sanitizeInputData, 
    encodeDangerousChars, 
    isSuspiciousInput,
    decodeDangerousChars 
} = require('../utils/sanitizer');

console.log('='.repeat(60));
console.log('SECURITY TEST - 3-LAYER SANITIZATION SYSTEM');
console.log('='.repeat(60));

// Test cases for various attack vectors
const testCases = [
    {
        name: "Basic SQL Injection Attempt",
        input: {
            username: "admin'; DROP TABLE users; --",
            password: "password"
        },
        fieldTypes: { username: 'username', password: 'password' }
    },
    {
        name: "Script Injection in Username",
        input: {
            username: "<script>alert('xss')</script>",
            password: "Test123!"
        },
        fieldTypes: { username: 'username', password: 'password' }
    },
    {
        name: "Special Characters in Password",
        input: {
            username: "validuser123",
            password: "MyP@ssw0rd!'\",$"
        },
        fieldTypes: { username: 'username', password: 'password' }
    },
    {
        name: "Username with Dots (Should Fail)",
        input: {
            username: "user.name@domain",
            password: "ValidPass123!"
        },
        fieldTypes: { username: 'username', password: 'password' }
    },
    {
        name: "Email with SQL Injection",
        input: {
            email: "test@domain.com'; UPDATE users SET password='hacked' WHERE 1=1; --",
            username: "testuser12345"
        },
        fieldTypes: { email: 'email', username: 'username' }
    },
    {
        name: "Phone with Script",
        input: {
            phone: "090123456<script>alert('phone')</script>",
            username: "phoneuser12345"
        },
        fieldTypes: { phone: 'phone', username: 'username' }
    },
    {
        name: "Address with HTML Tags",
        input: {
            address: "123 Main St <img src=x onerror=alert('xss')>",
            username: "addressuser12345"
        },
        fieldTypes: { address: 'text', username: 'username' }
    },
    {
        name: "Union Select Attack",
        input: {
            username: "admin' UNION SELECT password FROM users WHERE '1'='1",
            password: "password"
        },
        fieldTypes: { username: 'username', password: 'password' }
    },
    {
        name: "Legitimate User with Special Chars",
        input: {
            username: "legitimateuser123",
            password: "MyStr0ng!P@ssw0rd",
            email: "user@example.com",
            phone: "0901234567",
            address: "123 Main Street, City"
        },
        fieldTypes: { 
            username: 'username', 
            password: 'password',
            email: 'email',
            phone: 'phone',
            address: 'text'
        }
    }
];

// Run tests
testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log('-'.repeat(40));
    
    console.log('INPUT:', JSON.stringify(testCase.input, null, 2));
    
    // Test sanitization
    const result = sanitizeInputData(testCase.input, testCase.fieldTypes);
    
    console.log('RESULT:');
    console.log('  Valid:', result.isValid);
    console.log('  Sanitized:', JSON.stringify(result.sanitizedData, null, 2));
    
    if (!result.isValid) {
        console.log('  Errors:', result.errors);
    }
    
    // Test suspicious input detection
    for (const [field, value] of Object.entries(testCase.input)) {
        if (value && isSuspiciousInput(value)) {
            console.log(`  🚨 SUSPICIOUS: ${field} = "${value}"`);
        }
    }
    
    // Test encoding/decoding
    for (const [field, value] of Object.entries(testCase.input)) {
        if (value && typeof value === 'string') {
            const encoded = encodeDangerousChars(value);
            const decoded = decodeDangerousChars(encoded);
            
            if (encoded !== value) {
                console.log(`  ENCODING: ${field}`);
                console.log(`    Original: "${value}"`);
                console.log(`    Encoded:  "${encoded}"`);
                console.log(`    Decoded:  "${decoded}"`);
            }
        }
    }
});

// Test dangerous character encoding specifically
console.log('\n' + '='.repeat(60));
console.log('DANGEROUS CHARACTER ENCODING TESTS');
console.log('='.repeat(60));

const dangerousChars = ['"', "'", '`', '$', ';', '\\'];
dangerousChars.forEach(char => {
    const testString = `test${char}string`;
    const encoded = encodeDangerousChars(testString);
    const decoded = decodeDangerousChars(encoded);
    
    console.log(`Character: "${char}"`);
    console.log(`  Original: "${testString}"`);
    console.log(`  Encoded:  "${encoded}"`);
    console.log(`  Decoded:  "${decoded}"`);
    console.log(`  Round-trip OK: ${testString === decoded}`);
    console.log('');
});

// Test regex patterns
console.log('='.repeat(60));
console.log('REGEX PATTERN TESTS');
console.log('='.repeat(60));

const usernameTests = [
    'validuser123',      // Valid
    'user.name',         // Invalid (contains dot)
    'admin123456789',    // Valid
    'user_name-123',     // Valid
    '123username',       // Invalid (starts with number)
    'ab',                // Invalid (too short)
    'validusername12345' // Valid
];

console.log('\nUsername validation tests:');
usernameTests.forEach(username => {
    const result = sanitizeInputData({ username }, { username: 'username' });
    console.log(`"${username}" => Valid: ${result.isValid}`);
});

const passwordTests = [
    'Test123!',              // Invalid (too short)
    'Test123456789!',        // Valid
    'MyStr0ng!P@ssw0rd',     // Valid
    'weakpassword',          // Invalid (no uppercase, numbers, special chars)
    'ValidPass123!@#$%'      // Valid
];

console.log('\nPassword validation tests:');
passwordTests.forEach(password => {
    const result = sanitizeInputData({ password }, { password: 'password' });
    console.log(`"${password}" => Valid: ${result.isValid}`);
});

console.log('\n' + '='.repeat(60));
console.log('SECURITY TEST COMPLETED');
console.log('='.repeat(60));
