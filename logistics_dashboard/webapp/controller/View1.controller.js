sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("genslogiques.logisticsdashboard.controller.View1", {
        onInit() {
            var oModel = new JSONModel();
            this.getView().setModel(oModel);
            oModel.loadData("model/Deals.json");
        }
    });
});