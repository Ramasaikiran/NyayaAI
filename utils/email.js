const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const templates = {
  lawyerRegistered: (lawyer) => ({
    subject: `New Lawyer Registration — ${lawyer.name} (${lawyer.bar_reg_no})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#d4a843">New Lawyer Registration — Action Required</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${lawyer.name}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Bar Council Reg</td><td style="padding:8px;border-bottom:1px solid #eee">${lawyer.bar_reg_no}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">State Bar</td><td style="padding:8px;border-bottom:1px solid #eee">${lawyer.state_bar}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Specialisation</td><td style="padding:8px;border-bottom:1px solid #eee">${lawyer.specialisation}</td></tr>
          <tr><td style="padding:8px;font-weight:600">Email</td><td style="padding:8px">${lawyer.email}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#fff8e7;border-left:4px solid #d4a843">
          <strong>Verification steps:</strong><br>
          1. Search reg no. on <a href="https://www.barcouncilofindia.org">barcouncilofindia.org</a><br>
          2. Confirm name matches documents<br>
          3. Approve or reject in admin dashboard
        </div>
        <a href="${process.env.FRONTEND_URL}/admin" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#d4a843;color:#000;text-decoration:none;border-radius:8px;font-weight:600">Open Admin Dashboard →</a>
      </div>`
  }),
  lawyerApproved: (lawyer) => ({
    subject: 'Your Nyaya AI advocate account has been approved',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4caf82">Congratulations, ${lawyer.name}!</h2>
        <p>Your advocate account on Nyaya AI has been <strong>verified and approved</strong>.</p>
        <p>Your Bar Council registration <strong>${lawyer.bar_reg_no}</strong> has been confirmed as active.</p>
        <p>You can now log in to your dashboard to start receiving review requests.</p>
        <a href="${process.env.FRONTEND_URL}/lawyer-dashboard" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4caf82;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Go to Lawyer Dashboard →</a>
      </div>`
  }),
  lawyerRejected: (lawyer, reason) => ({
    subject: 'Nyaya AI — Advocate verification update',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#e05252">Verification could not be completed</h2>
        <p>Dear ${lawyer.name},</p>
        <p>We were unable to verify your advocate registration. Reason:</p>
        <div style="padding:16px;background:#fef2f2;border-left:4px solid #e05252;margin:16px 0">${reason}</div>
        <p>You may reapply with the correct documents. If you believe this is an error, contact us at admin@nyayaai.in.</p>
      </div>`
  }),
  reviewAssigned: (lawyer, review) => ({
    subject: `New review request assigned — ${review.case_type} (${review.plan})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#d4a843">New review assigned to you</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Case type</td><td style="padding:8px;border-bottom:1px solid #eee">${review.case_type}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Plan</td><td style="padding:8px;border-bottom:1px solid #eee">${review.plan} (₹${review.amount_paid})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">Client phone</td><td style="padding:8px;border-bottom:1px solid #eee">${review.client_phone}</td></tr>
          <tr><td style="padding:8px;font-weight:600">Client email</td><td style="padding:8px">${review.client_email}</td></tr>
        </table>
        <p style="color:#e05252;margin-top:16px"><strong>Please complete this review within 48 hours.</strong></p>
        <a href="${process.env.FRONTEND_URL}/lawyer-dashboard" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#d4a843;color:#000;text-decoration:none;border-radius:8px;font-weight:600">Open Dashboard →</a>
      </div>`
  }),
  reviewComplete: (user, review) => ({
    subject: `Your ${review.case_type} petition review is complete`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4caf82">Your petition review is ready</h2>
        <p>Your advocate has completed the review of your ${review.case_type} petition.</p>
        <p>Case ID: <strong>${review.review_id}</strong></p>
        <p>Log in to your dashboard to download the reviewed draft with corrections and notes.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4caf82;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View Reviewed Draft →</a>
        <p style="margin-top:20px;font-size:13px;color:#888">Please rate your experience after reviewing the document.</p>
      </div>`
  })
};

async function sendEmail(to, templateName, data) {
  try {
    const template = templates[templateName](data);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: template.subject,
      html: template.html
    });
    console.log(`Email sent: ${templateName} to ${to}`);
  } catch (err) {
    console.error(`Email failed: ${templateName}`, err.message);
  }
}

module.exports = { sendEmail };
