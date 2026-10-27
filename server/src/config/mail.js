const path = require('path');
const nodemailer = require('nodemailer');

// Deployment environment variables take precedence over the local .env file.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isPlaceholder = (value) => /your_email|your_16_char|example\.com|your_password|your_google|placeholder/i.test(value);

const createTransporter = () => {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const gmail = !host || host.toLowerCase() === 'smtp.gmail.com';
  const pass = gmail ? rawPass.replace(/\s+/g, '') : rawPass;
  if (!user || !pass || isPlaceholder(user) || isPlaceholder(pass)) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  if (host && (!Number.isInteger(port) || port < 1 || port > 65535)) return null;

  return nodemailer.createTransport({
    ...(host ? {
      host,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      requireTLS: true
    } : { service: 'gmail' }),
    auth: { user, pass },
    dnsTimeout: 10000,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

const getMailFrom = (name = 'Jobtimize') => ({
  name,
  address: (process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim()
});

module.exports = { createTransporter, getMailFrom };
