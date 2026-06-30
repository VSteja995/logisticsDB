sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "your/namespace/utils/LayoutHelper"
], function (Controller, LayoutHelper) {
    "use strict";
    return Controller.extend("genslogiques.logisticsdashboard.controller.BaseController", {
        
        onToggleTableFullscreen: function (sSplitterId, sTableContentId) {
            // Get references
            var oSplitter = this.getView().byId(sSplitterId);
            
            // Store state in a model (e.g., "viewModel")
            var oViewModel = this.getModel("viewModel");
            var bIsExpanded = !oViewModel.getProperty("/isTableExpanded");
            
            // Execute logic
            LayoutHelper.toggleLayout(oSplitter, sTableContentId, bIsExpanded);
            
            // Update state
            oViewModel.setProperty("/isTableExpanded", bIsExpanded);
        }
    });
});