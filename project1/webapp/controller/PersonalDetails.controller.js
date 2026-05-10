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
 
                MessageToast.show(
                    "Personal Information Saved Successfully"
                );
                this.getRouter().navTo("verification");
 
            }
 
        }
    );
});