const cds = require("@sap/cds");
require("dotenv").config();

console.log("📌 ENV CHECK:");
console.log("MAIL_USER:", process.env.MAIL_USER ? "✅ loaded" : "❌ missing");

const { sendOtpMail } = require("./utils/mail");

module.exports = cds.service.impl(async function () {

  /**
   * =========================
   * SEND OTP (EMAIL ONLY)
   * =========================
   */
  this.on("sendOTP", async (req) => {
    const { email } = req.data;
    console.log("📩 sendOTP called with email:", email);

    if (!email) {
      console.error("❌ Email missing");
      req.reject(400, "Email is required");
    }

    // Invalidate previous OTPs for this email
    const invalidateResult = await cds.tx(req).run(
      UPDATE("onboarding.db.OTPRequests")
        .set({ verified: false })
        .where({ email })
    );
    console.log("🧹 Previous OTPs invalidated:", invalidateResult);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store OTP in DB
    await cds.tx(req).run(
      INSERT.into("onboarding.db.OTPRequests").entries({
        email,
        otp,
        expiresAt,
        verified: false
      })
    );

    console.log(`✅ OTP GENERATED for ${email}: ${otp}`);
    console.log("⏰ OTP expires at (UTC):", expiresAt.toISOString());

    // ✅ Send OTP via EMAIL ONLY
    await sendOtpMail(email, otp);
    console.log("📧 OTP sent to email:", email);

    return "OTP_SENT";
  });

  /**
   * =========================
   * VERIFY OTP
   * =========================
   */
  this.on("verifyOTP", async (req) => {
    const { email, otp } = req.data;
    console.log("🔐 verifyOTP called with:", email, otp);

    const record = await cds.tx(req).run(
      SELECT.one
        .from("onboarding.db.OTPRequests")
        .where({ email, otp })
        .orderBy({ expiresAt: "desc" })
    );

    console.log("📄 OTP record found:", record);

    if (!record) {
      console.error("❌ OTP not found or mismatch");
      req.reject(401, "Invalid OTP");
    }

    if (new Date() > new Date(record.expiresAt)) {
      console.error("❌ OTP expired");
      req.reject(401, "OTP expired");
    }

    await cds.tx(req).run(
      UPDATE("onboarding.db.OTPRequests")
        .set({ verified: true })
        .where({ ID: record.ID })
    );

    console.log(`✅ OTP VERIFIED for ${email}`);
    return true;
  });

  /**
   * =========================
   * FINAL SUBMIT – ENFORCE OTP
   * =========================
   */
  this.on("submitOnboarding", async (req) => {
    const email = req.data.email?.trim();
    console.log("🚀 submitOnboarding called with:", email);

    const allOtps = await cds.tx(req).run(
      SELECT
        .from("onboarding.db.OTPRequests")
        .where({ email })
        .orderBy({ expiresAt: "desc" })
    );
    console.log("🧾 All OTP records for email:", allOtps);

    const verifiedOtp = allOtps.find(o => o.verified === true);

    if (!verifiedOtp) {
      console.error("❌ No VERIFIED OTP found – blocking onboarding");
      req.reject(
        403,
        "OTP not verified. Please verify OTP before submitting onboarding."
      );
    }

    console.log("✅ VERIFIED OTP FOUND:", verifiedOtp);

    // Cleanup OTPs after successful submit
    await cds.tx(req).run(
      DELETE.from("onboarding.db.OTPRequests")
        .where({ email })
    );
    console.log("🧹 OTP records cleaned after submit");

    console.log(`🎉 ONBOARDING SUBMITTED for ${email}`);
    return "ONBOARDING_SUBMITTED";
  });

});
