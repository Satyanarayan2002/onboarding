namespace onboarding.db;

using { cuid, managed } from '@sap/cds/common';

/* =====================================================
   ENUM TYPES
   ===================================================== */

type CandidateStatus : String enum {
  DRAFT;
  CONTACT_VERIFIED;
  DOCS_UPLOADED;
  DOCS_VERIFIED;
  COMPLETED;
  EXCEPTION;
  CANCELLED;
}

type OTPStatus : String enum {
  GENERATED;
  VERIFIED;
  EXPIRED;
  LOCKED;
}

type DocumentStatus : String enum {
  UPLOADED;
  AI_VERIFIED;
  DOUBT;
  REJECTED;
  MANUALLY_APPROVED;
}

type HRActionType : String enum {
  RESTART;
  CANCEL;
  MANUAL_OVERRIDE;
}

type ExceptionType : String enum {
  SYSTEM_ERROR;
  LEGAL_COMPLIANCE;
  MANUAL_OVERRIDE;
}

/* =====================================================
   ROOT ENTITY: CANDIDATE
   ===================================================== */

entity Candidate : cuid, managed {

  loginId        : String(100);          // UI-selected role / user reference
  candidateCode  : String(20);           // Human readable code
  firstName      : String(80);
  lastName       : String(80);
  dateOfBirth    : Date;
  gender         : String(10);
  jobRole        : String(80);

  status         : CandidateStatus default 'DRAFT';
  completionPct  : Integer default 0;
  failureReason  : String(255);

  contacts       : Composition of one CandidateContact
                     on contacts.candidate = $self;

  onboarding     : Composition of one CandidateOnboarding
                     on onboarding.candidate = $self;

  documents      : Composition of many CandidateDocument
                     on documents.candidate = $self;

  exceptions     : Composition of many ExceptionCase
                     on exceptions.candidate = $self;
}

/* =====================================================
   CONTACT DETAILS
   ===================================================== */

entity CandidateContact : cuid, managed {
  candidate        : Association to Candidate;

  email            : String(255);
  phone            : String(20);

  emailVerified    : Boolean default false;
  phoneVerified    : Boolean default false;

  emailVerifiedAt  : Timestamp;
  phoneVerifiedAt  : Timestamp;
}

/* =====================================================
   ONBOARDING PROGRESS
   ===================================================== */

entity CandidateOnboarding : cuid, managed {
  candidate          : Association to Candidate;

  currentStage       : String(50);   // CONTACT / OTP / DOCS / REVIEW
  lastCompletedStep  : String(50);

  completedSteps     : Integer default 0;
  totalSteps         : Integer default 5;

  isCompleted        : Boolean default false;
}

/* =====================================================
   OTP TRANSACTION (SECURE – HASHED OTP)
   ===================================================== */

entity OTPTransaction : cuid, managed {
  candidate        : Association to Candidate;

  channel          : String(10);     // EMAIL | SMS
  destination      : String(255);    // masked email/phone

  otpHash          : String(255);    // NEVER store plain OTP
  status           : OTPStatus default 'GENERATED';

  attemptCount     : Integer default 0;
  expiresAt        : Timestamp;
  verifiedAt       : Timestamp;
}

/* =====================================================
   DOCUMENTS
   ===================================================== */


entity CandidateDocument : cuid, managed {
  candidate           : Association to Candidate;

  documentType        : String(30);
  fileName            : String(255);
  mimeType            : String(100);
  fileSize            : Integer;
  filePath            : String;

  uploadedAt          : Timestamp;
  verificationStatus  : DocumentStatus default 'UPLOADED';

  aiConfidenceScore   : Decimal(5,2);
  manualOverride      : Boolean default false;

  verifications       : Composition of many DocumentVerification
                          on verifications.document = $self;
}


/* =====================================================
   DOCUMENT VERIFICATION
   ===================================================== */

entity DocumentVerification : cuid, managed {
  document            : Association to CandidateDocument;

  aiEngine            : String(100);     // SAP AI / Azure / Google
  verificationResult  : String(10);      // PASS / FAIL / DOUBT

  matchedFields       : LargeString;     // JSON
  hrRemarks           : String(255);

  verifiedAt          : Timestamp;
}

/* =====================================================
   HR ACTIONS (OPTIONAL – FUTURE)
   ===================================================== */

entity HRAction : cuid, managed {
  candidate       : Association to Candidate;

  actionType      : HRActionType;
  reason          : String(255);
  performedBy     : String(100);
  performedAt     : Timestamp;
}

/* =====================================================
   EXCEPTIONS
   ===================================================== */

entity ExceptionCase : cuid, managed {
  candidate      : Association to Candidate;

  exceptionType  : ExceptionType;
  description    : String(255);
  resolved       : Boolean default false;
  resolvedAt     : Timestamp;
}

/* =====================================================
   AUDIT LOG (APPEND ONLY)
   ===================================================== */

entity AuditLog : cuid, managed {
  candidate      : Association to Candidate;

  action         : String(100);      // OTP_SENT, DOC_UPLOADED
  performedBy    : String(100);
  details        : LargeString;      // JSON

  eventTime      : Timestamp;
}


entity FinalSubmission : cuid, managed {

  candidate        : Association to Candidate;

  // ✅ PERSONAL DETAILS
  firstName        : String(80);
  lastName         : String(80);
  email            : String(255);
  nationality      : String(50);

  // ✅ DOCUMENT DETAILS
  documentType     : String(30);
  documentNumber   : String(20);   // ✅ PAN
  nationalId       : String(20);   // ✅ same as PAN

  fileName         : String(255);
  filePath         : String(255);

  // ✅ VERIFICATION
  verificationStatus : String(20);
  aiConfidenceScore  : Decimal(5,2);

  // ✅ TRACKING
  submittedAt      : Timestamp;
}


entity DashboardData {

    key ID : UUID;

    candidateName : String;
    candidateId   : String;
    email         : String;
    position      : String;

    status        : String;
    validation    : String;
    failureReason : String;

    uploadedAt    : Timestamp;
    verifiedAt    : Timestamp;

}

entity DashboardKPI {

    key ID : Integer;

    totalCandidates     : Integer;
    pendingValidation   : Integer;
    failedValidation    : Integer;
    successfulSubmission: Integer;

}

entity DashboardAnalytics {

    key ID : Integer;

    status        : String;
    count         : Integer;

}
