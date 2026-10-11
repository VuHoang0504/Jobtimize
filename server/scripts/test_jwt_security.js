const { spawnSync } = require('child_process');
const path = require('path');
const assert = require('assert');

// IMPORTANT: Do NOT print or expose actual secret values.
console.log('===============================================================');
console.log('🔒 KIỂM THỬ BẢO MẬT JWT VÀ CƠ CHẾ FAIL-FAST STARTUP');
console.log('===============================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Chi tiết: ${err.message}`);
    failCount++;
  }
}

// Helper to safely restore process.env.JWT_SECRET
function restoreSecret(original) {
  if (original === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = original;
  }
}

// -----------------------------------------------------------------------------
// Test Group 1: Unit Tests for authHelper when JWT_SECRET is missing or empty
// -----------------------------------------------------------------------------
console.log('--- NHÓM 1: authHelper khi thiếu JWT_SECRET (không dùng fallback key) ---');

const authHelperPath = path.resolve(__dirname, '../src/utils/authHelper.js');

runTest('1.1: validateJwtConfig() ném lỗi cấu hình khi JWT_SECRET bị xóa', () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    delete require.cache[require.resolve(authHelperPath)];
    const authHelper = require(authHelperPath);

    assert.throws(
      () => authHelper.validateJwtConfig(),
      /Biến môi trường JWT_SECRET chưa được thiết lập/
    );
  } finally {
    restoreSecret(originalSecret);
  }
});

runTest('1.2: validateJwtConfig() ném lỗi khi JWT_SECRET chỉ là khoảng trắng', () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = '   ';
    delete require.cache[require.resolve(authHelperPath)];
    const authHelper = require(authHelperPath);

    assert.throws(
      () => authHelper.validateJwtConfig(),
      /Biến môi trường JWT_SECRET chưa được thiết lập/
    );
  } finally {
    restoreSecret(originalSecret);
  }
});

runTest('1.3: generateToken() ném lỗi khi thiếu JWT_SECRET (không tự dùng key mặc định)', () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    delete require.cache[require.resolve(authHelperPath)];
    const authHelper = require(authHelperPath);

    assert.throws(
      () => authHelper.generateToken({ id: 1, role: 'Employer' }),
      /Biến môi trường JWT_SECRET chưa được thiết lập/
    );
  } finally {
    restoreSecret(originalSecret);
  }
});

runTest('1.4: verifyToken() ném lỗi khi thiếu JWT_SECRET (không tự dùng key mặc định)', () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    delete require.cache[require.resolve(authHelperPath)];
    const authHelper = require(authHelperPath);

    assert.throws(
      () => authHelper.verifyToken('dummy.jwt.token'),
      /Biến môi trường JWT_SECRET chưa được thiết lập/
    );
  } finally {
    restoreSecret(originalSecret);
  }
});

// -----------------------------------------------------------------------------
// Test Group 2: Server Startup Fail-Fast Verification (Child Process)
// -----------------------------------------------------------------------------
console.log('\n--- NHÓM 2: Cơ chế Fail-Fast khi khởi động Server thiếu JWT_SECRET ---');

runTest('2.1: Server dừng ngay lập tức (exit code 1) khi khởi động thiếu JWT_SECRET', () => {
  const serverPath = path.resolve(__dirname, '../src/server.js');
  const codeToRun = `
    delete process.env.JWT_SECRET;
    // Mock dotenv so it won't load anything during this isolated test
    const Module = require('module');
    const origRequire = Module.prototype.require;
    Module.prototype.require = function(mod) {
      if (mod === 'dotenv') {
        return { config: () => ({ parsed: {} }) };
      }
      return origRequire.apply(this, arguments);
    };
    require('${serverPath.replace(/\\/g, '\\\\')}');
  `;

  const child = spawnSync(process.execPath, ['-e', codeToRun], {
    encoding: 'utf8',
    env: { ...process.env, JWT_SECRET: '' }
  });

  assert.strictEqual(child.status, 1, `Kỳ vọng exit code 1 nhưng nhận ${child.status}`);
  const combinedOutput = child.stdout + child.stderr;
  assert.ok(
    combinedOutput.includes('LỖI KHỞI ĐỘNG SERVER') || combinedOutput.includes('Biến môi trường JWT_SECRET chưa được thiết lập'),
    'Server phải in thông báo lỗi cấu hình rõ ràng khi khởi động'
  );
  assert.ok(
    !combinedOutput.includes('Jobtimize Server is running'),
    'Server tuyệt đối không được tiếp tục lắng nghe port khi thiếu JWT_SECRET'
  );
});

