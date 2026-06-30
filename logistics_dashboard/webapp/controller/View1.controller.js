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
        },

        onFullScreenToggle: function (oEvent) {
            var oButton = oEvent.getSource();
            var bIsFullScreen = oButton.data("isFullScreen");
            
            // Go up to the section wrapper (Toolbar -> VBox)
            var oSection = oButton.getParent().getParent();
            
            if (!bIsFullScreen) {
                oSection.addStyleClass("fullScreenSection");
                oButton.setIcon("sap-icon://exit-full-screen");
                oButton.data("isFullScreen", true);
            } else {
                oSection.removeStyleClass("fullScreenSection");
                oButton.setIcon("sap-icon://full-screen");
                oButton.data("isFullScreen", false);
            }
        }
    });
});