sap.ui.define([], function () {
    "use strict";
    return {
        /**
         * @param {sap.ui.layout.Splitter} oSplitter - The splitter container
         * @param {string} sTargetContentId - The ID of the layout content to enlarge
         * @param {boolean} bIsExpanded - The current state
         */
        toggleLayout: function (oSplitter, sTargetContentId, bIsExpanded) {
            var aContentAreas = oSplitter.getContentAreas();
            
            aContentAreas.forEach(function (oContent) {
                var oLayoutData = oContent.getLayoutData();
                if (oContent.getId().includes(sTargetContentId)) {
                    // Make target content full size
                    oLayoutData.setSize(bIsExpanded ? "100%" : "50%");
                } else {
                    // Hide/Collapse other content
                    oContent.setVisible(!bIsExpanded);
                }
            });
        }
    };
});