const { PayOS } = require('@payos/node');

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
        accountName: response.accountName || process.env.BANK_ACCOUNT_NAME || null,
        accountNumber: response.accountNumber || process.env.BANK_ACCOUNT_NO || null,
        bin: response.bin || process.env.BANK_BIN || null,
        status: response.status
      };
    } catch (error) {
      console.error(`Lỗi khi tạo payment link payOS cho orderCode ${orderCode}:`, error.message || error);

      throw Object.assign(new Error('Không thể kết nối PayOS. Vui lòng thử lại sau; giao dịch chưa được thanh toán.'), { status: 503 });
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

    if (!this.isConfigured() || !this.payos) throw new Error('PayOS chưa được cấu hình.');
    if (webhookBody.code !== '00' || webhookBody.success !== true) throw new Error('Webhook không phải thanh toán thành công.');
    // The official SDK verifies the canonical gateway payload. Fail closed.
    return this.payos.webhooks.verify(webhookBody);
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

