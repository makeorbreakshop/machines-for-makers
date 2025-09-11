/**
 * Security Tests for Machines for Makers
 * Run with: node tests/security-tests.js
 */

const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Rate Limiting on Login
async function testLoginRateLimiting() {
  log('\n=== Test 1: Login Rate Limiting ===', 'cyan');
  
  const results = [];
  
  // Try to login 7 times (limit should be 5)
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await fetch(`${TEST_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong_password' })
      });
      
      const data = await response.json();
      results.push({
        attempt: i,
        status: response.status,
        rateLimited: response.status === 429,
        message: data.message,
        retryAfter: response.headers.get('Retry-After')
      });
      
      log(`  Attempt ${i}: Status ${response.status} - ${data.message}`, 
          response.status === 429 ? 'yellow' : 'green');
      
      if (response.status === 429) {
        log(`  Rate limited! Retry after: ${response.headers.get('Retry-After')} seconds`, 'yellow');
      }
    } catch (error) {
      log(`  Attempt ${i}: Error - ${error.message}`, 'red');
    }
    
    // Small delay between requests
    await sleep(100);
  }
  
  // Check if rate limiting kicked in after 5 attempts
  const rateLimitedAttempts = results.filter(r => r.rateLimited);
  if (rateLimitedAttempts.length > 0) {
    log('✅ Rate limiting is working correctly!', 'green');
    return true;
  } else {
    log('❌ Rate limiting is NOT working!', 'red');
    return false;
  }
}

// Test 2: Input Validation
async function testInputValidation() {
  log('\n=== Test 2: Input Validation ===', 'cyan');
  
  // Wait for rate limit to reset first
  log('  Waiting 60 seconds for rate limit to reset...', 'yellow');
  await sleep(60000);
  
  const testCases = [
    {
      name: 'Empty password',
      payload: { password: '' },
      shouldFail: true
    },
    {
      name: 'Missing password field',
      payload: {},
      shouldFail: true
    },
    {
      name: 'Password too long',
      payload: { password: 'a'.repeat(101) },
      shouldFail: true
    },
    {
      name: 'Valid password format',
      payload: { password: 'test_password' },
      shouldFail: false
    },
    {
      name: 'SQL injection attempt',
      payload: { password: "' OR '1'='1" },
      shouldFail: false // Should be safely handled
    },
    {
      name: 'XSS attempt',
      payload: { password: '<script>alert("xss")</script>' },
      shouldFail: false // Should be safely handled
    }
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    try {
      const response = await fetch(`${TEST_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload)
      });
      
      const data = await response.json();
      const failed = response.status === 400 || response.status === 401;
      
      if ((testCase.shouldFail && failed) || (!testCase.shouldFail && !failed)) {
        log(`  ✅ ${testCase.name}: Passed (Status: ${response.status})`, 'green');
      } else {
        log(`  ❌ ${testCase.name}: Failed (Status: ${response.status})`, 'red');
        allPassed = false;
      }
    } catch (error) {
      log(`  ❌ ${testCase.name}: Error - ${error.message}`, 'red');
      allPassed = false;
    }
    
    await sleep(100);
  }
  
  return allPassed;
}

