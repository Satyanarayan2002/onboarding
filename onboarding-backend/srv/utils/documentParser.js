// ======================
// AADHAAR EXTRACTION
// ======================
exports.extractAadhaarData = (text) => {
  const cleanText = text
    .replace(/[^A-Z0-9\/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aadhaarMatch = cleanText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
  const dobMatch = cleanText.match(/\b\d{2}\/\d{2}\/\d{4}\b/);

  return {
    aadhaarNumber: aadhaarMatch ? aadhaarMatch[0].replace(/\s/g, "") : null,
    dob: dobMatch ? dobMatch[0] : null,
    rawText: cleanText
  };
};


// ======================
// PAN EXTRACTION (FINAL)
// ======================
exports.extractPANData = (text) => {

  console.log("🔍 TEXT BEFORE EXTRACTION:", text);

  // ✅ STEP 1: CLEAN TEXT
  const cleaned = text
    .replace(/[^A-Z0-9\/:\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  console.log("✅ CLEANED TEXT:", cleaned);

  let panNumber = null;
  let name = null;
  let motherName = null;
  let dob = null;

  // ==================================================
  // ✅ STEP 2: PAN EXTRACTION (FINAL - KEYWORD BASED)
  // ==================================================

  const keyword = "PERMANENT ACCOUNT NUMBER";

  if (cleaned.includes(keyword)) {

    const afterKeyword = cleaned.split(keyword)[1]?.trim();

    console.log("🔍 AFTER KEYWORD:", afterKeyword);

    if (afterKeyword) {

      // ✅ take first word after keyword
      const firstWord = afterKeyword.split(" ")[0];

      // ✅ remove any OCR garbage
      const cleanedPAN = firstWord.replace(/[^A-Z0-9]/g, "");

      // ✅ PAN should be 10 chars → fix OCR noise
      panNumber = cleanedPAN.substring(0, 10);
    }
  }

  // ✅ FALLBACK (in case keyword fails)
  if (!panNumber) {
    const fallbackMatch = cleaned.match(/[A-Z]{5}[0-9]{4}[A-Z]/);
    if (fallbackMatch) {
      panNumber = fallbackMatch[0];
    }
  }

  console.log("✅ PAN:", panNumber);

  // ==================================================
  // ✅ STEP 3: NAME EXTRACTION
  // ==================================================

  const nameMatch = cleaned.match(/NAME\s+([A-Z]+\s+[A-Z]+)/);

  if (nameMatch) {
    name = nameMatch[1];
  }

  console.log("✅ NAME:", name);

  // ==================================================
  // ✅ STEP 4: MOTHER NAME
  // ==================================================

  const motherMatch = cleaned.match(/MOTHER\s+NAME\s+([A-Z]+\s+[A-Z]+)/);

  if (motherMatch) {
    motherName = motherMatch[1];
  }

  console.log("✅ MOTHER NAME:", motherName);

  // ==================================================
  // ✅ STEP 5: DOB
  // ==================================================

  const dobMatch = cleaned.match(/\d{2}\/\d{2}\/\d{4}/);

  if (dobMatch) {
    dob = dobMatch[0];
  }

  console.log("✅ DOB:", dob);

  return {
    panNumber,
    name,
    motherName,
    dob,
    rawText: cleaned
  };
};
