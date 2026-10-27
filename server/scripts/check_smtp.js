// Checks connection and authentication only; does not send an email.
const { createTransporter } = require('../src/config/mail');
const transport = createTransporter();
if (!transport) {
  console.error('SMTP is not configured. Set EMAIL_USER/EMAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS.');
  process.exit(1);
}

const deadline = setTimeout(() => {
  console.error('SMTP verification timed out. Check network access to the SMTP host/port.');
  transport.close();
  process.exit(1);
}, 30000);

transport.verify().then(() => {
  console.log('SMTP connection and authentication succeeded. No email was sent.');
}).catch((error) => {
  console.error('SMTP verification failed:', error.code || 'UNKNOWN', error.responseCode || '');
  process.exitCode = 1;
}).finally(() => {
  clearTimeout(deadline);
  transport.close();
});
