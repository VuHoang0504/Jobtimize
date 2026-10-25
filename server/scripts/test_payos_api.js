const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PayOS } = require('@payos/node');

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY
});

async function run() {
  try {
    const orderCode = Number(Date.now().toString().slice(-6) + Math.floor(Math.random() * 899 + 100));
    console.log('Sending create request with orderCode:', orderCode);
    const result = await payos.paymentRequests.create({
      orderCode,
      amount: 2000,
      description: 'JOBTIMIZE ' + orderCode.toString().slice(-6),
      returnUrl: 'http://localhost:3000/employer/pricing?success=true',
      cancelUrl: 'http://localhost:3000/employer/pricing?cancel=true'
    });

    console.log('Payment Request Success:');
    console.log('- orderCode:', result.orderCode);
    console.log('- amount:', result.amount);
    console.log('- checkoutUrl:', result.checkoutUrl);
    console.log('- qrCode string length:', result.qrCode ? result.qrCode.length : 0);
    console.log('- status:', result.status);
    console.log('- paymentLinkId:', result.paymentLinkId);
    console.log('- bin:', result.bin);
    console.log('- accountNumber:', result.accountNumber);
    console.log('- accountName:', result.accountName);

    // Test get payment info
    console.log('Testing get payment info for orderCode:', orderCode);
    const info = await payos.paymentRequests.get(orderCode);
    console.log('Fetched info status:', info.status, 'amount:', info.amount);

    process.exit(0);
  } catch (error) {
    console.error('payOS API test error:', error);
    process.exit(1);
  }
}

run();

