/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["com/wipro/onboarding-fronend/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
