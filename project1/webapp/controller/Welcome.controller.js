sap.ui.define([
    "com/wipro/project1/controller/BaseController"
], function (BaseController) {
    "use strict";
 
    return BaseController.extend("com.wipro.project1.controller.Welcome", {
 
        onStartOnboarding: function () {
 
            // Navigate to Personal Details Page
            this.getRouter().navTo("personalDetails");
 
        }
 
    });
})