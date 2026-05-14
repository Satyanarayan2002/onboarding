sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("com.wipro.project1.controller.HRDashboard", {

        onInit: function () {

            var oData = {

                statusData: [
                    { status: "Submitted", count: 158 },
                    { status: "Pending", count: 62 },
                    { status: "Failed", count: 28 }
                ],

                failureData: [
                    { reason: "PAN Mismatch", count: 10 },
                    { reason: "Aadhaar Error", count: 8 },
                    { reason: "Document Blur", count: 6 },
                    { reason: "OTP Failed", count: 4 }
                ],

                trendData: [
                    { day: "Mon", count: 20 },
                    { day: "Tue", count: 30 },
                    { day: "Wed", count: 40 },
                    { day: "Thu", count: 28 },
                    { day: "Fri", count: 50 },
                    { day: "Sat", count: 35 },
                    { day: "Sun", count: 45 }
                ]
            };

            var oModel = new JSONModel(oData);

            this.getView().setModel(oModel);

        }

    });

});