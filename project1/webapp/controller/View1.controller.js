sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.wipro.project1.controller.View1", {

        async onSendOtp() {
            const oModel = this.getView().getModel("onb");
            const oData = oModel.getData();

            const response = await fetch("/odata/v4/otp/sendOTP", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: oData.email,
                    mobile: oData.mobile
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
        }

    });
});
