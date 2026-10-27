const { executeQuery } = require('../config/db');
const payosService = require('../services/payosService');
const paymentService = require('../services/paymentService');

/**
 * Helper to fetch Employer record by UserID
 */
const getEmployerRecord = async (userId) => {
  const result = await executeQuery(
    `SELECT EmployerID, CompanyName, UserID FROM Employers WHERE UserID = @UserID`,
    { UserID: userId }
  );
  return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * 1. Create PayOS Payment Order
 * POST /api/payments/create
 */
const createPayOSOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { packageId } = req.body;

    if (!packageId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn gói dịch vụ cần mua (packageId)' });
    }

    const employer = await getEmployerRecord(userId);
    if (!employer) {
      return res.status(403).json({ success: false, message: 'Chỉ tài khoản Nhà tuyển dụng mới được phép mua gói dịch vụ.' });
    }

    // Securely query package details directly from database
    const packRes = await executeQuery(
      `SELECT PackageID, PackageName, Price, DurationDays, PostLimit, SearchLimit
       FROM SubscriptionPackages
       WHERE PackageID = @PackageID`,
      { PackageID: Number(packageId) }
    );

    if (!packRes.recordset || packRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Gói dịch vụ không tồn tại trong hệ thống.' });
    }

    const pack = packRes.recordset[0];
    const amount = Number(pack.Price);

    // Free Trial Package (0 VND)
    if (amount === 0) {
      const freeOrderCode = Number(Date.now().toString().slice(-7) + Math.floor(Math.random() * 89 + 10));
      const freeTxnRef = `FREE_${freeOrderCode}`;

      await executeQuery(
        `INSERT INTO PaymentTransactions (TransactionRef, EmployerID, PackageID, Amount, Status, PaymentMethod, GatewayTransactionNo, CreatedAt, PaidAt, OrderCode)
         VALUES (@TransactionRef, @EmployerID, @PackageID, 0, 'Pending', 'FreeTrial', 'TRIAL_AUTO', GETDATE(), NULL, @OrderCode)`,
        {
          TransactionRef: freeTxnRef,
          EmployerID: employer.EmployerID,
          PackageID: pack.PackageID,
          OrderCode: freeOrderCode
        }
      );

      await paymentService.activateSubscription({
        orderCode: freeOrderCode,
        gatewayTransactionNo: 'FREE_TRIAL_AUTO',
        paymentMethod: 'FreeTrial'
      });

      return res.json({
        success: true,
        directSuccess: true,
        message: `Đã kích hoạt ${pack.PackageName} miễn phí thành công!`,
        data: {
          orderCode: freeOrderCode,
          transactionRef: freeTxnRef,
          status: 'Success',
          packageName: pack.PackageName
        }
      });
    }

    // Generate unique orderCode (6 to 9 digits integer)
    const timestampSlice = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(Math.random() * 899 + 100);
    const orderCode = Number(`${timestampSlice}${randomSuffix}`);
    const transactionRef = `PAY${orderCode}`;

    // Insert pending transaction record
    await executeQuery(
      `INSERT INTO PaymentTransactions (TransactionRef, EmployerID, PackageID, Amount, Status, PaymentMethod, OrderCode, CreatedAt)
       VALUES (@TransactionRef, @EmployerID, @PackageID, @Amount, 'Pending', 'PayOS', @OrderCode, GETDATE())`,
      {
        TransactionRef: transactionRef,
        EmployerID: employer.EmployerID,
        PackageID: pack.PackageID,
        Amount: amount,
        OrderCode: orderCode
      }
    );

    // Call PayOS Service to generate dynamic VietQR & checkout link
    const description = `JOBTIMIZE ${orderCode.toString().slice(-6)}`;
    const returnUrl = `http://localhost:3000/employer/pricing?payment=success&orderCode=${orderCode}`;
    const cancelUrl = `http://localhost:3000/employer/pricing?payment=cancel&orderCode=${orderCode}`;

    const payosResult = await payosService.createPaymentLink({
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
      items: [
        {
          name: pack.PackageName,
          quantity: 1,
          price: amount
        }
      ]
    });

    // Update payment link details in database
    await executeQuery(
      `UPDATE PaymentTransactions
       SET PaymentLinkId = @PaymentLinkId,
           CheckoutUrl = @CheckoutUrl,
           QrCode = @QrCode
       WHERE OrderCode = @OrderCode`,
      {
        PaymentLinkId: payosResult.paymentLinkId || null,
        CheckoutUrl: payosResult.checkoutUrl || null,
        QrCode: payosResult.qrCode || null,
        OrderCode: orderCode
      }
    );

    return res.json({
      success: true,
      data: {
        orderCode,
        transactionRef,
        packageId: pack.PackageID,
        packageName: pack.PackageName,
        amount,
        durationDays: pack.DurationDays,
        postLimit: pack.PostLimit,
        searchLimit: pack.SearchLimit,
        paymentMethod: 'PayOS',
        qrCodeUrl: payosResult.qrCode,
        rawQrCode: payosResult.rawQrCode,
        checkoutUrl: payosResult.checkoutUrl,
        bankInfo: {
          bankName: process.env.BANK_NAME || 'MBBank (Ngân hàng Quân Đội)',
          bin: payosResult.bin || process.env.BANK_BIN || '970422',
          accountNumber: payosResult.accountNumber || process.env.BANK_ACCOUNT_NO || '0387887153',
          accountHolder: payosResult.accountName || process.env.BANK_ACCOUNT_NAME || 'MAI XUAN QUY',
          memo: description
        }
      }
    });
  } catch (error) {
    console.error('createPayOSOrder error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi khi khởi tạo đơn hàng PayOS' });
  }
};

