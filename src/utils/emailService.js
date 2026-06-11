const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendClientReviewLink({ clientEmail, clientName, projectId, reviewToken, appUrl }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] SMTP not configured. Review link: ${appUrl}/client-review.html?token=${reviewToken}`);
    return false;
  }
  const link = `${appUrl}/client-review.html?token=${reviewToken}`;
  await t.sendMail({
    from: env.EMAIL_FROM,
    to: clientEmail,
    subject: `[Reels in 360] Your video is ready for review — ${projectId}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6d28d9">Reels in 360</h2>
        <p>Hi ${clientName},</p>
        <p>Your video for project <strong>${projectId}</strong> is ready for review.</p>
        <p>Please click the button below to watch and approve or request revisions:</p>
        <a href="${link}" style="display:inline-block;background:#6d28d9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Review Your Video
        </a>
        <p style="margin-top:24px;color:#666;font-size:12px">If the button doesn't work, copy this link: ${link}</p>
        <hr/>
        <p style="color:#999;font-size:11px">Reels in 360 | Professional Video Production</p>
      </div>
    `,
  });
  return true;
}

async function sendFollowUpReminder({ to, leadName, message }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] SMTP not configured. Follow-up reminder for: ${leadName}`);
    return false;
  }
  await t.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: `[Reels in 360] Follow-up Reminder: ${leadName}`,
    html: `<p>${message}</p>`,
  });
  return true;
}

module.exports = { sendClientReviewLink, sendFollowUpReminder };
