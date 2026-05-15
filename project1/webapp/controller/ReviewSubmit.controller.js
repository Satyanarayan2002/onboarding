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
 
            onBack: function () {
                this.getOwnerComponent().getRouter().navTo("DocumentUpload");
 
            },
 
           onSubmit: async function () {

  const oModel = this.getView().getModel(); // OData V4
  const onbModel = this.getView().getModel("onb");

  const data = onbModel.getData();

  const payload = {
    candidateID: data.candidateID,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    nationality: data.nationality,
    documentType: "PAN",
    documentNumber: data.panNumber,
    fileName: data.fileName
  };

  console.log("🚀 SUBMIT PAYLOAD:", payload);

  try {

    // ✅ OData V4 way
    const oAction = oModel.bindContext("/finalSubmit(...)");

    oAction.setParameter("candidateID", payload.candidateID);
    oAction.setParameter("firstName", payload.firstName);
    oAction.setParameter("lastName", payload.lastName);
    oAction.setParameter("email", payload.email);
    oAction.setParameter("nationality", payload.nationality);
    oAction.setParameter("documentType", payload.documentType);
    oAction.setParameter("documentNumber", payload.documentNumber);
    oAction.setParameter("fileName", payload.fileName);

    await oAction.execute();

    sap.m.MessageToast.show("✅ Onboarding Submitted Successfully");

  } catch (error) {
    console.error(error);
    sap.m.MessageBox.error("❌ Submission Failed");
  }
}
 
        }
    );
});