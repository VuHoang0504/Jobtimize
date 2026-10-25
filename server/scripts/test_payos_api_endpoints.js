const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../src/config/db');
const paymentRoutes = require('../src/routes/paymentRoutes');
const payosService = require('../src/services/payosService');

async function testHttpEndpoints() {
  console.log('Testing HTTP Payment Routes directly via Express and native fetch...');

  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/payments`;

  try {
    // 1. Get test employer user
    const empRes = await executeQuery(`
      SELECT TOP 1 u.UserID, u.Email, r.RoleName, e.EmployerID, e.CompanyName
      FROM Users u
      JOIN UserRoles ur ON u.UserID = ur.UserID
      JOIN Roles r ON ur.RoleID = r.RoleID
      JOIN Employers e ON u.UserID = e.UserID
      WHERE r.RoleName = 'Employer'
    `);
    const user = empRes.recordset[0];
    const token = jwt.sign(
      { userId: user.UserID, email: user.Email, role: user.RoleName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Test POST /api/payments/create without auth -> 401
    const unauthRes = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 2 })
    });
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }
    console.log('✅ POST /api/payments/create without auth correctly rejected with 401');

    // 3. Test POST /api/payments/create with auth -> 200
    const createRes = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ packageId: 2 })
    });

    const createBody = await createRes.json();
    if (createRes.status !== 200 || !createBody.success) {
      throw new Error(`Create order failed: ${JSON.stringify(createBody)}`);
    }
    const orderCode = createBody.data.orderCode;
    console.log(`✅ POST /api/payments/create success: OrderCode #${orderCode}, amount: ${createBody.data.amount} đ`);

    // 4. Test GET /api/payments/:orderCode/status -> 200
    const statusRes = await fetch(`${baseUrl}/${orderCode}/status`);
    const statusBody = await statusRes.json();
    if (statusRes.status !== 200 || statusBody.data.status !== 'Pending') {
      throw new Error(`Expected status Pending, got ${statusBody.data?.status}`);
    }
    console.log(`✅ GET /api/payments/${orderCode}/status returned status: ${statusBody.data.status}`);

    // 5. Test POST /api/payments/payos-webhook with forged signature -> 400
    const fakeWebhookRes = await fetch(`${baseUrl}/payos-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { orderCode, amount: 2000 },
        signature: 'bad_signature_xyz'
      })
    });
    if (fakeWebhookRes.status !== 400) {
      throw new Error(`Expected 400 for forged webhook, got ${fakeWebhookRes.status}`);
    }
    console.log('✅ POST /api/payments/payos-webhook rejected forged signature with 400');

    // 6. Test POST /api/payments/payos-webhook with valid signature -> 200
    const validData = {
      orderCode,
      amount: 2000,
      description: `JOBTIMIZE ${String(orderCode).slice(-6)}`,
      accountNumber: '0387887153',
      reference: `NATIVE_FETCH_REF_${orderCode}`,
      transactionDateTime: new Date().toISOString(),
      currency: 'VND',
      paymentLinkId: `LINK_${orderCode}`,
      code: '00',
      desc: 'success'
    };
    const signature = payosService.createSignatureFromObj(validData, process.env.PAYOS_CHECKSUM_KEY);

    const validWebhookRes = await fetch(`${baseUrl}/payos-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: validData,
        signature
      })
    });

    const validWebhookBody = await validWebhookRes.json();
    if (validWebhookRes.status !== 200 || !validWebhookBody.success) {
      throw new Error(`Valid webhook failed: ${JSON.stringify(validWebhookBody)}`);
    }
    console.log('✅ POST /api/payments/payos-webhook successfully verified and activated package');

    // 7. Test GET /api/payments/:orderCode/status after activation -> status Success
    const statusSuccessRes = await fetch(`${baseUrl}/${orderCode}/status`);
    const statusSuccessBody = await statusSuccessRes.json();
    if (statusSuccessRes.status !== 200 || statusSuccessBody.data.status !== 'Success' || !statusSuccessBody.data.isSuccess) {
      throw new Error(`Expected status Success, got ${statusSuccessBody.data?.status}`);
    }
    console.log(`✅ GET /api/payments/${orderCode}/status confirmed: status = Success, isSuccess = true`);

    console.log('\n🎉 ALL HTTP ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!');
    server.close();
    process.exit(0);
  } catch (err) {
    server.close();
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testHttpEndpoints();

