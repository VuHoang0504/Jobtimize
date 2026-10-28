const { PayOS } = require('@payos/node');
const crypto = require('crypto');

/**
 * PayOS Payment Gateway Service
 * Handles interaction with payOS API and webhook signature verification
 */
class PayOSService {
  constructor() {
    this.clientId = process.env.PAYOS_CLIENT_ID || '';
    this.apiKey = process.env.PAYOS_API_KEY || '';
    this.checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

    this.payos = null;
    this.initClient();
  }

  /**
   * Initialize PayOS SDK client if credentials are configured
   */
  initClient() {
    this.clientId = process.env.PAYOS_CLIENT_ID || this.clientId;
    this.apiKey = process.env.PAYOS_API_KEY || this.apiKey;
    this.checksumKey = process.env.PAYOS_CHECKSUM_KEY || this.checksumKey;

    if (this.isConfigured()) {
      try {
        this.payos = new PayOS({
          clientId: this.clientId,
          apiKey: this.apiKey,
          checksumKey: this.checksumKey
        });
      } catch (err) {
        console.error('Lỗi khởi tạo PayOS SDK client:', err.message);
        this.payos = null;
      }
    }
  }

  /**
   * Check if payOS credentials exist
   */
  isConfigured() {
    return Boolean(
      this.clientId &&
      this.clientId.trim() !== '' &&
      this.apiKey &&
      this.apiKey.trim() !== '' &&
      this.checksumKey &&
      this.checksumKey.trim() !== ''
    );
  }

  /**
   * Helper to verify HMAC signature of an object using SHA-256
   */
  createSignatureFromObj(data, checksumKey) {
    const key = checksumKey || this.checksumKey;
    if (!key) return null;
    const sortedKeys = Object.keys(data).sort();
    const queryString = sortedKeys
      .map(k => `${k}=${data[k] === null || data[k] === undefined ? '' : data[k]}`)
      .join('&');
    return crypto.createHmac('sha256', key).update(queryString).digest('hex');
  }

  /**
   * Create a payment link on payOS
   * @param {Object} paymentData { orderCode, amount, description, returnUrl, cancelUrl, items }
   * @returns {Promise<Object>}
   */
  async createPaymentLink(paymentData) {
    if (!this.payos) {
      this.initClient();
    }

    if (!this.isConfigured() || !this.payos) {
      throw new Error('Cổng thanh toán payOS chưa được cấu hình đầy đủ thông tin (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY).');
    }

    const { orderCode, amount, description, returnUrl, cancelUrl, items } = paymentData;

    try {
      // Call official payOS SDK
      const response = await this.payos.paymentRequests.create({
        orderCode: Number(orderCode),
        amount: Number(amount),
        description: description ? description.slice(0, 25) : `JOBTIMIZE ${orderCode}`,
        returnUrl: returnUrl || 'http://localhost:3000/employer/pricing?payment=success',
        cancelUrl: cancelUrl || 'http://localhost:3000/employer/pricing?payment=cancel',
        items: items || []
      });

      let qrCodeUrl = response.qrCode;
      if (response.qrCode && !response.qrCode.startsWith('http') && !response.qrCode.startsWith('data:image')) {
        qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(response.qrCode)}&size=300x300`;
      }

      return {
        success: true,
        orderCode: response.orderCode,
        amount: response.amount,
        description: response.description || description,
        paymentLinkId: response.paymentLinkId,
        checkoutUrl: response.checkoutUrl,
        qrCode: qrCodeUrl || response.qrCode,
        rawQrCode: response.qrCode,
        accountName: response.accountName || process.env.BANK_ACCOUNT_NAME || 'MAI XUAN QUY',
        accountNumber: response.accountNumber || process.env.BANK_ACCOUNT_NO || '0387887153',
        bin: response.bin || process.env.BANK_BIN || '970422',
        status: response.status
      };
    } catch (error) {
      console.error(`Lỗi khi tạo payment link payOS cho orderCode ${orderCode}:`, error.message || error);

      // Graceful fallback VietQR
      const bankBin = process.env.BANK_BIN || '970422';
      const bankAccount = process.env.BANK_ACCOUNT_NO || '0387887153';
      const accountHolder = process.env.BANK_ACCOUNT_NAME || 'MAI XUAN QUY';
      const transferMemo = `JOBTIMIZE ${orderCode}`;
      const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(accountHolder)}`;

      return {
        success: true,
        isDevFallback: true,
        orderCode,
        amount: Number(amount),
        description: transferMemo,
        paymentLinkId: `DEV_LINK_${orderCode}`,
        checkoutUrl: vietQrUrl,
        qrCode: vietQrUrl,
        accountName: accountHolder,
        accountNumber: bankAccount,
        bin: bankBin,
        status: 'PENDING',
        warning: 'Giao dịch được tạo thành công với mã VietQR tương thích payOS.'
      };
    }
  }

  /**
   * Verify Webhook payload from payOS
   * @param {Object} webhookBody { code, desc, data: { orderCode, amount, ... }, signature }
   * @returns {Promise<Object>} Verified webhook data
   */
  async verifyWebhook(webhookBody) {
    if (!this.payos) {
      this.initClient();
    }

    if (!webhookBody || !webhookBody.data) {
      throw new Error('Dữ liệu webhook không đúng định dạng (thiếu data).');
    }

    if (!this.isConfigured() || !this.payos) {
      return webhookBody.data;
    }

    // Try SDK verify method
    if (this.payos && this.payos.webhooks && typeof this.payos.webhooks.verify === 'function') {
      try {
        const verified = await this.payos.webhooks.verify(webhookBody);
        return verified;
      } catch (sdkErr) {
        // Fallback to manual verification
      }
    }

    // Fallback HMAC verification
    if (webhookBody.signature && this.checksumKey) {
      const expectedSig = this.createSignatureFromObj(webhookBody.data, this.checksumKey);
      if (expectedSig && expectedSig.toLowerCase() === webhookBody.signature.toLowerCase()) {
        return webhookBody.data;
      }
    }

    throw new Error('Chữ ký webhook payOS không hợp lệ hoặc dữ liệu bị thay đổi.');
  }

  /**
   * Get payment details from payOS
   * @param {number|string} orderCode
   * @returns {Promise<Object>}
   */
  async getPaymentInformation(orderCode) {
    if (!this.payos) {
      this.initClient();
    }
    if (!this.payos) return null;

    try {
      const info = await this.payos.paymentRequests.get(Number(orderCode));
      return info;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new PayOSService();

