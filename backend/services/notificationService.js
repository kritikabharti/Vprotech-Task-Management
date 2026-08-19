const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendMail } = require('./emailService');

// emailToo: when true, also emails the recipient (used for events worth
// an out-of-band nudge - approvals/returns - not every routine notice,
// to avoid over-emailing). Silently skipped if SMTP isn't configured;
// see emailService.js.
async function notify({ recipient, message, type, relatedRecord = null, relatedModel = null, emailToo = false }) {
  try {
    const notification = await Notification.create({ recipient, message, type, relatedRecord, relatedModel });

    if (emailToo) {
      const user = await User.findById(recipient).select('email fullName');
      if (user?.email) {
        await sendMail({
          to: user.email,
          subject: `VproTech Digital - ${type.replace(/_/g, ' ')}`,
          text: message,
          html: `<p>Hi ${user.fullName},</p><p>${message}</p>`,
        });
      }
    }

    return notification;
  } catch (err) {
    console.error('Notification create failed:', err.message);
    return null;
  }
}

async function notifyMany(recipients, { message, type, relatedRecord = null, relatedModel = null, emailToo = false }) {
  return Promise.all(
    recipients.map((recipient) => notify({ recipient, message, type, relatedRecord, relatedModel, emailToo }))
  );
}

module.exports = { notify, notifyMany };
