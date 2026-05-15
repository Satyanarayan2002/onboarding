using { onboarding.db as db } from '../db/schema';

service otp {

  /* =====================================================
     CANDIDATES
     ===================================================== */
  entity Candidates
    as projection on db.Candidate {
      ID,
      loginId,
      candidateCode,
      firstName,
      lastName,
      gender,
      status,
      completionPct,
      failureReason
  };

  /* =====================================================
     CONTACTS
     ===================================================== */
  entity CandidateContacts
    as projection on db.CandidateContact {
      ID,
      candidate,
      email,
      phone,
      emailVerified,
      phoneVerified,
      emailVerifiedAt,
      phoneVerifiedAt
  };

  /* =====================================================
     ONBOARDING PROGRESS
     ===================================================== */
  entity CandidateOnboardings
    as projection on db.CandidateOnboarding {
      ID,
      candidate,
      currentStage,
      lastCompletedStep,
      completedSteps,
      totalSteps,
      isCompleted
  };

  /* =====================================================
     OTP TRANSACTIONS
     ===================================================== */
  entity OTPTransactions
    as projection on db.OTPTransaction {
      ID,
      candidate,
      channel,
      destination,
      otpHash,
      status,
      attemptCount,
      expiresAt,
      verifiedAt
  };

  /* =====================================================
     DOCUMENTS
     ===================================================== */
  entity CandidateDocuments
    as projection on db.CandidateDocument {
      ID,
      candidate,
      documentType,
      fileName,
      mimeType,
      fileSize,
      filePath,
      uploadedAt,
      verificationStatus,
      aiConfidenceScore,
      manualOverride
  };

  /* =====================================================
     EXCEPTIONS
     ===================================================== */
  entity Exceptions
    as projection on db.ExceptionCase {
      ID,
      candidate,
      exceptionType,
      description,
      resolved,
      resolvedAt
  };

  
entity DocumentVerifications
  as projection on db.DocumentVerification {
    ID,
    document,
    aiEngine,
    verificationResult,
    matchedFields,
    hrRemarks,
    verifiedAt,
    createdAt
};

entity FinalSubmissions
  as projection on db.FinalSubmission;



  /* =====================================================
     AUDIT LOGS
     ===================================================== */
  entity AuditLogs
    as projection on db.AuditLog {
      ID,
      candidate,
      action,
      performedBy,
      details,
      eventTime
  };

  /* =====================================================
     ACTIONS (OPEN – UI CONTROLS ACCESS)
     ===================================================== */
  action sendOTP(
    candidateID : UUID,
    channel     : String,
    destination : String
  );

  action verifyOTP(
    candidateID : UUID,
    otp         : String
  );
  
 action submitOnboarding(
    candidateID : UUID
  );

  action uploadDocument(
    candidateID  : UUID,
    documentType : String,
    fileName     : String,
    mimeType     : String,
    fileSize     : Integer,
    filePath     : String
  );


action triggerAIVerification(
  documentID  : UUID,
  firstName   : String,
  lastName    : String,
  panNumber   : String,
  dob         : String,
  nationality : String
) returns {
  result : String;
  score  : Decimal(3,2);
};

  action restartOnboarding(
    candidateID : UUID,
    reason      : String
  );

  action cancelOnboarding(
    candidateID : UUID,
    reason      : String
  );
  
  action uploadDocumentFile(
    candidateID : UUID,
    documentType : String,
    fileName : String,
    mimeType : String,
    content : LargeBinary
  ) returns UUID;


action finalSubmit(
  candidateID   : UUID,
  firstName     : String,
  lastName      : String,
  email         : String,
  nationality   : String,
  documentType  : String,
  documentNumber: String,
  fileName      : String
);



// action getDashboardData() returns array of DashboardData;
// action getDashboardKPI() returns DashboardKPI;
// action getAnalytics() returns array of DashboardAnalytics;

}