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

            console.log("loginId" + loginId)
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

            // Ensure document type = PAN
            oModel.setProperty("/documentType", "PAN");
            oModel.setProperty("/documentVerified", null);


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
            const oModel = this.getOwnerComponent().getModel("onb");

            const candidateID = oModel.getProperty("/candidateID");
            const otp = oModel.getProperty("/otp");

            console.log("VERIFY OTP →", { candidateID, otp });

            if (!candidateID || !otp) {
                MessageToast.show("Missing candidate or OTP");
                return;
            }

            const response = await fetch("/odata/v4/otp/verifyOTP", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateID,
                    otp
                })
            });

            if (response.ok) {
                MessageToast.show("OTP verified successfully");
                oModel.setProperty("/otpVerified", true);
            } else {
                MessageToast.show("Invalid or expired OTP");
            }
        },

        async onFileUpload(oEvent) {
            const oModel = this.getOwnerComponent().getModel("onb");
            const file = oEvent.getParameter("files")[0];

            if (!file) {
                MessageToast.show("No file selected");
                return;
            }
            oModel.setProperty("/fileName", file.name);
            const now = new Date();
            const formattedDate = now.toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
            oModel.setProperty("/uploadedOn", formattedDate);

            const candidateID = oModel.getProperty("/candidateID");
            if (!candidateID) {
                MessageToast.show("Candidate not resolved");
                return;
            }

            // ✅ Convert file → base64
            const base64 = await this._toBase64(file);

            // ✅ Call CAP OData action
            const response = await fetch("/odata/v4/otp/uploadDocumentFile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateID,
                    documentType: "PAN",
                    fileName: file.name,
                    mimeType: file.type,
                    content: base64
                })
            });

            if (!response.ok) {
                MessageToast.show("Upload failed");
                return;
            }

            const data = await response.json();
            const documentID = data.ID;

            // ✅ IMPORTANT UI FLAGS
            oModel.setProperty("/documentID", documentID);
            oModel.setProperty("/documentUploaded", true);
            oModel.setProperty("/documentValidated", null);

            MessageToast.show("Document uploaded successfully");
        },
        _toBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(",")[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        // async onValidateDocument() {
        //   const oModel = this.getOwnerComponent().getModel("onb");
        //   const documentID = oModel.getProperty("/documentID");

        //   if (!documentID) {
        //     MessageToast.show("No document uploaded");
        //     return;
        //   }

        //   const response = await fetch("/odata/v4/otp/triggerAIVerification", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify({ documentID })
        //   });

        //   const result = await response.json();

        //   if (result.result === "MATCHED") {
        //     oModel.setProperty("/documentValidated", true);
        //     MessageToast.show("✅ PAN verified successfully");
        //   } else {
        //     oModel.setProperty("/documentValidated", false);
        //     MessageToast.show("❌ PAN verification failed");
        //   }
        // },
        async onValidateDocument() {
            const oModel = this.getOwnerComponent().getModel("onb");

            const payload = {
                documentID: oModel.getProperty("/documentID"),
                firstName: oModel.getProperty("/firstName"),
                lastName: oModel.getProperty("/lastName"),
                panNumber: oModel.getProperty("/panNumber"),
                dob: oModel.getProperty("/dob"),
                nationality: oModel.getProperty("/nationality")
            };

            console.log("📤 Sending payload:", payload);

            const response = await fetch("/odata/v4/otp/triggerAIVerification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.result === "MATCHED") {
                oModel.setProperty("/documentValidated", true);
                MessageToast.show("✅ Document verified successfully");
            } else {
                oModel.setProperty("/documentValidated", false);
                MessageToast.show("❌ Document verification failed !! Please re-upload the document with correct details");
            }
        },

        /* ===================================================== */
        /* AI VERIFICATION                                      */
        /* ===================================================== */
        async _triggerVerification(documentID) {
            console.log("🧠 Triggering AI verification for:", documentID);

            const oModel = this.getOwnerComponent().getModel("onb");

            const verifyRes = await fetch("/odata/v4/otp/triggerAIVerification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({
                    documentID,
                    panNumber: this.getView().getModel("onb").getProperty("/panNumber"),
                    dob: this.getView().getModel("onb").getProperty("/dob")
                })

            });

            const result = await verifyRes.json();
            console.log("🧪 Verification result:", result);

            if (result.result === "MATCHED") {
                oModel.setProperty("/documentVerified", true);
                MessageToast.show("✅ PAN verified successfully");
            } else {
                oModel.setProperty("/documentVerified", false);
                MessageToast.show("❌ PAN verification failed");
            }
        },

        /* ===================================================== */
        /* SUBMIT                                               */
        /* ===================================================== */
        //         async onSubmit() {
        //     const oModel = this.getOwnerComponent().getModel("onb");

        //     const candidateID = oModel.getProperty("/candidateID");
        //     const documentValidated = oModel.getProperty("/documentValidated");

        //     console.log("📤 Submit clicked");
        //     console.log({ candidateID, documentValidated });

        //     if (!candidateID) {
        //         MessageToast.show("Missing candidate information");
        //         return;
        //     }

        //     if (!documentValidated) {
        //         MessageToast.show("Document not verified yet");
        //         return;
        //     }

        //     const response = await fetch("/odata/v4/otp/submitOnboarding", {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({ candidateID })
        //     });

        //     if (response.ok) {
        //         MessageToast.show("✅ Onboarding submitted successfully");
        //         console.log("✅ submitOnboarding successful");
        //     } else {
        //         const err = await response.json();
        //         console.error("❌ submitOnboarding failed:", err);
        //         MessageToast.show(err.error?.message || "Submission failed");
        //     }
        // }


        onSubmit: function () {
            const oModel = this.getOwnerComponent().getModel("onb");

            console.log("✅ Verification Model:", oModel.getData());

            this.getOwnerComponent().getRouter().navTo("reviewSubmit");
        }

        // async onSubmit() {
        //     const oModel = this.getView().getModel("onb");
        //     const email = oModel.getProperty("/email");

        //     const response = await fetch("/odata/v4/otp/submitOnboarding", {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({ email })
        //     });

        //     if (response.ok) {
        //         MessageToast.show("Onboarding submitted successfully");

        //         // Optional reset
        //         oModel.setData(models.createOnboardingModel().getData());
        //     } else {
        //         const err = await response.json();
        //         MessageToast.show(err.error.message);
        //     }
        // },

        // onFileUpload(oEvent) {
        //     const file = oEvent.getParameter("files")[0];
        //     this.getView().getModel("onb").setProperty("/document", file);
        //     MessageToast.show("Document uploaded");
        // },
        , onEdit: function () {
            MessageToast.show("Edit Mode Enabled");
        }

    });
});
