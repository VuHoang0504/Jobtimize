const { executeQuery } = require('../config/db');
const emailService = require('./emailService');

/**
 * Payment and VIP Subscription Activation Service
 * Handles idempotent crediting of employer quotas and sending success notifications
 */
class PaymentService {
  /**
   * Atomically activate employer subscription for a transaction
   * @param {Object} params
   * @param {number} [params.orderCode]
   * @param {string} [params.transactionRef]
   * @param {string} [params.gatewayTransactionNo]
   * @param {string} [params.paymentMethod]
   * @returns {Promise<Object>}
   */
  async activateSubscription({ orderCode, transactionRef, gatewayTransactionNo, paymentMethod = 'PayOS' }) {
    // 1. Fetch transaction details with package and employer info
    let query = `
      SELECT pt.PaymentID, pt.TransactionRef, pt.EmployerID, pt.PackageID, pt.Amount, pt.Status, pt.PaymentMethod,
             pt.OrderCode, pt.PaymentLinkId,
             sp.PackageName, sp.DurationDays, sp.PostLimit, sp.SearchLimit,
             e.CompanyName, u.Email AS EmployerEmail, u.FullName AS ContactPerson
      FROM PaymentTransactions pt
      JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID
      JOIN Employers e ON pt.EmployerID = e.EmployerID
      JOIN Users u ON e.UserID = u.UserID
      WHERE 1=1
    `;
    const params = {};

    if (orderCode) {
      query += ` AND pt.OrderCode = @OrderCode`;
      params.OrderCode = Number(orderCode);
    } else if (transactionRef) {
      query += ` AND pt.TransactionRef = @TransactionRef`;
      params.TransactionRef = transactionRef;
    } else {
      throw new Error('Cần cung cấp orderCode hoặc transactionRef để kích hoạt thanh toán.');
    }

    const txnRes = await executeQuery(query, params);
    if (!txnRes.recordset || txnRes.recordset.length === 0) {
      throw new Error('Không tìm thấy giao dịch tương ứng trong hệ thống.');
    }

    const txn = txnRes.recordset[0];

    // Idempotency: If already activated, return success without re-crediting
    if (txn.Status === 'Success') {
      return {
        success: true,
        alreadyProcessed: true,
        message: 'Giao dịch đã được kích hoạt thành công trước đó.',
        transaction: txn
      };
    }

    const gwTxnNo = gatewayTransactionNo || `PAYOS_${orderCode || txn.TransactionRef}_${Date.now()}`;

    // 2. Concurrency-safe atomic update of PaymentTransactions
    const updateTxn = await executeQuery(
      `UPDATE PaymentTransactions
       SET Status = 'Success',
           GatewayTransactionNo = @GatewayTransactionNo,
           PaymentMethod = COALESCE(@PaymentMethod, PaymentMethod),
           PaidAt = GETDATE()
       WHERE PaymentID = @PaymentID AND Status != 'Success'`,
      {
        PaymentID: txn.PaymentID,
        GatewayTransactionNo: gwTxnNo,
        PaymentMethod: paymentMethod
      }
    );

    // If another concurrent request just updated it, avoid double quota crediting
    if (updateTxn.rowsAffected[0] === 0) {
      return {
        success: true,
        alreadyProcessed: true,
        message: 'Giao dịch vừa được kích hoạt bởi tiến trình song song.',
        transaction: txn
      };
    }

    // 3. Grant / Extend VIP Subscription quota for Employer
    const existingSubRes = await executeQuery(
      `SELECT TOP 1 SubID, EndDate, RemainingPosts, RemainingSearches
       FROM EmployerSubscriptions
       WHERE EmployerID = @EmployerID
       ORDER BY EndDate DESC`,
      { EmployerID: txn.EmployerID }
    );

    let updatedSubscription = null;

    if (existingSubRes.recordset && existingSubRes.recordset.length > 0) {
      const currentSub = existingSubRes.recordset[0];
      const isStillActive = new Date(currentSub.EndDate) > new Date();

      if (isStillActive) {
        // Extend and upgrade existing subscription
        await executeQuery(
          `UPDATE EmployerSubscriptions
           SET PackageID = @PackageID,
               EndDate = DATEADD(day, @DurationDays, EndDate),
               RemainingPosts = RemainingPosts + @PostLimit,
               RemainingSearches = RemainingSearches + @SearchLimit,
               PaymentStatus = 'Paid',
               TransactionCode = @TransactionCode
           WHERE SubID = @SubID`,
          {
            PackageID: txn.PackageID,
            DurationDays: txn.DurationDays,
            PostLimit: txn.PostLimit,
            SearchLimit: txn.SearchLimit,
            TransactionCode: txn.TransactionRef,
            SubID: currentSub.SubID
          }
        );
        updatedSubscription = {
          subId: currentSub.SubID,
          extended: true
        };
      } else {
        // Expired subscription -> Insert new active subscription
        const newSubRes = await executeQuery(
          `INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
           OUTPUT INSERTED.SubID
           VALUES (@EmployerID, @PackageID, GETDATE(), DATEADD(day, @DurationDays, GETDATE()), @PostLimit, @SearchLimit, @AmountPaid, @PaymentMethod, 'Paid', @TransactionCode, GETDATE())`,
          {
            EmployerID: txn.EmployerID,
            PackageID: txn.PackageID,
            DurationDays: txn.DurationDays,
            PostLimit: txn.PostLimit,
            SearchLimit: txn.SearchLimit,
            AmountPaid: txn.Amount,
            PaymentMethod: paymentMethod,
            TransactionCode: txn.TransactionRef
          }
        );
        updatedSubscription = {
          subId: newSubRes.recordset[0]?.SubID,
          extended: false
        };
      }
    } else {
      // First time subscription
      const newSubRes = await executeQuery(
        `INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches, AmountPaid, PaymentMethod, PaymentStatus, TransactionCode, CreatedAt)
         OUTPUT INSERTED.SubID
         VALUES (@EmployerID, @PackageID, GETDATE(), DATEADD(day, @DurationDays, GETDATE()), @PostLimit, @SearchLimit, @AmountPaid, @PaymentMethod, 'Paid', @TransactionCode, GETDATE())`,
        {
          EmployerID: txn.EmployerID,
          PackageID: txn.PackageID,
          DurationDays: txn.DurationDays,
          PostLimit: txn.PostLimit,
          SearchLimit: txn.SearchLimit,
          AmountPaid: txn.Amount,
          PaymentMethod: paymentMethod,
          TransactionCode: txn.TransactionRef
        }
      );
      updatedSubscription = {
        subId: newSubRes.recordset[0]?.SubID,
        extended: false
      };
    }

    // 4. Send Confirmation Email to Employer
    try {
      if (txn.EmployerEmail) {
        await emailService.sendPaymentSuccessEmail({
          toEmail: txn.EmployerEmail,
          companyName: txn.CompanyName || txn.ContactPerson || 'Quý Doanh Nghiệp',
          packageName: txn.PackageName,
          durationDays: txn.DurationDays,
          postLimit: txn.PostLimit,
          searchLimit: txn.SearchLimit,
          transactionRef: txn.TransactionRef
        });
      }
    } catch (emailErr) {
      console.error('Không thể gửi email thông báo kích hoạt VIP:', emailErr.message);
    }

    return {
      success: true,
      activated: true,
      message: `Đã kích hoạt gói ${txn.PackageName} thành công cho doanh nghiệp ${txn.CompanyName}!`,
      transaction: {
        ...txn,
        Status: 'Success',
        GatewayTransactionNo: gwTxnNo
      },
      subscription: updatedSubscription
    };
  }
}

module.exports = new PaymentService();

