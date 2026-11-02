/*global QUnit*/

sap.ui.define([
	"genslogiques/logisticsdashboard/controller/View1.controller"
], function (Controller) {
	"use strict";

	QUnit.module("View1 Controller");

	QUnit.test("I should test the View1 controller", function (assert) {
		var oAppController = new Controller();
		var mModels = {};
		// onInit registers JSON models on the view; stub it since no view is attached in unit tests
		oAppController.getView = function () {
			return {
				setModel: function (oModel, sName) {
					mModels[sName] = oModel;
				}
			};
		};
		oAppController.onInit();
		assert.ok(oAppController);
		assert.ok(mModels.DealDetailData, "DealDetailData model is registered");
		assert.ok(mModels.view, "view state model is registered");
	});

});
