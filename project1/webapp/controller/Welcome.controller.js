sap.ui.define([
    "com/wipro/project1/controller/BaseController"
], function (BaseController) {
    "use strict";
 
    return BaseController.extend("com.wipro.project1.controller.Welcome", {
 
        onStartOnboarding: function () {
 
            // Navigate to Personal Details Page
            this.getRouter().navTo("personalDetails");
 
        },
 
        onRoleChange: function (oEvent) {
            const selectedKey = oEvent.getParameter("selectedItem").getKey();
            if (selectedKey === "Employee") {
                this.getOwnerComponent().getRouter().navTo("Welcome");
            } else if (selectedKey === "HR") {
                this.getOwnerComponent().getRouter().navTo("HRDashboard");
            }
        },
 
        onCandidateSelect: function (oEvent) {
            const candidateId = oEvent.getSource().getBindingContext().getProperty("ID");
            this.getOwnerComponent().getRouter().navTo("CandidateDetails", { candidateId });
        }
 
    });
})
// sap.ui.define([
//    "com/wipro/project1/controller/BaseController"
// ], function (Controller) {
//     "use strict";
 
//     return BaseController.extend("com.wipro.project1.controller.Welcome", {
 
//         onInit: function () {
 
//         },
 
//         onStartOnboarding: function () {
 
//             // Navigate to Personal Details Page
//             this.getRouter().navTo("personalDetails");      
 
//         }
 
//     });
// });