// Test 3: Session Token Security
async function testSessionTokenSecurity() {
  log('\n=== Test 3: Session Token Security ===', 'cyan');
  
  // First, we need to login with correct password
  // You'll need to set the correct password for testing
  const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'your_test_password_here';
  
  try {
    const response = await fetch(`${TEST_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD })
    });
    
    if (response.status !== 200) {
      log('  ⚠️  Cannot test session tokens without valid password', 'yellow');
      log('  Set TEST_ADMIN_PASSWORD environment variable', 'yellow');
      return null;
    }
    
    // Check for Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) {
      log('  ❌ No cookie set in response', 'red');
      return false;
    }
    
    // Parse cookie attributes
    const cookieAttributes = setCookie.toLowerCase();
    const hasHttpOnly = cookieAttributes.includes('httponly');
    const hasSecure = cookieAttributes.includes('secure');
    const hasSameSite = cookieAttributes.includes('samesite');
    
    log(`  Cookie attributes:`, 'blue');
    log(`    HttpOnly: ${hasHttpOnly ? '✅' : '❌'}`, hasHttpOnly ? 'green' : 'red');
    log(`    Secure: ${hasSecure ? '✅' : '❌ (OK for localhost)'}`, hasSecure ? 'green' : 'yellow');
    log(`    SameSite: ${hasSameSite ? '✅' : '❌'}`, hasSameSite ? 'green' : 'red');
    
    // Extract cookie value
    const cookieValue = setCookie.split(';')[0].split('=')[1];
    
    // Check token format (should be UUID.secret.signature)
    const tokenParts = cookieValue.split('.');
    if (tokenParts.length === 3) {
      log(`  ✅ Token has correct format (3 parts)`, 'green');
      
      // Check if first part looks like UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tokenParts[0])) {
        log(`  ✅ Token uses UUID format`, 'green');
      } else {
        log(`  ❌ Token doesn't use UUID format`, 'red');
      }
      
      // Check if second part looks like random hex
      if (/^[0-9a-f]{64}$/i.test(tokenParts[1])) {
        log(`  ✅ Token has 32-byte random secret`, 'green');
      } else {
        log(`  ❌ Token secret doesn't look secure`, 'red');
      }
      
      return hasHttpOnly && tokenParts.length === 3;
    } else {
      log(`  ❌ Token has incorrect format (${tokenParts.length} parts)`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 4: Auth Check Endpoint
async function testAuthCheckEndpoint() {
  log('\n=== Test 4: Auth Check Endpoint ===', 'cyan');
  
  try {
    // Test without cookie
    const response1 = await fetch(`${TEST_URL}/api/admin/auth/check`);
    const data1 = await response1.json();
    
    if (data1.authenticated === false) {
      log(`  ✅ Correctly returns unauthenticated without cookie`, 'green');
    } else {
      log(`  ❌ Should return unauthenticated without cookie`, 'red');
      return false;
    }
    
    // Note: Testing with valid cookie would require actual login
    log(`  ℹ️  Full test requires valid session`, 'blue');
    
    return true;
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 5: Check for Debug Information Leakage
async function testDebugInfoLeakage() {
  log('\n=== Test 5: Debug Information Leakage ===', 'cyan');
  
  try {
    const response = await fetch(`${TEST_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong_password' })
    });
    
    const data = await response.json();
    
    // Check if debug information is exposed
    const hasDebugInfo = data.debug !== undefined;
    const hasCharCodes = JSON.stringify(data).includes('charCodes');
    const hasStackTrace = data.stack !== undefined;
    
    if (!hasDebugInfo && !hasCharCodes && !hasStackTrace) {
      log(`  ✅ No debug information exposed in production`, 'green');
      return true;
    } else {
      log(`  ⚠️  Debug information may be exposed:`, 'yellow');
      if (hasDebugInfo) log(`    - Debug object present`, 'yellow');
      if (hasCharCodes) log(`    - Character codes exposed`, 'yellow');
      if (hasStackTrace) log(`    - Stack trace exposed`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    return false;
  }
}

// Main test runner
async function runSecurityTests() {
  log('🔒 Starting Security Tests for Machines for Makers', 'blue');
  log(`Testing URL: ${TEST_URL}`, 'blue');
  log('=' .repeat(50), 'blue');
  
  const results = {
    rateLimiting: await testLoginRateLimiting(),
    inputValidation: await testInputValidation(),
    sessionToken: await testSessionTokenSecurity(),
    authCheck: await testAuthCheckEndpoint(),
    debugInfo: await testDebugInfoLeakage()
  };
  
  // Wait a bit to avoid rate limiting cleanup
  log('\nWaiting 60 seconds for rate limit to reset...', 'cyan');
  await sleep(60000);
  
  // Summary
  log('\n' + '=' .repeat(50), 'blue');
  log('📊 Test Summary:', 'blue');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const [test, result] of Object.entries(results)) {
    if (result === true) {
      log(`  ✅ ${test}: PASSED`, 'green');
      passed++;
    } else if (result === false) {
      log(`  ❌ ${test}: FAILED`, 'red');
      failed++;
    } else {
      log(`  ⚠️  ${test}: SKIPPED`, 'yellow');
      skipped++;
    }
  }
  
  log('\n' + '=' .repeat(50), 'blue');
  log(`Total: ${passed} passed, ${failed} failed, ${skipped} skipped`, 'blue');
  
  if (failed === 0) {
    log('🎉 All security tests passed!', 'green');
  } else {
    log(`⚠️  ${failed} security test(s) failed!`, 'red');
  }
}

// Run tests
runSecurityTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});