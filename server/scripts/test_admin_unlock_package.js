const { executeQuery } = require('../src/config/db');
const adminController = require('../src/controllers/adminController');
const { canViewApplicantMatching } = require('../src/services/applicantMatchingAccess');

async function testUnlock() {
  console.log('--- Testing Admin Unlock Package ---');

  // 1. Get packages
  let req = {};
  let res = {
    json: (data) => data,
    status: (code) => ({ json: (d) => ({ statusCode: code, ...d }) })
  };

  const pkgs = await adminController.getSubscriptionPackagesAdmin(req, res);
  console.log('Available packages:', pkgs.data?.map(p => ({ id: p.PackageID, name: p.PackageName, price: p.Price })));

  // 2. Unlock package for Employer 6 (KMS Technology Da Nang)
  const unlockReq = {
    params: { employerId: 6 },
    body: {
      packageId: 3, // Enterprise AI
      durationDays: 60,
      posts: 50,
      searches: 500,
      note: 'Admin cấp gói Enterprise AI phục vụ demo'
    }
  };

  const unlockRes = await adminController.unlockEmployerPackage(unlockReq, res);
  console.log('Unlock result:', unlockRes.message);

  // 3. Verify access with canViewApplicantMatching
  const hasAccess = await canViewApplicantMatching(6);
  console.log('Employer 6 has paid applicant matching access:', hasAccess);
  if (!hasAccess) throw new Error('Employer 6 does not have access after unlock!');

  // 4. Verify getEmployerSubscriptionAdmin
  const subInfo = await adminController.getEmployerSubscriptionAdmin({ params: { employerId: 6 } }, res);
  console.log('Active subscription for Employer 6:', {
    PackageName: subInfo.data?.activeSubscription?.PackageName,
    EndDate: subInfo.data?.activeSubscription?.EndDate,
    RemainingPosts: subInfo.data?.activeSubscription?.RemainingPosts,
    RemainingSearches: subInfo.data?.activeSubscription?.RemainingSearches,
    PaymentMethod: subInfo.data?.activeSubscription?.PaymentMethod
  });

  console.log('✅ Admin unlock test passed successfully!');
  process.exit(0);
}

testUnlock().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

