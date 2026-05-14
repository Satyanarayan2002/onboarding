sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    MessageToast
) {
    "use strict";
 
    return Controller.extend(
        "com.wipro.project1.controller.ReviewSubmit",
        {
 
            onInit: function () {
 
                
var oViewModel = new JSONModel({
        consentAccepted: false
    });

    this.getView().setModel(oViewModel, "viewModel");

    // ✅ LOG MODEL DATA
    const oData = this.getOwnerComponent().getModel("onb").getData();
    console.log("✅ Review Page Model:", oData);

 
            },
 
            onConsentSelect: function () {
 
            },
 
            onEdit: function () {
 
                MessageToast.show(
                    "Navigating to Edit Information"
                );
 
            },
 
            onSubmit: function () {
 
                MessageToast.show(
                    "Onboarding Submitted Successfully"
                );
 
            }
 
        }
    );
});