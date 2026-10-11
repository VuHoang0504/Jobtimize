const { executeQuery } = require('../config/db');

// 1. Review Employer KYC (Admin Only - UC-E04 / UC-A05)
const reviewEmployerKYC = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { status, rejectionReason } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái KYC không hợp lệ (Pending, Approved, Rejected)' });
    }

    // Verify employer exists
    const empCheck = await executeQuery('SELECT EmployerID, CompanyName FROM Employers WHERE EmployerID = @EmployerID', { EmployerID: employerId });
    if (!empCheck.recordset || empCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ doanh nghiệp' });
    }

    // Update Employers KYCStatus
    await executeQuery(
      `UPDATE Employers SET KYCStatus = @Status WHERE EmployerID = @EmployerID`,
      { Status: status, EmployerID: employerId }
    );

    // Update KYCDocuments RejectionReason if provided
    if (rejectionReason !== undefined) {
      await executeQuery(
        `UPDATE TOP (1) KYCDocuments SET RejectionReason = @RejectionReason WHERE EmployerID = @EmployerID ORDER BY SubmittedAt DESC`,
        { RejectionReason: rejectionReason, EmployerID: employerId }
      );
    }

    return res.json({
      success: true,
      message: `Admin đã cập nhật trạng thái KYC của doanh nghiệp ${empCheck.recordset[0].CompanyName} thành "${status}"!`,
      data: { employerId, status }
    });
  } catch (error) {
    console.error('reviewEmployerKYC error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get list of pending KYC submissions (Admin Only)
const getPendingKYCList = async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT e.EmployerID, e.CompanyName, e.KYCStatus,
              u.Email, u.FullName, u.Phone,
              kd.DocumentID, kd.BusinessLicenseUrl, kd.TaxCertificateUrl, kd.TaxCode, kd.SubmittedAt
       FROM Employers e
       JOIN Users u ON e.UserID = u.UserID
       LEFT JOIN KYCDocuments kd ON e.EmployerID = kd.EmployerID
       WHERE e.KYCStatus = 'Pending'
       ORDER BY kd.SubmittedAt DESC`
    );

    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('getPendingKYCList error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Verify Payment & Grant Subscription (Admin Only - UC-E07)
const verifyPaymentTransaction = async (req, res) => {
  try {
    const { transactionRef } = req.params;
    const { gatewayTransactionNo } = req.body;

    const txnRes = await executeQuery(
      `SELECT pt.PaymentID, pt.TransactionRef, pt.EmployerID, pt.PackageID, pt.Amount, pt.Status, pt.PaymentMethod,
              sp.PackageName, sp.DurationDays, sp.PostLimit, sp.SearchLimit,
              e.CompanyName
       FROM PaymentTransactions pt
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID
       JOIN Employers e ON pt.EmployerID = e.EmployerID
       WHERE pt.TransactionRef = @TransactionRef`,
      { TransactionRef: transactionRef }
    );

    if (!txnRes.recordset || txnRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    }

    const txn = txnRes.recordset[0];

    if (txn.Status === 'Success') {
      return res.json({
        success: true,
        message: 'Giao dịch này đã được xác nhận thanh toán trước đó!',
        data: txn
      });
    }

    const gwTxnNo = gatewayTransactionNo || `ADMIN_VERIFIED_${Date.now()}`;

    // Update PaymentTransaction to Success
    await executeQuery(
      `UPDATE PaymentTransactions
       SET Status = 'Success',
           GatewayTransactionNo = @GatewayTransactionNo,
           PaidAt = GETDATE()
       WHERE TransactionRef = @TransactionRef`,
      {
        TransactionRef: transactionRef,
        GatewayTransactionNo: gwTxnNo
      }
    );

    // Credit employer subscription
    const existingSub = await executeQuery(
      `SELECT TOP 1 SubID, EndDate, RemainingPosts, RemainingSearches
       FROM EmployerSubscriptions
       WHERE EmployerID = @EmployerID
       ORDER BY EndDate DESC`,
      { EmployerID: txn.EmployerID }
    );

    if (existingSub.recordset && existingSub.recordset.length > 0) {
      const currentSub = existingSub.recordset[0];
      const isStillActive = new Date(currentSub.EndDate) > new Date();

      if (isStillActive) {
        await executeQuery(
          `UPDATE EmployerSubscriptions
           SET EndDate = DATEADD(day, @DurationDays, EndDate),
               RemainingPosts = RemainingPosts + @PostLimit,
               RemainingSearches = RemainingSearches + @SearchLimit
           WHERE SubID = @SubID`,
          {
            DurationDays: txn.DurationDays,
            PostLimit: txn.PostLimit,
            SearchLimit: txn.SearchLimit,
            SubID: currentSub.SubID
          }
        );
      } else {
        await executeQuery(
          `INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches)
           VALUES (@EmployerID, @PackageID, GETDATE(), DATEADD(day, @DurationDays, GETDATE()), @PostLimit, @SearchLimit)`,
          {
            EmployerID: txn.EmployerID,
            PackageID: txn.PackageID,
            DurationDays: txn.DurationDays,
            PostLimit: txn.PostLimit,
            SearchLimit: txn.SearchLimit
          }
        );
      }
    } else {
      await executeQuery(
        `INSERT INTO EmployerSubscriptions (EmployerID, PackageID, StartDate, EndDate, RemainingPosts, RemainingSearches)
         VALUES (@EmployerID, @PackageID, GETDATE(), DATEADD(day, @DurationDays, GETDATE()), @PostLimit, @SearchLimit)`,
        {
          EmployerID: txn.EmployerID,
          PackageID: txn.PackageID,
          DurationDays: txn.DurationDays,
          PostLimit: txn.PostLimit,
          SearchLimit: txn.SearchLimit
        }
      );
    }

    return res.json({
      success: true,
      message: `Admin đã xác nhận thanh toán thành công ${Number(txn.Amount).toLocaleString()} đ cho doanh nghiệp ${txn.CompanyName}! Gói ${txn.PackageName} đã được kích hoạt.`,
      data: {
        transactionRef,
        status: 'Success',
        gatewayTransactionNo: gwTxnNo,
        packageName: txn.PackageName
      }
    });
  } catch (error) {
    console.error('verifyPaymentTransaction error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  reviewEmployerKYC,
  getPendingKYCList,
  verifyPaymentTransaction
};

