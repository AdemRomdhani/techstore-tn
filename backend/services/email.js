const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const from = process.env.EMAIL_FROM || 'Tech Store <noreply@techstore.com>';

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const emailQueue = [];
let processing = false;

const processQueue = async () => {
  if (processing || emailQueue.length === 0) return;
  processing = true;
  while (emailQueue.length > 0) {
    const { to, subject, html, resolve, reject } = emailQueue.shift();
    try {
      const info = await transporter.sendMail({ from, to, subject, html });
      console.log(`[Email] Sent to ${to}: ${info.messageId}`);
      resolve({ sent: true, messageId: info.messageId });
    } catch (err) {
      console.error('[Email] Failed:', err.message);
      reject({ sent: false, error: err.message });
    }
  }
  processing = false;
};

const sendEmail = (to, subject, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_HOST) {
    console.log(`[Email] SMTP not configured. Would send to ${to}: ${subject}`);
    return Promise.resolve({ sent: false, reason: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env' });
  }

  return new Promise((resolve, reject) => {
    emailQueue.push({ to, subject, html, resolve, reject });
    processQueue();
  });
};

const templates = {
  orderConfirmation: (order) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Order Confirmed! #${order.id}</h2>
      <p>Thank you for your order, ${escapeHtml(order.shipping_name)}!</p>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order Summary</h3>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
        <p><strong>Shipping to:</strong> ${escapeHtml(order.shipping_address)}, ${escapeHtml(order.shipping_city)}</p>
      </div>
      <p style="color: #6b7280;">We'll notify you when your order ships.</p>
    </div>
  `,
  orderStatusUpdate: (order, oldStatus) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Order Status Updated</h2>
      <p>Your order #${order.id} status has been updated.</p>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Previous Status:</strong> ${escapeHtml(oldStatus)}</p>
        <p><strong>New Status:</strong> ${escapeHtml(order.status)}</p>
      </div>
    </div>
  `,
  welcomeEmail: (user) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Welcome to Tech Store!</h2>
      <p>Hi ${escapeHtml(user.name)},</p>
      <p>Your account has been created successfully.</p>
      <p>Start exploring our amazing products!</p>
    </div>
  `,
};

module.exports = { sendEmail, templates };
