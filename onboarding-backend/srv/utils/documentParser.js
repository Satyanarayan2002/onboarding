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
    .replace(/[^A-Z0-9\/\s]/g, " ")
    .replace(/\b(OD|RE|AE|SE|ET|ST|EE|FT|TAR|SUTRA)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  console.log("✅ CLEANED TEXT:", cleaned);

  // ✅ STEP 2: NORMALIZE FULL TEXT (REMOVE ALL NOISE)
  const normalizedPANText = cleaned.replace(/[^A-Z0-9]/g, "");

  console.log("🔍 NORMALIZED PAN TEXT:", normalizedPANText);

  let panNumber = null;
  let name = null;
  let motherName = null;
  let dob = null;

  // ✅ STEP 3: GLOBAL PAN MATCH
  const allMatches = normalizedPANText.match(/[A-Z]{5}[0-9]{4}[A-Z]/g);

  if (allMatches && allMatches.length > 0) {
    panNumber = allMatches[0];
    console.log("✅ EXTRACTED PAN:", panNumber);
  } else {
    console.log("❌ PAN NOT FOUND");
  }

  // ✅ STEP 4: DOB
  const dobMatch = cleaned.match(/\d{2}\/\d{2}\/\d{4}/);
  dob = dobMatch ? dobMatch[0] : null;
  console.log("✅ EXTRACTED DOB:", dob);

  // ✅ STEP 5: NAME
  const nameMatch = cleaned.match(/NAME\s+[A-Z\s]*?([A-Z]+\s+[A-Z]+)/);
  name = nameMatch ? nameMatch[1] : null;
  console.log("✅ EXTRACTED NAME:", name);

  // ✅ STEP 6: MOTHER NAME
  const motherMatch = cleaned.match(/MOTHER\s+NAME\s+([A-Z]+\s+[A-Z]+)/);
  motherName = motherMatch ? motherMatch[1] : null;
  console.log("✅ EXTRACTED MOTHER NAME:", motherName);

  return {
    panNumber,
    name,
    motherName,
    dob,
    rawText: cleaned
  };
};