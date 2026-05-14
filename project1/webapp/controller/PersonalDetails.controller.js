sap.ui.define([
    "com/wipro/project1/controller/BaseController",
    "sap/m/MessageToast"
], function (BaseController, MessageToast) {
    "use strict";
 
    return BaseController.extend(
        "com.wipro.project1.controller.PersonalDetails",
        {
 
            onInit: function () {
                
            },
 
            onBack: function () {
                MessageToast.show("Navigating Back");
            },
 
            onContinue: function () {

                // ✅ Get full onboarding model
                var oData = this.getView().getModel("onb").getData();

                // ✅ Log to console (for debugging)
                console.log("✅ Personal Details Model:", oData);

                MessageToast.show("Personal Information Saved Successfully");

                // ✅ Navigate to verification page
                this.getRouter().navTo("verification");
            }
 
        }
    );
});