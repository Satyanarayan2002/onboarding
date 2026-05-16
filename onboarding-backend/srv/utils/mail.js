const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // demo only
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

async function sendOtpMail(toEmail, otp) {
  await transporter.sendMail({
    from: "no-reply@onboarding.com",
    to: toEmail,                 // ✅ USER EMAIL
    subject: "Your OTP for Onboarding",
    text: `Your OTP is ${otp}. It is valid for 5 minutes.`
  });
}

async function sendStatusMail(toEmail, subject, text) {
  await transporter.sendMail({
    from: "no-reply@onboarding.com",
    to: toEmail,
    subject: subject,
    text: text
  });
}

module.exports = { sendOtpMail, sendStatusMail };