sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.wipro.onboarding-fronend.controller.BaseController", {

                
        getRouter: function () {
                return this.getOwnerComponent().getRouter();
            },

        navTo: function (sRoute, oParams) {
            this.getRouter().navTo(sRoute, oParams || {});
        }

    });
});