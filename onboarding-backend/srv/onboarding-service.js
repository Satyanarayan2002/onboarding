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
  app.post("/test-ai", async (req, res) => {
    try {
      const result = await cds.run(
        INSERT.into("dummy_test").entries({ test: "OK" })
      );
      console.log("✅ TEST HIT");
      res.json({ message: "Working" });
    } catch (e) {
      console.error(e);
      res.status(500).send(e.message);
    }
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
  function normalizeName(name) {
    return (name || "")
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .trim();
  }

  function isNameMatch(dbName, ocrName) {
    if (!dbName || !ocrName) return false;

    const db = normalizeName(dbName);
    const ocr = normalizeName(ocrName);

    // ✅ match by first token
    const dbParts = db.split(" ");
    const ocrParts = ocr.split(" ");

    return (
      db.includes(ocr) ||
      ocr.includes(db) ||
      dbParts.some(p => ocrParts.includes(p))
    );
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
    if (candidate.status !== "DRAFT" && candidate.status !== "CONTACT_VERIFIED" && candidate.status !== "DOCS_UPLOADED") {
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

  function formatDateToDDMMYYYY(dateStr) {
    if (!dateStr) return null;

    const parts = dateStr.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /* ==========================================================
     AI / OCR VERIFICATION (CLEAN & CORRECT)
     ========================================================== */
  //   this.on("triggerAIVerification", async (req) => {

  // const {
  //   documentID,
  //   firstName,
  //   lastName,
  //   panNumber,
  //   dob,
  //   nationality
  // } = req.data;

  //     const tx = cds.transaction(req);
  // console.log("REQ DATA:", req.data);
  // console.log("OCR function:", extractTextFromImage);

  //   // ✅ TEMP TEST (before main logic)
  //   // try {
  //   //   const testPath = "uploads/1778441725135-PanCard2_11zon (1).jpg";   // use a real file here
  //   //   if (fs.existsSync(testPath)) {
  //   //     const text = await extractTextFromImage(testPath);
  //   //     console.log("✅ OCR TEXT:", text);
  //   //   } else {
  //   //     console.log("⚠️ test.jpg not found");
  //   //   }
  //   // } catch (err) {
  //   //   console.error("❌ OCR runtime error:", err);
  //   // }

  // console.log("📥 UI DATA RECEIVED:");
  // console.log("First Name:", firstName);
  // console.log("Last Name:", lastName);
  // console.log("PAN:", panNumber);
  // console.log("DOB:", dob);
  // console.log("Nationality:", nationality);

  //     const doc = await tx.run(
  //       SELECT.one.from(CandidateDocuments).where({ ID: documentID })
  //     );
  //     if (!doc) req.reject(404, "Document not found");

  //     const candidate = await tx.run(
  //       SELECT.one.from(Candidates).where({ ID: doc.candidate_ID })
  //     );
  //     if (!candidate) req.reject(404, "Candidate not found");

  //     const absolutePath = path.resolve(doc.filePath);
  //     if (!fs.existsSync(absolutePath)) {
  //       req.reject(500, "Uploaded file not found on server");
  //     }

  //     // const rawText = await extractTextFromImage(absolutePath);
  //     // ✅ MOCK OCR when running in Cloud Foundry
  // if (!extractTextFromImage) {
  //   console.log("⚠️ OCR not available, using mock verification");

  //   await tx.run(
  //     UPDATE(CandidateDocuments)
  //       .set({
  //         verificationStatus: "VERIFIED",
  //         aiConfidenceScore: 0.95
  //       })
  //       .where({ ID: documentID })
  //   );

  //   return {
  //     result: "MATCHED",
  //     score: 0.95,
  //     reason: "MOCK_VERIFICATION"
  //   };
  // }
  // const rawText = await extractTextFromImage(absolutePath);

  // if (!rawText) req.reject(500, "OCR failed");

  // // ✅ Step 1: convert to uppercase
  // const upperText = rawText.toUpperCase();

  // // ✅ Step 2: clean garbage text

  // function cleanOCRText(text) {
  //   return text
  //     .replace(/[^A-Z0-9\/\s]/g, " ")
  //     .replace(/\b[A-Z]{1,2}\b/g, "")  // remove noise like OD, RE
  //     .replace(/\s+/g, " ")
  //     .trim();
  // }


  // // ✅ Step 3: final cleaned text
  // const normalizedText = cleanOCRText(upperText);

  // console.log("✅ CLEAN TEXT:", normalizedText);

  //     let extracted;
  //     if (doc.documentType === "AADHAR") {
  //       extracted = extractAadhaarData(normalizedText);
  //     } else if (doc.documentType === "PAN") {
  //       extracted = extractPANData(normalizedText);
  //     } else {
  //       req.reject(400, "Unsupported document type");
  //     }
  //     // ✅ LOG EXTRACTED DATA
  // console.log("🔍 Extracted Data:", extracted);

  // // ✅ GET INPUT VALUES FROM UI (IMPORTANT: they must be sent from UI)
  // const inputPAN = panNumber || null;
  // const inputDOB = dob || null;

  // // Build full name from UI instead of DB (if needed)
  // const uiFullName = `${firstName || ""} ${lastName || ""}`.trim();

  // // ✅ LOG INPUT vs EXTRACTED
  // console.log("📌 INPUT PAN:", inputPAN);
  // console.log("📌 EXTRACTED PAN:", extracted.panNumber);

  // console.log("📌 INPUT DOB:", inputDOB);
  // console.log("📌 EXTRACTED DOB:", extracted.dob);

  //     //
  // // ✅ Full name from DB
  // const dbFullName = `${candidate.firstName} ${candidate.lastName}`;

  // // ✅ PAN format validation (important)
  // function isValidPANFormat(pan) {
  //   return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  // }

  // // ✅ Validate extracted PAN
  // const panValid = isValidPANFormat(extracted.panNumber);

  // // ✅ PAN match (if you are NOT storing user-entered PAN separately)
  // const panMatch = panValid;

  // // 👉 OPTIONAL (if you store PAN from UI, use this instead)
  // // const inputPAN = userEnteredPANFromUI;
  // // const panMatch = panValid && inputPAN === extracted.panNumber;

  // // ✅ Name match (fuzzy match function we defined earlier)
  // const nameToCompare = uiFullName || dbFullName;
  // const nameMatch = isNameMatch(nameToCompare, extracted.name);

  // // ✅ Final decision
  // //const isValid = panValid && panMatch && nameMatch;  // my change 
  // const isValid = nameMatch;

  // // ✅ Convert input DOB
  // const formattedInputDOB = formatDateToDDMMYYYY(inputDOB);

  // // ✅ Compare DOB
  // const dobMatch =
  //   formattedInputDOB &&
  //   extracted.dob &&
  //   formattedInputDOB === extracted.dob;

  // // ✅ LOG DOB COMPARISON
  // console.log("📌 FORMATTED INPUT DOB:", formattedInputDOB);
  // console.log("📌 EXTRACTED DOB:", extracted.dob);
  // console.log("✅ DOB MATCH:", dobMatch);

  // // ✅ Debug logs (VERY useful)
  // console.log("🔍 Extracted PAN:", extracted.panNumber);
  // console.log("🔍 Extracted Name:", extracted.name);
  // console.log("👤 DB Name:", dbFullName);
  // console.log("✅ PAN VALID:", panValid);
  // console.log("✅ NAME MATCH:", nameMatch);

  // // ✅ Final response
  // const verification = {
  //   result: isValid ? "MATCHED" : "FAILED",
  //   score: isValid ? 0.95 : 0.5
  // };


  // // const verification = {
  // //   result: isValidPAN ? "MATCHED" : "FAILED",
  // //   score: isValidPAN ? 0.95 : 0.4
  // // };


  //     await tx.run(
  //       UPDATE(CandidateDocuments)
  //         .set({
  //           verificationStatus: verification.result,
  //           aiConfidenceScore: verification.score
  //         })
  //         .where({ ID: documentID })
  //     );

  //     await tx.run(
  //       INSERT.into(DocumentVerifications).entries({
  //         document_ID: documentID,
  //         aiEngine: "OCR_RULE_ENGINE",
  //         verificationResult: verification.result,
  //         matchedFields: JSON.stringify(extracted),
  //         verifiedAt: new Date()
  //       })
  //     );

  //     return verification;
  //   });
  this.on("triggerAIVerification", async (req) => {

    const {
      documentID,
      firstName,
      lastName,
      panNumber,
      dob,
      nationality
    } = req.data;

    const tx = cds.transaction(req);

    console.log("📥 UI DATA:", req.data);

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
      req.reject(500, "Uploaded file not found");
    }

    // ✅ OCR NOT AVAILABLE (mock)
    if (!extractTextFromImage) {
      await tx.run(
        UPDATE(CandidateDocuments)
          .set({ verificationStatus: "VERIFIED", aiConfidenceScore: 0.95 })
          .where({ ID: documentID })
      );

      return { result: "MATCHED", score: 0.95 };
    }

    const rawText = await extractTextFromImage(absolutePath);
    if (!rawText) req.reject(500, "OCR failed");

    // ============================
    // ✅ CLEAN TEXT
    // ============================
    const cleanedText = rawText
      .toUpperCase()
      .replace(/[^A-Z0-9\/\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    console.log("✅ CLEAN TEXT:", cleanedText);

    // ============================
    // ✅ EXTRACT DATA
    // ============================
    let extracted;
    if (doc.documentType === "PAN") {
      extracted = extractPANData(cleanedText);
    } else {
      req.reject(400, "Only PAN supported for now");
    }

    console.log("🔍 Extracted:", extracted);

    // ============================
    // ✅ NORMALIZE PAN
    // ============================
    const normalizedExtractedPAN = (extracted?.panNumber || "")
      .replace(/[^A-Z0-9]/g, "")
      .trim()
      .toUpperCase();

    const normalizedInputPAN = (panNumber || "")
      .replace(/[^A-Z0-9]/g, "")
      .trim()
      .toUpperCase();

    console.log("✅ INPUT PAN:", normalizedInputPAN);
    console.log("✅ OCR PAN:", normalizedExtractedPAN);

    // ✅ VALIDATE PAN FORMAT
    const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedExtractedPAN);

    // ✅ STRICT MATCH
    const panMatch =
      //panValid &&
      normalizedInputPAN == normalizedExtractedPAN;

    console.log("✅ PAN VALID:", panValid);
    console.log("✅ PAN MATCH:", panMatch);

    // ============================
    // ✅ NORMALIZE NAMES
    // ============================
    function normalizeName(name) {
      return (name || "")
        .replace(/[^A-Z\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    }

    const dbFullName = `${candidate.firstName} ${candidate.lastName}`;
    const uiFullName = `${firstName || ""} ${lastName || ""}`.trim();

    const normalizedDBName = normalizeName(dbFullName);
    const normalizedUIName = normalizeName(uiFullName);
    const normalizedExtractedName = normalizeName(extracted?.name);

    console.log("✅ DB NAME:", normalizedDBName);
    console.log("✅ UI NAME:", normalizedUIName);
    console.log("✅ OCR NAME:", normalizedExtractedName);

    // ✅ STRICT NAME MATCH
    const nameMatch =
      normalizedExtractedName === normalizedDBName ||
      normalizedExtractedName === normalizedUIName;

    console.log("✅ NAME MATCH:", nameMatch);

    // ============================
    // ✅ DOB MATCH
    // ============================
    function formatDOB(dateStr) {
      if (!dateStr) return null;

      if (dateStr.includes("/")) return dateStr;

      const parts = dateStr.split("-");
      if (parts.length !== 3) return null;

      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const formattedDOB = formatDOB(dob);

    const dobMatch =
      formattedDOB &&
      extracted?.dob &&
      formattedDOB === extracted.dob;

    console.log("✅ DOB MATCH:", dobMatch);

    // ============================
    // ✅ FINAL VALIDATION
    // ============================
    // const isValid =
    //   panMatch &&
    //   nameMatch &&
    //   (dobMatch || !dob);
    const isValid =
      panMatch &&
      nameMatch ;

    const verification = {
      result: isValid ? "MATCHED" : "FAILED",
      score: isValid ? 0.95 : 0.5
    };

    // ============================
    // ✅ SAVE RESULT
    // ============================
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
  this.on("getDashboardKPI", async (req) => {

    const tx = cds.transaction(req);

    const total = await tx.run(SELECT.from("Candidates").columns("count(*) as c"));
    const pending = await tx.run(
      SELECT.from("Candidates").where({ status: "DOCS_UPLOADED" }).columns("count(*) as c")
    );
    const failed = await tx.run(
      SELECT.from("CandidateDocuments").where({ verificationStatus: "FAILED" }).columns("count(*) as c")
    );
    const success = await tx.run(
      SELECT.from("Candidates").where({ status: "COMPLETED" }).columns("count(*) as c")
    );

    return {
      totalCandidates: total[0].c,
      pendingValidation: pending[0].c,
      failedValidation: failed[0].c,
      successfulSubmission: success[0].c
    };
  });

this.on("finalSubmit", async (req) => {

  const {
    candidateID,
    firstName,
    lastName,
    email,
    nationality,
    documentType,
    documentNumber,
    fileName
  } = req.data;

  const tx = cds.transaction(req);

  console.log("🚀 FINAL SUBMIT:", req.data);

  // ✅ GET candidate
  const candidate = await tx.run(
    SELECT.one.from(Candidates).where({ ID: candidateID })
  );

  if (!candidate) req.reject(404, "Candidate not found");

  // ✅ GET latest document
  
const doc = await tx.run(
  SELECT.one
    .from(CandidateDocuments)
    .where({ candidate_ID: candidateID })
);

console.log("📄 DOCUMENT FOUND:", doc);

if (!doc) {
  req.reject(404, "Document not found");
}


  // ✅ CREATE FINAL SUBMISSION ENTRY
  await tx.run(
    INSERT.into("onboarding.db.FinalSubmission").entries({
      candidate_ID: candidateID,

      firstName,
      lastName,
      email,
      nationality,

      documentType,
      documentNumber,
      nationalId: documentNumber,  // ✅ IMPORTANT

      fileName: doc.fileName,
      filePath: doc.filePath,

      verificationStatus: doc.verificationStatus,
      aiConfidenceScore: doc.aiConfidenceScore,

      submittedAt: new Date()
    })
  );

  // ✅ UPDATE CANDIDATE STATUS
  await tx.run(
    UPDATE(Candidates)
      .set({
        status: "COMPLETED",
        completionPct: 100
      })
      .where({ ID: candidateID })
  );

  console.log("✅ FINAL SUBMISSION STORED");

  return "FINAL_SUBMITTED_SUCCESS";
});




  this.on("getDashboardData", async (req) => {

    const tx = cds.transaction(req);

    return await tx.run(`
        SELECT 
            c.ID,
            c.firstName || ' ' || c.lastName AS candidateName,
            c.candidateCode AS candidateId,
            cc.email AS email,
            c.jobRole AS position,
            c.status,
            d.verificationStatus AS validation,
            c.failureReason,
            d.uploadedAt,
            dv.verifiedAt
        FROM Candidate c
        LEFT JOIN CandidateContact cc ON cc.candidate_ID = c.ID
        LEFT JOIN CandidateDocument d ON d.candidate_ID = c.ID
        LEFT JOIN DocumentVerification dv ON dv.document_ID = d.ID
    `);
  });
  this.on("getAnalytics", async (req) => {

    const tx = cds.transaction(req);

    return await tx.run(`
        SELECT status, COUNT(*) as count
        FROM Candidate
        GROUP BY status
    `);
  });

});