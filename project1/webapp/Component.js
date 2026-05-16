sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/wipro/project1/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.wipro.project1.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            // UIComponent.prototype.init.apply(this, arguments);
            
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            this.setModel(models.createOnboardingModel(), "onb");

            
// ✅ NEW model for dashboard + candidate details
    const oDashboardModel = new sap.ui.model.json.JSONModel();
    oDashboardModel.loadData("model/hrDashboardData.json");

    this.setModel(oDashboardModel, "dashboard");


            // enable routing
            this.getRouter().initialize();
        }
    });
});