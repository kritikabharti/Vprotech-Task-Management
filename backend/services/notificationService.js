const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendMail } = require('./emailService');

// emailToo: when true, also emails the recipient (used for events worth
// an out-of-band nudge - approvals/returns - not every routine notice,
// to avoid over-emailing). Silently skipped if SMTP isn't configured;
// see emailService.js.
//
// IMPORTANT: the email send is intentionally NOT awaited here. SMTP
// (especially over a slow/rate-limited provider like Gmail) can take
// several seconds - or hang far longer on a bad connection - and an
// approval/rejection request has no reason to sit there waiting on an
// email round-trip before responding to the reviewer. The in-app
// Notification row (what actually drives the UI) is still created and
// awaited synchronously, so unread counts/bell badges are correct
// immediately; only the "nice to have" email nudge happens in the
// background, with its own error handling so a failed send never
// surfaces as an unhandled rejection.
async function notify({ recipient, message, type, relatedRecord = null, relatedModel = null, emailToo = false }) {
  try {
    const notification = await Notification.create({ recipient, message, type, relatedRecord, relatedModel });

    if (emailToo) {
      User.findById(recipient)
        .select('email fullName')
        .then((user) => {
          if (!user?.email) return null;
          return sendMail({
            to: user.email,
            subject: `VproTech Digital - ${type.replace(/_/g, ' ')}`,
            text: message,
            html: `<p>Hi ${user.fullName},</p><p>${message}</p>`,
          });
        })
        .catch((err) => console.error('Notification email failed:', err.message));
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
