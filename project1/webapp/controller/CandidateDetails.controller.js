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