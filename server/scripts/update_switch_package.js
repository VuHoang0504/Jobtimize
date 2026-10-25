const fs = require('fs');

// 1. Update employerController.js
let controllerPath = 'server/src/controllers/employerController.js';
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

const target1 = `    const subscription = subRes.recordset[0] || null;\r\n\r\n    return res.json({\r\n      success: true,\r\n      data: subscription\r\n    });`;

const replacement1 = `    const subscription = subRes.recordset[0] || null;\r
\r
    // Tính toán cấp bậc gói cao nhất đã mở khóa (Tier Inheritance)\r
    // Người mua gói giá cao hơn có thể sử dụng gói đó và tất cả các gói có giá thấp hơn\r
    let maxUnlockedPrice = 0;\r
    let unlockedPackageIds = [1]; // Gói Starter (0 VND) luôn mở khóa\r
\r
    const maxPaidRes = await executeQuery(\r
      \`SELECT COALESCE(MAX(sp.Price), 0) AS MaxPaidPrice\r
       FROM PaymentTransactions pt\r
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID\r
       WHERE pt.EmployerID = @EmployerID AND pt.Status = 'Success'\`,\r
      { EmployerID: emp.EmployerID }\r
    );\r
\r
    const maxPaid = Number(maxPaidRes.recordset[0]?.MaxPaidPrice || 0);\r
    const currentPrice = subscription && !subscription.IsExpired ? Number(subscription.Price || 0) : 0;\r
    maxUnlockedPrice = Math.max(maxPaid, currentPrice);\r
\r
    const unlockedRes = await executeQuery(\r
      \`SELECT PackageID FROM SubscriptionPackages WHERE Price <= @MaxPrice OR PackageID = 1\`,\r
      { MaxPrice: maxUnlockedPrice }\r
    );\r
\r
    if (unlockedRes.recordset) {\r
      unlockedPackageIds = unlockedRes.recordset.map(p => p.PackageID);\r
    }\r
\r
    const responseData = subscription\r
      ? {\r
          ...subscription,\r
          maxUnlockedPrice,\r
          unlockedPackageIds\r
        }\r
      : null;\r
\r
    return res.json({\r
      success: true,\r
      data: responseData,\r
      tierInfo: {\r
        maxUnlockedPrice,\r
        unlockedPackageIds\r
      }\r
    });`;

if (!controllerContent.includes(target1)) {
  console.error('Target 1 not found in employerController.js');
  process.exit(1);
}
controllerContent = controllerContent.replace(target1, replacement1);

// Add switchSubscriptionPackage before exports
const switchFunctionCode = `\r
// Switch active package between unlocked / purchased packages\r
const switchSubscriptionPackage = async (req, res) => {\r
  try {\r
    const userId = req.user.userId;\r
    const { packageId } = req.body;\r
\r
    if (!packageId) {\r
      return res.status(400).json({ success: false, message: 'Vui lòng chọn gói muốn chuyển đổi.' });\r
    }\r
\r
    const emp = await getEmployerId(userId);\r
    if (!emp) {\r
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhà tuyển dụng' });\r
    }\r
\r
    // Get current active subscription\r
    const subRes = await executeQuery(\r
      \`SELECT TOP 1 es.SubID, es.PackageID, es.EndDate\r
       FROM EmployerSubscriptions es\r
       WHERE es.EmployerID = @EmployerID\r
       ORDER BY es.SubID DESC\`,\r
      { EmployerID: emp.EmployerID }\r
    );\r
\r
    if (!subRes.recordset || subRes.recordset.length === 0) {\r
      return res.status(400).json({ success: false, message: 'Bạn chưa có gói đăng ký nào đang hoạt động.' });\r
    }\r
\r
    const currentSub = subRes.recordset[0];\r
    if (new Date(currentSub.EndDate) < new Date()) {\r
      return res.status(400).json({ success: false, message: 'Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn gói để tiếp tục sử dụng.' });\r
    }\r
\r
    // Target package details\r
    const targetPackRes = await executeQuery(\r
      \`SELECT PackageID, PackageName, Price FROM SubscriptionPackages WHERE PackageID = @PackageID\`,\r
      { PackageID: Number(packageId) }\r
    );\r
\r
    if (!targetPackRes.recordset || targetPackRes.recordset.length === 0) {\r
      return res.status(404).json({ success: false, message: 'Gói dịch vụ không tồn tại.' });\r
    }\r
\r
    const targetPack = targetPackRes.recordset[0];\r
\r
    // Check maximum unlocked tier\r
    const maxPaidRes = await executeQuery(\r
      \`SELECT COALESCE(MAX(sp.Price), 0) AS MaxPaidPrice\r
       FROM PaymentTransactions pt\r
       JOIN SubscriptionPackages sp ON pt.PackageID = sp.PackageID\r
       WHERE pt.EmployerID = @EmployerID AND pt.Status = 'Success'\`,\r
      { EmployerID: emp.EmployerID }\r
    );\r
\r
    const currentPackRes = await executeQuery(\r
      \`SELECT Price FROM SubscriptionPackages WHERE PackageID = @PackageID\`,\r
      { PackageID: currentSub.PackageID }\r
    );\r
\r
    const maxUnlockedPrice = Math.max(\r
      Number(maxPaidRes.recordset[0]?.MaxPaidPrice || 0),\r
      Number(currentPackRes.recordset[0]?.Price || 0)\r
    );\r
\r
    if (Number(targetPack.Price) > maxUnlockedPrice && targetPack.PackageID !== 1) {\r
      return res.status(403).json({\r
        success: false,\r
        message: \`Bạn chưa sở hữu \${targetPack.PackageName}. Vui lòng mua hoặc nâng cấp gói để sử dụng.\`\r
      });\r
    }\r
\r
    // Update active package in EmployerSubscriptions\r
    await executeQuery(\r
      \`UPDATE EmployerSubscriptions\r
       SET PackageID = @PackageID\r
       WHERE SubID = @SubID\`,\r
      {\r
        PackageID: targetPack.PackageID,\r
        SubID: currentSub.SubID\r
      }\r
    );\r
\r
    return res.json({\r
      success: true,\r
      message: \`Đã chuyển sang sử dụng \${targetPack.PackageName} thành công!\`,\r
      data: {\r
        packageId: targetPack.PackageID,\r
        packageName: targetPack.PackageName\r
      }\r
    });\r
  } catch (error) {\r
    console.error('switchSubscriptionPackage error:', error);\r
    return res.status(500).json({ success: false, message: error.message });\r
  }\r
};\r
\r
module.exports = {`;

controllerContent = controllerContent.replace('module.exports = {', switchFunctionCode);

// Add to exports list
controllerContent = controllerContent.replace(
  '  getEmployerSubscription,\r\n',
  '  getEmployerSubscription,\r\n  switchSubscriptionPackage,\r\n'
);

fs.writeFileSync(controllerPath, controllerContent, 'utf8');
console.log('✅ Updated employerController.js');

// 2. Update employerRoutes.js
let routesPath = 'server/src/routes/employerRoutes.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');

if (!routesContent.includes('/subscription/switch')) {
  routesContent = routesContent.replace(
    "router.get('/subscription', employerController.getEmployerSubscription);",
    "router.get('/subscription', employerController.getEmployerSubscription);\r\nrouter.post('/subscription/switch', employerController.switchSubscriptionPackage);"
  );
  fs.writeFileSync(routesPath, routesContent, 'utf8');
  console.log('✅ Updated employerRoutes.js');
}

console.log('Backend changes applied successfully.');