/**
 * 2. PayOS Webhook Handler
 * POST /api/payments/payos-webhook
 */
const handlePayOSWebhook = async (req, res) => {
  try {
    const webhookBody = req.body;

    if (!webhookBody) {
      return res.status(400).json({ success: false, message: 'Webhook body trống' });
    }

    // Verify webhook
    let verifiedData;
    try {
      verifiedData = await payosService.verifyWebhook(webhookBody);
    } catch (verifyErr) {
      console.warn('Webhook verification failed:', verifyErr.message);
      return res.status(400).json({
        success: false,
        message: 'Chữ ký webhook không hợp lệ hoặc dữ liệu bị sửa đổi.'
      });
    }

    const { orderCode, amount, reference } = verifiedData;

    if (!orderCode) {
      return res.status(400).json({ success: false, message: 'Dữ liệu webhook thiếu orderCode' });
    }

    // Find corresponding order in Jobtimize
    const txnRes = await executeQuery(
      `SELECT PaymentID, TransactionRef, Amount, Status, PackageID, EmployerID
       FROM PaymentTransactions
       WHERE OrderCode = @OrderCode`,
      { OrderCode: Number(orderCode) }
    );

    if (!txnRes.recordset || txnRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy đơn hàng #${orderCode}` });
    }

    const txn = txnRes.recordset[0];

    // Check amount match
    if (Number(amount) < Number(txn.Amount)) {
      return res.status(400).json({
        success: false,
        message: `Số tiền thanh toán (${amount} đ) không khớp với giá trị đơn hàng (${txn.Amount} đ)`
      });
    }

    // Idempotent VIP activation
    const result = await paymentService.activateSubscription({
      orderCode: Number(orderCode),
      gatewayTransactionNo: reference || `PAYOS_WH_${orderCode}`,
      paymentMethod: 'PayOS'
    });

    return res.status(200).json({
      success: true,
      message: 'Xác thực Webhook thành công và đã kích hoạt gói VIP cho tài khoản.',
      data: result
    });
  } catch (error) {
    console.error('handlePayOSWebhook error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Polling Order Status
 * GET /api/payments/:orderCode/status
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;

    if (!orderCode) {
      return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng (orderCode)' });
    }

    const txnRes = await executeQuery(
      `SELECT pt.PaymentID, pt.TransactionRef, pt.EmployerID, pt.PackageID, pt.Amount, pt.Status, pt.PaymentMethod,
              pt.OrderCode, pt.PaidAt, pt.CreatedAt,
              sp.PackageName, sp.DurationDays, sp.PostLimit, sp.SearchLimit
       FROM PaymentTransactions pt
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID
       WHERE pt.OrderCode = @OrderCode`,
      { OrderCode: Number(orderCode) }
    );

    if (!txnRes.recordset || txnRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đơn hàng' });
    }

    const txn = txnRes.recordset[0];

    // Live sync check with payOS if still Pending
    if (txn.Status === 'Pending') {
      try {
        const remoteInfo = await payosService.getPaymentInformation(orderCode);
        if (remoteInfo && (remoteInfo.status === 'PAID' || remoteInfo.status === 'SUCCESS')) {
          await paymentService.activateSubscription({
            orderCode: Number(orderCode),
            gatewayTransactionNo: remoteInfo.id || `PAYOS_SYNC_${orderCode}`,
            paymentMethod: 'PayOS'
          });
          txn.Status = 'Success';
          txn.PaidAt = new Date();
        }
      } catch (syncErr) {
        // Ignore remote sync errors
      }
    }

    // Fetch latest employer subscription balances
    let quota = null;
    const subRes = await executeQuery(
      `SELECT TOP 1 SubID, StartDate, EndDate, RemainingPosts, RemainingSearches
       FROM EmployerSubscriptions
       WHERE EmployerID = @EmployerID
       ORDER BY EndDate DESC`,
      { EmployerID: txn.EmployerID }
    );

    if (subRes.recordset && subRes.recordset.length > 0) {
      const sub = subRes.recordset[0];
      quota = {
        subId: sub.SubID,
        endDate: sub.EndDate,
        remainingPosts: sub.RemainingPosts,
        remainingSearches: sub.RemainingSearches,
        isActive: new Date(sub.EndDate) > new Date()
      };
    }

    return res.json({
      success: true,
      data: {
        orderCode: txn.OrderCode,
        transactionRef: txn.TransactionRef,
        packageName: txn.PackageName,
        amount: Number(txn.Amount),
        status: txn.Status,
        paymentMethod: txn.PaymentMethod,
        paidAt: txn.PaidAt,
        createdAt: txn.CreatedAt,
        isSuccess: txn.Status === 'Success',
        quota
      }
    });
  } catch (error) {
    console.error('getPaymentStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPayOSOrder,
  handlePayOSWebhook,
  getPaymentStatus
};

