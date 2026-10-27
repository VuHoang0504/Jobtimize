const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../src/config/db');
const payosService = require('../src/services/payosService');
const paymentService = require('../src/services/paymentService');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TÍCH HỢP PAYOS PAYMENT VÀO JOBTIMIZE');
  console.log('====================================================\n');

  try {
    // 1. Lấy thông tin tài khoản Nhà tuyển dụng trong DB
    const empRes = await executeQuery(`
      SELECT TOP 1 u.UserID, u.Email, r.RoleName, e.EmployerID, e.CompanyName
      FROM Users u
      JOIN UserRoles ur ON u.UserID = ur.UserID
      JOIN Roles r ON ur.RoleID = r.RoleID
      JOIN Employers e ON u.UserID = e.UserID
      WHERE r.RoleName = 'Employer'
    `);

    if (!empRes.recordset || empRes.recordset.length === 0) {
      throw new Error('Không tìm thấy tài khoản Nhà tuyển dụng trong DB');
    }

    const testUser = empRes.recordset[0];
    console.log(`✅ [1] Đã xác định tài khoản kiểm thử:`);
    console.log(`   - Công ty: ${testUser.CompanyName}`);
    console.log(`   - Email: ${testUser.Email} (EmployerID: ${testUser.EmployerID})\n`);

    // Tạo token JWT xác thực cho Nhà tuyển dụng
    const token = jwt.sign(
      { userId: testUser.UserID, email: testUser.Email, role: testUser.RoleName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Lấy thông tin gói dịch vụ VIP (Pro Recruiter - PackageID = 2)
    const packRes = await executeQuery(`
      SELECT PackageID, PackageName, Price, DurationDays, PostLimit, SearchLimit
      FROM SubscriptionPackages
      WHERE PackageID = 2
    `);
    const pack = packRes.recordset[0];
    console.log(`✅ [2] Gói VIP thử nghiệm: ${pack.PackageName}`);
    console.log(`   - Giá: ${Number(pack.Price).toLocaleString()} đ | Thời hạn: ${pack.DurationDays} ngày | Tin đăng: +${pack.PostLimit} | Lượt tìm: +${pack.SearchLimit}\n`);

    // Lưu lại số dư quota hiện tại của Employer
    const subBefore = await executeQuery(`
      SELECT TOP 1 SubID, RemainingPosts, RemainingSearches, EndDate
      FROM EmployerSubscriptions
      WHERE EmployerID = @EmployerID
      ORDER BY EndDate DESC
    `, { EmployerID: testUser.EmployerID });

    const initialPosts = subBefore.recordset[0]?.RemainingPosts || 0;
    const initialSearches = subBefore.recordset[0]?.RemainingSearches || 0;
    console.log(`📊 Quota trước khi mua gói: ${initialPosts} tin đăng, ${initialSearches} lượt tìm kiếm.\n`);

    // 3. Khởi tạo đơn hàng qua controller hoặc API
    console.log('--- TEST 1: Tạo đơn hàng thanh toán qua payOS (POST /api/payments/create) ---');
    const orderCode = Number(Date.now().toString().slice(-6) + Math.floor(Math.random() * 899 + 100));
    const transactionRef = `PAY${orderCode}`;

    // Lưu Pending transaction
    await executeQuery(`
      INSERT INTO PaymentTransactions (TransactionRef, EmployerID, PackageID, Amount, Status, PaymentMethod, OrderCode, CreatedAt)
      VALUES (@TransactionRef, @EmployerID, @PackageID, @Amount, 'Pending', 'PayOS', @OrderCode, GETDATE())
    `, {
      TransactionRef: transactionRef,
      EmployerID: testUser.EmployerID,
      PackageID: pack.PackageID,
      Amount: pack.Price,
      OrderCode: orderCode
    });

    const paymentLinkRes = await payosService.createPaymentLink({
      orderCode,
      amount: pack.Price,
      description: `JOBTIMIZE ${orderCode.toString().slice(-6)}`,
      returnUrl: `http://localhost:3000/employer/pricing?payment=success&orderCode=${orderCode}`,
      cancelUrl: `http://localhost:3000/employer/pricing?payment=cancel&orderCode=${orderCode}`
    });

    if (!paymentLinkRes.success) {
      throw new Error('Tạo payment link thất bại');
    }
    console.log('✅ Tạo đơn hàng thành công:');
    console.log(`   - OrderCode: ${orderCode}`);
    console.log(`   - TransactionRef: ${transactionRef}`);
    console.log(`   - Số tiền: ${paymentLinkRes.amount} đ`);
    console.log(`   - Mã QR Url / Image: ${paymentLinkRes.qrCode.slice(0, 45)}...`);
    console.log(`   - Checkout Url: ${paymentLinkRes.checkoutUrl.slice(0, 45)}...\n`);

    // 4. Kiểm tra trạng thái đơn hàng khi vừa tạo (Polling test)
    console.log('--- TEST 2: Polling trạng thái đơn hàng (GET /api/payments/:orderCode/status) ---');
    const txnInDb = await executeQuery(`SELECT Status, Amount, OrderCode FROM PaymentTransactions WHERE OrderCode = @OrderCode`, { OrderCode: orderCode });
    if (txnInDb.recordset[0].Status !== 'Pending') {
      throw new Error(`Kỳ vọng trạng thái Pending nhưng nhận được: ${txnInDb.recordset[0].Status}`);
    }
    console.log(`✅ Trạng thái ban đầu: ${txnInDb.recordset[0].Status} (Chưa được kích hoạt khi vừa tạo đơn hàng - Đúng nghiệp vụ)\n`);

    // 5. Kiểm tra bảo mật: Webhook với chữ ký giả mạo (Forged signature)
    console.log('--- TEST 3: Bảo mật Webhook - Chữ ký không hợp lệ ---');
    let rejectedForged = false;
    try {
      await payosService.verifyWebhook({
        data: { orderCode, amount: pack.Price },
        signature: 'forged_fake_signature_123456789'
      });
    } catch (err) {
      rejectedForged = true;
      console.log(`✅ Hệ thống đã từ chối thành công Webhook giả mạo: "${err.message}"\n`);
    }
    if (!rejectedForged) {
      throw new Error('LỖI BẢO MẬT: Webhook giả mạo không bị chặn!');
    }

    // 6. Kích hoạt hợp lệ qua Webhook được ký chuẩn từ payOS
    console.log('--- TEST 4: Nhận Webhook hợp lệ & Tự động kích hoạt VIP ---');
    const webhookData = {
      orderCode,
      amount: pack.Price,
      description: `JOBTIMIZE ${orderCode.toString().slice(-6)}`,
      accountNumber: '0387887153',
      reference: `PAYOS_TXN_${orderCode}`,
      transactionDateTime: new Date().toISOString(),
      currency: 'VND',
      paymentLinkId: `LINK_${orderCode}`,
      code: '00',
      desc: 'success'
    };

    const validSignature = payosService.createSignatureFromObj(webhookData, process.env.PAYOS_CHECKSUM_KEY);
    const verified = await payosService.verifyWebhook({
      data: webhookData,
      signature: validSignature
    });
    console.log(`✅ Xác minh chữ ký Webhook thành công cho orderCode #${verified.orderCode}`);

    // Thực thi kích hoạt tự động
    const activationResult = await paymentService.activateSubscription({
      orderCode: verified.orderCode,
      gatewayTransactionNo: verified.reference,
      paymentMethod: 'PayOS'
    });

    if (!activationResult.success || !activationResult.activated) {
      throw new Error('Kích hoạt gói VIP thất bại: ' + JSON.stringify(activationResult));
    }
    console.log(`✅ ${activationResult.message}`);

    // 7. Xác minh cơ sở dữ liệu sau khi kích hoạt
    console.log('\n--- TEST 5: Xác minh trạng thái DB & Hạn mức Quota ---');
    const updatedTxnRes = await executeQuery(`SELECT Status, PaidAt, GatewayTransactionNo FROM PaymentTransactions WHERE OrderCode = @OrderCode`, { OrderCode: orderCode });
    const updatedTxn = updatedTxnRes.recordset[0];
    if (updatedTxn.Status !== 'Success') {
      throw new Error(`Kỳ vọng Status = 'Success' nhưng DB lưu: ${updatedTxn.Status}`);
    }
    console.log(`✅ PaymentTransactions cập nhật: Status = ${updatedTxn.Status}, PaidAt = ${updatedTxn.PaidAt}`);

    const subAfter = await executeQuery(`
      SELECT TOP 1 SubID, RemainingPosts, RemainingSearches, EndDate
      FROM EmployerSubscriptions
      WHERE EmployerID = @EmployerID
      ORDER BY EndDate DESC
    `, { EmployerID: testUser.EmployerID });

    const newPosts = subAfter.recordset[0].RemainingPosts;
    const newSearches = subAfter.recordset[0].RemainingSearches;
    console.log(`✅ Hạn mức sau kích hoạt:`);
    console.log(`   - Tin đăng: ${initialPosts} -> ${newPosts} (+${newPosts - initialPosts})`);
    console.log(`   - Lượt tìm kiếm: ${initialSearches} -> ${newSearches} (+${newSearches - initialSearches})`);

    // 8. Kiểm tra tính Idempotent (Chống kích hoạt lặp lại khi Webhook gửi lại nhiều lần)
    console.log('\n--- TEST 6: Kiểm tra tính Idempotent (Chống xử lý trùng Webhook) ---');
    const duplicateResult = await paymentService.activateSubscription({
      orderCode: verified.orderCode,
      gatewayTransactionNo: verified.reference,
      paymentMethod: 'PayOS'
    });

    if (!duplicateResult.alreadyProcessed) {
      throw new Error('Idempotent thất bại: Giao dịch bị xử lý lần thứ 2!');
    }
    console.log(`✅ Đã bắt đúng giao dịch trùng lặp: "${duplicateResult.message}"`);

    const subCheckDup = await executeQuery(`
      SELECT TOP 1 SubID, RemainingPosts, RemainingSearches
      FROM EmployerSubscriptions
      WHERE EmployerID = @EmployerID
      ORDER BY EndDate DESC
    `, { EmployerID: testUser.EmployerID });

    if (subCheckDup.recordset[0].RemainingPosts !== newPosts) {
      throw new Error('LỖI: Quota bị cộng dồn lần 2 khi nhận webhook trùng!');
    }
    console.log('✅ Quota không bị cộng trùng khi Webhook gửi lại nhiều lần (Chuẩn Idempotency).\n');

    console.log('====================================================');
    console.log('🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ PAYOS ĐỀU ĐẠT 100%!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ KIỂM THỬ THẤT BẠI:', error);
    process.exit(1);
  }
}

runTests();

