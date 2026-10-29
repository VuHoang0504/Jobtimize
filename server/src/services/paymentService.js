const { withTransaction } = require('./notificationStore');
const emailService = require('./emailService');

async function activateSubscription({ orderCode, transactionRef, gatewayTransactionNo, paymentMethod = 'PayOS' }) {
  if (!orderCode && !transactionRef) throw new Error('Thiếu mã giao dịch.');
  const result = await withTransaction(async query => {
    const params = orderCode ? { Code: Number(orderCode) } : { Ref: transactionRef };
    const where = orderCode ? 'p.OrderCode=@Code' : 'p.TransactionRef=@Ref';
    // Every activation locks payment, employer, then subscription in that order.
    const txn = (await query(`SELECT p.*,sp.PackageName,sp.DurationDays,sp.PostLimit,sp.SearchLimit
      FROM PaymentTransactions p WITH(UPDLOCK,ROWLOCK) JOIN SubscriptionPackages sp ON sp.PackageID=p.PackageID WHERE ${where}`, params)).recordset[0];
    if (!txn) throw new Error('Không tìm thấy giao dịch.');
    if (txn.Status === 'Success') return { success: true, alreadyProcessed: true, transaction: txn };
    if (txn.Status !== 'Pending') throw new Error('Giao dịch không còn chờ thanh toán.');
    const employer = (await query(`SELECT e.CompanyName,u.Email EmployerEmail FROM Employers e WITH(UPDLOCK,ROWLOCK) JOIN Users u ON u.UserID=e.UserID WHERE e.EmployerID=@ID`, { ID: txn.EmployerID })).recordset[0];
    if (Number(txn.Amount) === 0 && (await query("SELECT TOP 1 PaymentID FROM PaymentTransactions WHERE EmployerID=@ID AND Amount=0 AND Status='Success'", { ID: txn.EmployerID })).recordset.length) throw new Error('Doanh nghiệp đã sử dụng gói miễn phí.');
    const sub = (await query('SELECT TOP 1 SubID,EndDate,CASE WHEN EndDate>GETDATE() THEN 1 ELSE 0 END IsActive FROM EmployerSubscriptions WITH(UPDLOCK,ROWLOCK) WHERE EmployerID=@ID ORDER BY EndDate DESC,SubID DESC', { ID: txn.EmployerID })).recordset[0];
    const values = { Employer: txn.EmployerID, Package: txn.PackageID, Days: txn.DurationDays, Posts: txn.PostLimit, Searches: txn.SearchLimit, Amount: txn.Amount, Method: paymentMethod, Ref: txn.TransactionRef };
    let subId;
    if (sub?.IsActive) {
      await query(`UPDATE EmployerSubscriptions SET PackageID=@Package,EndDate=DATEADD(day,@Days,EndDate),RemainingPosts=RemainingPosts+@Posts,RemainingSearches=RemainingSearches+@Searches,
        AmountPaid=COALESCE(AmountPaid,0)+@Amount,PaymentMethod=@Method,PaymentStatus='Paid',TransactionCode=@Ref WHERE SubID=@ID`, { ...values, ID: sub.SubID });
      subId = sub.SubID;
    } else {
      subId = (await query(`INSERT EmployerSubscriptions(EmployerID,PackageID,StartDate,EndDate,RemainingPosts,RemainingSearches,AmountPaid,PaymentMethod,PaymentStatus,TransactionCode,CreatedAt)
        OUTPUT INSERTED.SubID VALUES(@Employer,@Package,GETDATE(),DATEADD(day,@Days,GETDATE()),@Posts,@Searches,@Amount,@Method,'Paid',@Ref,GETDATE())`, values)).recordset[0].SubID;
    }
    await query("UPDATE PaymentTransactions SET Status='Success',PaidAt=GETDATE(),PaymentMethod=@Method,GatewayTransactionNo=@Gateway WHERE PaymentID=@ID", { ID: txn.PaymentID, Method: paymentMethod, Gateway: gatewayTransactionNo || `PAYOS_${orderCode || txn.TransactionRef}` });
    return { success: true, activated: true, transaction: { ...txn, ...employer, Status: 'Success' }, subscription: { subId, extended: !!sub?.IsActive } };
  });
  // Duplicate callbacks do not send again. Email failure cannot undo payment.
  if (result.activated && result.transaction.EmployerEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const txn = result.transaction;
    try { await emailService.sendPaymentSuccessEmail({ toEmail: txn.EmployerEmail, companyName: txn.CompanyName, packageName: txn.PackageName, durationDays: txn.DurationDays, postLimit: txn.PostLimit, searchLimit: txn.SearchLimit, transactionRef: txn.TransactionRef }); }
    catch (error) { console.error('Payment confirmation email:', error.message); }
  }
  return result;
}
module.exports = { activateSubscription };
