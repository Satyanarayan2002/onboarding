namespace onboarding.db;

entity OTPRequests {
  key ID        : UUID;
      email     : String;
      mobile    : String;
      otp       : String;
      expiresAt : Timestamp;
      verified  : Boolean default false;
}