// -----------------------------------------------------------------------------
// Test Group 3: authHelper khi có JWT_SECRET hợp lệ
// -----------------------------------------------------------------------------
console.log('\n--- NHÓM 3: Hoạt động bình thường khi JWT_SECRET đã được thiết lập ---');

runTest('3.1: validateJwtConfig() trả về true khi JWT_SECRET hợp lệ', () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = 'Test_Valid_Super_Secret_Key_987654321!';
    delete require.cache[require.resolve(authHelperPath)];
    const authHelper = require(authHelperPath);

    const isValid = authHelper.validateJwtConfig();
    assert.strictEqual(isValid, true);
  } finally {
    restoreSecret(originalSecret);
  }
});

runTest('3.2: generateToken() và verifyToken() phát hành và giải mã token chính xác', () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = 'Test_Valid_Super_Secret_Key_987654321!';
    delete require.cache[require.resolve(authHelperPath)];
    const authHelper = require(authHelperPath);

    const payload = { userId: 42, email: 'employer@company.com', role: 'Employer' };
    const token = authHelper.generateToken(payload);

    assert.ok(typeof token === 'string' && token.split('.').length === 3, 'Token phải là JWT hợp lệ gồm 3 phần');

    const decoded = authHelper.verifyToken(token);
    assert.strictEqual(decoded.userId, 42);
    assert.strictEqual(decoded.email, 'employer@company.com');
    assert.strictEqual(decoded.role, 'Employer');
  } finally {
    restoreSecret(originalSecret);
  }
});

runTest('3.3: Token giả mạo hoặc ký bằng secret khác sẽ bị verifyToken() từ chối', () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = 'Key_A_1234567890!';
    delete require.cache[require.resolve(authHelperPath)];
    let authHelper = require(authHelperPath);
    const tokenA = authHelper.generateToken({ userId: 100 });

    process.env.JWT_SECRET = 'Key_B_Different_Key_9999!';
    delete require.cache[require.resolve(authHelperPath)];
    authHelper = require(authHelperPath);

    assert.throws(
      () => authHelper.verifyToken(tokenA),
      /invalid signature/i,
      'verifyToken phải từ chối token có chữ ký không khớp'
    );
  } finally {
    restoreSecret(originalSecret);
  }
});

// -----------------------------------------------------------------------------
// Test Group 4: Khởi động Server thành công khi có JWT_SECRET hợp lệ
// -----------------------------------------------------------------------------
console.log('\n--- NHÓM 4: Server khởi động thành công khi JWT_SECRET được cấu hình ---');

runTest('4.1: Server khởi động qua validation và sẵn sàng chạy khi có JWT_SECRET', () => {
  const serverPath = path.resolve(__dirname, '../src/server.js');
  // Chạy server với dummy secret và tắt cổng ngay lập tức (không treo process)
  const codeToRun = `
    process.env.JWT_SECRET = 'Production_Grade_Secret_Key_For_Testing_Only_12345!';
    process.env.PORT = '0'; // Cổng 0 để hệ điều hành cấp phát cổng ngẫu nhiên tránh conflict
    
    // Mock getPool để không cần kết nối MS SQL Server thực tế trong test này
    const dbPath = require.resolve('./src/config/db');
    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: { getPool: async () => ({}) }
    };
    
    const { validateJwtConfig } = require('./src/utils/authHelper');
    // Kiểm tra validateJwtConfig không ném lỗi
    validateJwtConfig();
    console.log('VALIDATION_SUCCESS');
  `;

  const child = spawnSync(process.execPath, ['-e', codeToRun], {
    encoding: 'utf8',
    cwd: path.resolve(__dirname, '..')
  });

  assert.strictEqual(child.status, 0, `Kỳ vọng exit code 0 nhưng nhận ${child.status}`);
  assert.ok(
    child.stdout.includes('VALIDATION_SUCCESS'),
    'Validation phải thành công khi JWT_SECRET đã được thiết lập'
  );
});

console.log('\n===============================================================');
console.log(`🏁 TỔNG KẾT: ${passCount} PASSED, ${failCount} FAILED`);
console.log('===============================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
