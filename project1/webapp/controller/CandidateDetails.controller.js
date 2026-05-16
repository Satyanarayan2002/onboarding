sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (
    Controller,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "com.wipro.project1.controller.CandidateDetails",
        {

            onInit: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("candidateDetails").attachPatternMatched(this._onObjectMatched, this);
            },

//             _onObjectMatched: function (oEvent) {
//     const candidateId = oEvent.getParameter("arguments").candidateId;
//     console.log("Received Candidate ID:", candidateId);

//     const oModel = this.getOwnerComponent().getModel("onb");
//     const aCandidates = oModel.getProperty("/candidates");

//     if (!aCandidates) {
//         console.error("Candidates not loaded");
//         return;
//     }

//     const oCandidate = aCandidates.find(c => c.candidateId === candidateId);

//     if (!oCandidate) {
//         console.error("Candidate not found");
//         return;
//     }

//     console.log("Matched Candidate:", oCandidate);

//     this.getView().setModel(
//         new sap.ui.model.json.JSONModel(oCandidate),
//         "candidate"
//     );
// },
_onObjectMatched: function (oEvent) {
    const candidateId = oEvent.getParameter("arguments").candidateId;
    console.log("Received Candidate ID:", candidateId);

    const oModel = this.getOwnerComponent().getModel("onb");

    // ✅ Try immediately
    const aCandidates = oModel.getProperty("/candidates");

    if (aCandidates && aCandidates.length > 0) {
        console.log("Data already loaded ✅");
        this._setCandidateData(candidateId);
    } 
    else {
        console.log("Waiting for model to load...");

        // ✅ Attach only once
        oModel.attachRequestCompleted(() => {
            this._setCandidateData(candidateId);
        });

        // ✅ EXTRA SAFE (fallback if event not fired)
        setTimeout(() => {
            console.log("Retrying after delay...");
            this._setCandidateData(candidateId);
        }, 500);
    }
},


_setCandidateData: function (candidateId) {

    const oModel = this.getOwnerComponent().getModel("dashboard");
    const aCandidates = oModel.getProperty("/candidates");

    if (!aCandidates) {
        console.error("Still no data loaded ❌");
        return;
    }

    const oCandidate = aCandidates.find(c => c.candidateId === candidateId);

    if (!oCandidate) {
        console.error("Candidate not found ❌");
        return;
    }

    console.log("Matched Candidate ✅", oCandidate);

    this.getView().setModel(
        new sap.ui.model.json.JSONModel(oCandidate),
        "candidate"
    );
},
            onBack: function () {

                MessageToast.show(
                    "Navigate Back"
                );

            },

            onRestart: function () {

                MessageToast.show(
                    "Restart Onboarding Triggered"
                );

            },

            onCancel: function () {

                MessageToast.show(
                    "Cancel Onboarding Triggered"
                );

            },

            onAudit: function () {

                MessageToast.show(
                    "Opening Audit History"
                );

            },

            onViewDocument: function () {

                MessageToast.show(
                    "Opening Document"
                );

            }

        }
    );
});