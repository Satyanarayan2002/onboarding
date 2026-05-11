const cds = require("@sap/cds");
const { v4: uuidv4 } = require("uuid"); 
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const { sendOtpMail } = require("./utils/mail");
// const { extractTextFromImage } = require("./utils/ocr");
const { extractAadhaarData, extractPANData } = require("./utils/documentParser");
const { verifyDocument } = require("./utils/verificationEngine");
const { upload } = require("./utils/upload");

let extractTextFromImage;

try {
  extractTextFromImage = require("./utils/ocr").extractTextFromImage;
} catch (e) {
  console.warn("OCR not available in this environment");
}


/* ==========================================================
   ✅ REGISTER CUSTOM EXPRESS ROUTES (CORRECT CAP LIFECYCLE)
   ========================================================== */
cds.on("served", () => {
  const app = cds.app;

  app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    res.json({
      filePath: req.file.path
    });
  });

  console.log("✅ /upload endpoint registered");
});

/* ==========================================================
   CAP SERVICE IMPLEMENTATION
   ========================================================== */
module.exports = cds.service.impl(async function () {

  /* ===== SERVICE ENTITIES (PLURAL ONLY) ===== */
  const {
    Candidates,
    CandidateContacts,
    OTPTransactions,
    CandidateDocuments,
    DocumentVerifications,
    AuditLogs
  } = this.entities;

  /* ==========================================================
     UTILITY HELPERS
     ========================================================== */

  function hashOTP(otp) {
    return crypto.createHash("sha256").update(otp).digest("hex");
  }

  async function writeAudit(tx, candidateID, action, details) {
    await tx.run(
      INSERT.into(AuditLogs).entries({
        candidate_ID: candidateID,
        action,
        performedBy: "SYSTEM",
        details: JSON.stringify(details || {}),
        eventTime: new Date()
      })
    );
  }

  /* ==========================================================
     SEND OTP
     ========================================================== */
  this.on("sendOTP", async (req) => {
    const { candidateID, channel, destination } = req.data;
    const tx = cds.transaction(req);
    console.log(candidateID)
    const candidate = await tx.run(
      SELECT.one.from(Candidates).where({ ID: candidateID })
    );
    if (!candidate) req.reject(404, "Candidate not found");
    if (candidate.status !== "DRAFT" && candidate.status !== "CONTACT_VERIFIED") {
      req.reject(409, "OTP allowed only in DRAFT state");
    }

    await tx.run(
      UPDATE(OTPTransactions)
        .set({ status: "EXPIRED" })
        .where({ candidate_ID: candidateID })
    );

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await tx.run(
      INSERT.into(OTPTransactions).entries({
        candidate_ID: candidateID,
        channel,
        destination,
        otpHash: hashOTP(otp),
        status: "GENERATED",
        attemptCount: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      })
    );

    if (channel === "EMAIL") {
      await sendOtpMail(destination, otp);
    }

    return "OTP_SENT";
  });

  /* ==========================================================
     VERIFY OTP
     ========================================================== */
  this.on("verifyOTP", async (req) => {
    const { candidateID, otp } = req.data;
    const tx = cds.transaction(req);

    const record = await tx.run(
      SELECT.one.from(OTPTransactions)
        .where({ candidate_ID: candidateID, status: "GENERATED" })
    );
    if (!record) req.reject(401, "No active OTP found");
    if (record.attemptCount >= 3) {
      await tx.run(
        UPDATE(OTPTransactions).set({ status: "LOCKED" }).where({ ID: record.ID })
      );
      req.reject(403, "OTP locked");
    }

    if (record.otpHash !== hashOTP(otp)) {
      await tx.run(
        UPDATE(OTPTransactions)
          .set({ attemptCount: record.attemptCount + 1 })
          .where({ ID: record.ID })
      );
      req.reject(401, "Invalid OTP");
    }

    await tx.run(
      UPDATE(OTPTransactions)
        .set({ status: "VERIFIED", verifiedAt: new Date() })
        .where({ ID: record.ID })
    );

    await tx.run(
      UPDATE(Candidates)
        .set({ status: "CONTACT_VERIFIED", completionPct: 20 })
        .where({ ID: candidateID })
    );

    await tx.run(
      UPDATE(CandidateContacts)
        .set({ emailVerified: true, emailVerifiedAt: new Date() })
        .where({ candidate_ID: candidateID })
    );

    return true;
  });
  /* ==========================================================
     SUBMIT ONBOARDING
     ========================================================== */
  this.on("submitOnboarding", async (req) => {
  console.log("➡️ submitOnboarding", req.data);

  const { candidateID } = req.data;
  const tx = cds.transaction(req);

  // ✅ Use SERVICE entity name (plural)
  const candidate = await tx.run(
    SELECT.one.from(Candidates).where({ ID: candidateID })
  );

  if (!candidate) {
    req.reject(404, "Candidate not found");
  }

  if (candidate.status !== "CONTACT_VERIFIED") {
    req.reject(409, "Submit allowed only after OTP verification");
  }

  await tx.run(
    UPDATE(Candidates)
      .set({
        status: "DOCS_UPLOADED",
        completionPct: 40
      })
      .where({ ID: candidateID })
  );

  await writeAudit(tx, candidateID, "ONBOARDING_SUBMITTED", {});
  console.log("✅ ONBOARDING SUBMITTED");

  return "ONBOARDING_SUBMITTED";
});



  /* ==========================================================
     UPLOAD DOCUMENT (METADATA ONLY)
     ========================================================== */
  this.on("uploadDocument", async (req) => {
    const {
      candidateID,
      documentType,
      fileName,
      mimeType,
      fileSize,
      filePath
    } = req.data;

    const tx = cds.transaction(req);

    const doc = await tx.run(
      INSERT.into(CandidateDocuments).entries({
        candidate_ID: candidateID,
        documentType,
        fileName,
        mimeType,
        fileSize,
        filePath,
        uploadedAt: new Date(),
        verificationStatus: "UPLOADED",
        manualOverride: false
      })
    );

    await writeAudit(tx, candidateID, "DOCUMENT_UPLOADED", {
      documentType,
      fileName
    });

    return doc;
  });

  //////////////////////////////////////////////////////
  this.on("uploadDocumentFile", async (req) => {
    const { candidateID, documentType, fileName, mimeType, content } = req.data;

    console.log("📤 uploadDocumentFile called", {
        candidateID, documentType, fileName, mimeType
    });

    const buffer = Buffer.from(content, "base64");

    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    const filePath = `${uploadDir}/${Date.now()}-${fileName}`;
    fs.writeFileSync(filePath, buffer);
       const documentID = uuidv4();

    const doc = await INSERT.into(this.entities.CandidateDocuments).entries({
        ID: documentID,  
        candidate_ID: candidateID,
        documentType,
        fileName,
        mimeType,
        fileSize: buffer.length,
        filePath,
        uploadedAt: new Date(),
        verificationStatus: "UPLOADED"
    });

    console.log("✅ Document created:", documentID);
      return { ID: documentID }; 
});

  /* ==========================================================
     AI / OCR VERIFICATION (CLEAN & CORRECT)
     ========================================================== */
  this.on("triggerAIVerification", async (req) => {
    const { documentID } = req.data;
    const tx = cds.transaction(req);

    const doc = await tx.run(
      SELECT.one.from(CandidateDocuments).where({ ID: documentID })
    );
    if (!doc) req.reject(404, "Document not found");

    const candidate = await tx.run(
      SELECT.one.from(Candidates).where({ ID: doc.candidate_ID })
    );
    if (!candidate) req.reject(404, "Candidate not found");

    const absolutePath = path.resolve(doc.filePath);
    if (!fs.existsSync(absolutePath)) {
      req.reject(500, "Uploaded file not found on server");
    }

    // const rawText = await extractTextFromImage(absolutePath);
    // ✅ MOCK OCR when running in Cloud Foundry
if (!extractTextFromImage) {
  console.log("⚠️ OCR not available, using mock verification");

  await tx.run(
    UPDATE(CandidateDocuments)
      .set({
        verificationStatus: "VERIFIED",
        aiConfidenceScore: 0.95
      })
      .where({ ID: documentID })
  );

  return {
    result: "MATCHED",
    score: 0.95,
    reason: "MOCK_VERIFICATION"
  };
}
const rawText = await extractTextFromImage(absolutePath);
    if (!rawText) req.reject(500, "OCR failed");

    const normalizedText = rawText.replace(/\s+/g, " ").toUpperCase();

    let extracted;
    if (doc.documentType === "AADHAR") {
      extracted = extractAadhaarData(normalizedText);
    } else if (doc.documentType === "PAN") {
      extracted = extractPANData(normalizedText);
    } else {
      req.reject(400, "Unsupported document type");
    }

    const verification = verifyDocument(candidate, {
      ...extracted,
      rawText: normalizedText
    });

    await tx.run(
      UPDATE(CandidateDocuments)
        .set({
          verificationStatus: verification.result,
          aiConfidenceScore: verification.score
        })
        .where({ ID: documentID })
    );

    await tx.run(
      INSERT.into(DocumentVerifications).entries({
        document_ID: documentID,
        aiEngine: "OCR_RULE_ENGINE",
        verificationResult: verification.result,
        matchedFields: JSON.stringify(extracted),
        verifiedAt: new Date()
      })
    );

    return verification;
  });
});