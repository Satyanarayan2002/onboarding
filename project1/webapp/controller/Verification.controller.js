sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.wipro.project1.controller.Verification", {
        onInit: function () {
    const oModel = this.getOwnerComponent().getModel("onb");

    const loginId = oModel.getProperty("/email"); 
    // or pass email explicitly from previous step

    console.log("loginId"+loginId)
    fetch(`/odata/v4/otp/Candidates?$filter=loginId eq '${loginId}'`)
        .then(res => res.json())
        .then(data => {
            if (data.value && data.value.length === 1) {
                const candidate = data.value[0];

                oModel.setProperty("/candidateID", candidate.ID);

                console.log("✅ Candidate resolved:", candidate.ID);
            } else {
                console.error("❌ Candidate not found or multiple candidates");
            }
        })
        .catch(err => console.error("❌ Failed to resolve candidate", err));
},
        async onSendOtp() {
            const oModel = this.getView().getModel("onb");
            const oData = oModel.getData();

            const response = await fetch("/odata/v4/otp/sendOTP", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateID: oModel.getProperty("/candidateID"),
                    channel: "EMAIL",
                    destination: oModel.getProperty("/email")

                })
            });

            if (response.ok) {
                MessageToast.show("OTP sent successfully");

                // ✅ Update UI state
                oModel.setProperty("/otpSent", true);
                oModel.setProperty("/otpVerified", false);
            } else {
                MessageToast.show("Failed to send OTP");
            }
        },

        async onVerifyOtp() {
            const oModel = this.getView().getModel("onb");
            const oData = oModel.getData();

            const response = await fetch("/odata/v4/otp/verifyOTP", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: oData.email,
                    otp: oData.otp
                })
            });

            if (response.ok) {
                MessageToast.show("OTP verified successfully");

                // ✅ Update UI state
                oModel.setProperty("/otpVerified", true);
            } else {
                MessageToast.show("Invalid or expired OTP");
            }
        },

        async onSubmit() {
            const oModel = this.getView().getModel("onb");
            const email = oModel.getProperty("/email");

            const response = await fetch("/odata/v4/otp/submitOnboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                MessageToast.show("Onboarding submitted successfully");

                // Optional reset
                oModel.setData(models.createOnboardingModel().getData());
            } else {
                const err = await response.json();
                MessageToast.show(err.error.message);
            }
        },

        onFileUpload(oEvent) {
            const file = oEvent.getParameter("files")[0];
            this.getView().getModel("onb").setProperty("/document", file);
            MessageToast.show("Document uploaded");
        },
        onEdit: function () {
            MessageToast.show("Edit Mode Enabled");
        }

    });
});
