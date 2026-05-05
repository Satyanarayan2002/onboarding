exports.extractAadhaarData = (text) => {
  const aadhaarMatch = text.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
  const dobMatch = text.match(/\b\d{2}\/\d{2}\/\d{4}\b/);

  return {
    aadhaarNumber: aadhaarMatch ? aadhaarMatch[0].replace(/\s/g, "") : null,
    dob: dobMatch ? dobMatch[0] : null,
    rawText: text
  };
};

exports.extractPANData = (text) => {
  const panMatch = text.match(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/);

  return {
    panNumber: panMatch ? panMatch[0] : null,
    rawText: text
  };
};