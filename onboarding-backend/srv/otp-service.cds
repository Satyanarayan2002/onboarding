using { onboarding.db.OTPRequests as DBOTPRequests } from '../db/schema';

service otp {
    entity OTPRequests as projection on DBOTPRequests;
  action sendOTP(
    email  : String,
    mobile : String
  ) returns String;

  action verifyOTP(
    email : String,
    otp   : String
  ) returns Boolean;

  
action submitOnboarding(
    email : String
  ) returns String;


}
