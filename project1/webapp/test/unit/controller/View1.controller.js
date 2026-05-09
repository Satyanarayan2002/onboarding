/*global QUnit*/

sap.ui.define([
	"com/wipro/project1/controller/Verification.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Verification Controller");

	QUnit.test("I should test the Verification controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
