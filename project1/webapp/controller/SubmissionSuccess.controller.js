sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (
    Controller,
    MessageToast
) {
    "use strict";
 
    return Controller.extend(
        "com.wipro.project1.controller.SubmissionSuccess",
        {
 
            onInit: function () {
 
            },
 
            onClose: function () {
 
                MessageToast.show(
                    "Closing Application"
                );
 
            }
 
        }
    );
});