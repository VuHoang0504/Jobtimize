const { test } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const { createTransporter, getMailFrom } = require('../src/config/mail');
const { sendOtpEmail } = require('../src/services/emailService');
const store = require('../src/utils/otpStore');

// No real database writes or email deliveries in this regression suite.
let queryResult = { recordset: [] };
let queryCount = 0;
require.cache[require.resolve('../src/config/db')] = {
  exports: { executeQuery: async () => { queryCount++; return queryResult; } }
};
const auth = require('../src/controllers/authController');
const email = 'otp-test@example.org';
const registration = { email, password: 'StrongPassword1!', fullName: 'Test <User>', roleName: 'Candidate' };

async function call(handler, body) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await handler({ body }, res);
  return res;
}

test('OTP email and authentication regression', async (t) => {
  const envKeys = ['EMAIL_USER', 'EMAIL_PASS', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const previousEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const originalTransport = nodemailer.createTransport;
  let options;
  let sent;
  let failure;
  let accepted = true;
  nodemailer.createTransport = (config) => {
    options = config;
    return {
      sendMail: async (mail) => {
        sent = mail;
        if (failure) throw Object.assign(new Error('SMTP failed'), { code: failure });
        return { accepted: accepted ? [email] : [], messageId: 'test-message' };
      },
      close() {}
    };
  };
  const configure = () => {
    envKeys.forEach(key => delete process.env[key]);
    process.env.EMAIL_USER = 'sender@gmail.com';
    process.env.EMAIL_PASS = 'abcd efgh ijkl mnop';
    failure = undefined;
    accepted = true;
    sent = undefined;
    queryResult = { recordset: [] };
    queryCount = 0;
    store.deleteOtp(email);
    store.deleteOtp(email, 'reset_password');
  };

  try {
    await t.test('missing credentials fail without simulation or OTP disclosure', async () => {
      configure();
      process.env.EMAIL_USER = '';
      process.env.EMAIL_PASS = '';
      assert.deepEqual(await sendOtpEmail(email, '123456'), { success: false, code: 'EMAIL_NOT_CONFIGURED' });
      const res = await call(auth.register, registration);
      assert.equal(res.statusCode, 503);
      assert.equal(store.getOtpRecord(email), null);
      assert.equal(res.body.data, undefined);
    });

    await t.test('Gmail app-password spaces are stripped and environment values preserved', () => {
      configure();
      createTransporter();
      assert.equal(options.service, 'gmail');
      assert.equal(options.auth.user, 'sender@gmail.com');
      assert.equal(options.auth.pass, 'abcdefghijklmnop');
      assert.equal(options.dnsTimeout, 10000);
    });

    await t.test('custom SMTP respects host, TLS, credentials, and sender', () => {
      configure();
      Object.assign(process.env, { SMTP_HOST: 'smtp.example.org', SMTP_PORT: '465', SMTP_USER: 'smtp-user', SMTP_PASS: 'a password with spaces', SMTP_FROM: 'mail@example.org' });
      createTransporter();
      assert.equal(options.host, 'smtp.example.org');
      assert.equal(options.secure, true);
      assert.equal(options.auth.pass, 'a password with spaces');
      assert.equal(options.auth.user, 'smtp-user');
      assert.equal(getMailFrom().address, 'mail@example.org');
      process.env.SMTP_PORT = '587';
      createTransporter();
      assert.equal(options.secure, false);
      assert.equal(options.requireTLS, true);
      process.env.SMTP_PORT = 'invalid';
      assert.equal(createTransporter(), null);
    });

    await t.test('SMTP authentication, timeout and rejection errors are not success', async () => {
      configure();
      for (const code of ['EAUTH', 'ETIMEDOUT', 'EENVELOPE']) {
        failure = code;
        assert.deepEqual(await sendOtpEmail(email, '123456'), { success: false, code });
      }
      failure = undefined;
      accepted = false;
      assert.equal((await sendOtpEmail(email, '123456')).success, false);
    });

    await t.test('successful registration mails a code but never returns it to the browser', async () => {
      configure();
      const res = await call(auth.register, { ...registration, email: '  OTP-Test@Example.org ' });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.requireOtp, true);
      assert.equal(sent.to, email);
      assert.match(sent.html, /Test &lt;User&gt;/);
      const record = store.getOtpRecord(email);
      assert.match(record.otp, /^\d{6}$/);
      assert.ok(sent.text.includes(record.otp));
      assert.equal(JSON.stringify(res.body).includes(record.otp), false);
      assert.equal(record.registrationData.email, email);
    });

    await t.test('malformed recipient is rejected before database or SMTP access', async () => {
      configure();
      const res = await call(auth.register, { ...registration, email: 'one@example.org,two@example.org' });
      assert.equal(res.statusCode, 400);
      assert.equal(queryCount, 0);
      assert.equal(sent, undefined);
    });

    await t.test('failed registration and resend preserve the existing code and expiry', async () => {
      configure();
      store.saveOtp(email, '123456', registration);
      const previous = store.getOtpRecord(email);
      failure = 'EAUTH';
      for (const [handler, body] of [[auth.register, registration], [auth.resendOtp, { email }]]) {
        const res = await call(handler, body);
        assert.equal(res.statusCode, 503);
        assert.equal(res.body.success, false);
        assert.strictEqual(store.getOtpRecord(email), previous);
        assert.equal(res.body.data, undefined);
      }
    });

    await t.test('successful resend activates the emailed code', async () => {
      configure();
      store.saveOtp(email, '000000', registration);
      const res = await call(auth.resendOtp, { email });
      const record = store.getOtpRecord(email);
      assert.equal(res.statusCode, 200);
      assert.ok(sent.text.includes(record.otp));
      assert.equal(store.verifyOtp(email, '000000').valid, false);
      assert.equal(JSON.stringify(res.body).includes(record.otp), false);
    });

    await t.test('forgot-password failure preserves the existing reset code', async () => {
      configure();
      queryResult = { recordset: [{ UserID: 1, FullName: 'Test', Status: 'Active' }] };
      store.saveOtp(email, '123456', { type: 'reset_password' });
      const previous = store.getOtpRecord(email, 'reset_password');
      failure = 'ETIMEDOUT';
      assert.equal((await call(auth.forgotPassword, { email })).statusCode, 503);
      assert.strictEqual(store.getOtpRecord(email, 'reset_password'), previous);
    });

    await t.test('forgot-password success sends the reset template without disclosing the code', async () => {
      configure();
      queryResult = { recordset: [{ UserID: 1, FullName: 'Test', Status: 'Active' }] };
      const res = await call(auth.forgotPassword, { email });
      const record = store.getOtpRecord(email, 'reset_password');
      assert.equal(res.statusCode, 200);
      assert.ok(sent.text.includes(record.otp));
      assert.match(sent.subject, /đặt lại mật khẩu/);
      assert.equal(JSON.stringify(res.body).includes(record.otp), false);
      assert.equal((await call(auth.verifyResetOtp, { email, otp: record.otp })).statusCode, 200);
    });

    await t.test('registration and reset codes cannot overwrite or verify each other', async () => {
      configure();
      store.saveOtp(email, '111111', registration);
      store.saveOtp(email, '222222', { type: 'reset_password' });
      assert.equal(store.verifyOtp(email, '111111').valid, true);
      assert.equal((await call(auth.verifyResetOtp, { email, otp: '111111' })).statusCode, 400);
      assert.equal((await call(auth.resetPassword, { email, otp: '111111', newPassword: 'StrongPassword2!' })).statusCode, 400);
      assert.equal((await call(auth.verifyEmailOtp, { email, otp: '222222' })).statusCode, 400);
      assert.equal(queryCount, 0);
      store.deleteOtp(email, 'reset_password');
      assert.equal(store.verifyOtp(email, '111111').valid, true);
    });

    await t.test('expired codes cannot be verified or resent', async () => {
      configure();
      store.saveOtp(email, '123456', registration, -1);
      assert.equal(store.verifyOtp(email, '123456').valid, false);
      assert.equal((await call(auth.resendOtp, { email })).statusCode, 400);
      assert.equal(sent, undefined);
    });
  } finally {
    nodemailer.createTransport = originalTransport;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    store.deleteOtp(email);
    store.deleteOtp(email, 'reset_password');
  }
});
