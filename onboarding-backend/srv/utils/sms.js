const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendOtpSms(mobile, otp) {
  await client.messages.create({
    body: `Your onboarding OTP is ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_NUMBER,
    to: mobile                 // ✅ USER MOBILE
  });
}

module.exports = { sendOtpSms };
