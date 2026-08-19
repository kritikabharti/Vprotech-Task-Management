const nodemailer = require('nodemailer');

/**
 * Real SMTP transport, activated only when SMTP_HOST/SMTP_USER/SMTP_PASS
 * are set in the environment. Without them, sendMail() logs to the
 * console and resolves as a no-op so the rest of the app (and local
 * dev/testing) keeps working without a mail server. This mirrors the
 * pattern the auth controller already used for password-reset tokens.
 */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || `"${process.env.COMPANY_NAME || 'VproTech Digital'}" <no-reply@vprotech.com>`;

  if (!t) {
    // No SMTP configured - log instead of failing, so password reset
    // and other notifications never block on missing mail config.
    console.log(`[emailService] SMTP not configured - would have sent to ${to}: ${subject}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await t.sendMail({ from, to, subject, html, text });
    return { sent: true };
  } catch (err) {
    console.error('[emailService] sendMail failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  return sendMail({
    to: user.email,
    subject: 'Reset your VproTech Digital password',
    text: `Hi ${user.fullName}, reset your password here: ${resetUrl} (expires in 30 minutes). If you didn't request this, ignore this email.`,
    html: `<p>Hi ${user.fullName},</p><p>Click below to reset your password. This link expires in 30 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

module.exports = { sendMail, sendPasswordResetEmail };
