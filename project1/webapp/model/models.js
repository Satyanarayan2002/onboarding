sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
],
function (JSONModel, Device) {
    "use strict";

    return {

        createDeviceModel: function () {
            const oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        createOnboardingModel: function () {
            return new JSONModel({

                /* ======================
                   CANDIDATE INFO
                ====================== */
                candidateID: "",

                firstName: "",
                lastName: "",
                email: "",
                mobile: "",
                
                // ✅ ADD THESE
                    panNumber: "",   // <---- ADD THIS
                    dob: "",         // <---- ADD THIS
                
                nationality: "",  // ✅ ADD THIS

                /* ======================
                   OTP FLOW
                ====================== */
                otp: "",
                otpSent: false,
                otpVerified: false,

                /* ======================
                   DOCUMENT FLOW (PAN)
                ====================== */
                documentType: "PAN",       // ✅ force PAN
                documentID: "",
                documentUploaded: false,
                documentVerified: null,    // true / false after AI check
                filePath: "",
                fileName: "",
                uploadedOn: "",

                /* ======================
                   UI / STATE FLAGS
                ====================== */
                submissionAllowed: false

            });
        }

    };
});
