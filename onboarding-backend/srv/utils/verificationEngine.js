exports.verifyDocument = (candidate, extracted) => {
  let score = 0;

  if (extracted.aadhaarNumber || extracted.panNumber) score += 40;

  if (
    extracted.rawText.toLowerCase().includes(candidate.firstName.toLowerCase())
  ) score += 20;

  if (
    extracted.rawText.toLowerCase().includes(candidate.lastName.toLowerCase())
  ) score += 20;

  if (candidate.dateOfBirth && extracted.dob === candidate.dateOfBirth)
    score += 20;

  let result =
    score >= 80 ? "PASS" :
    score >= 50 ? "DOUBT" :
    "FAIL";

  return { score, result };
};
