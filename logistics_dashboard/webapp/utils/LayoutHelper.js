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
        },

        toggleFullScreen: function (oEvent) {
            var oButton = oEvent.getSource();
            var bIsFullScreen = oButton.data("isFullScreen");
            
            // Find section wrapper (VBox / Splitter section / Panel)
            var oToolbar = oButton.getParent();
            var oSection = null;
            var oParentPanel = null;
            
            var oCurr = oToolbar ? oToolbar.getParent() : null;
            while (oCurr && typeof oCurr.getParent === "function") {
                if (!oSection && (oCurr.isA("sap.m.VBox") || oCurr.hasStyleClass("splitterSection") || oCurr.isA("sap.m.Panel"))) {
                    oSection = oCurr;
                }
                if (oCurr.isA("sap.m.Panel")) {
                    oParentPanel = oCurr;
                    break;
                }
                oCurr = oCurr.getParent();
            }
            
            // Fallback if not found via loop
            if (!oSection) {
                oSection = oToolbar ? oToolbar.getParent() : null;
            }
            
            if (!oSection) {
                return;
            }
            
            if (!bIsFullScreen) {
                // ENTERING FULL SCREEN MODE
                oSection.addStyleClass("fullScreenSection");
                if (oParentPanel) {
                    oParentPanel.addStyleClass("parentPanelFullScreen");
                }
                
                // Lock body scroll to prevent background scrolling
                document.body.classList.add("fullScreenLock");
                
                // Update button appearance
                oButton.setIcon("sap-icon://exit-full-screen");
                oButton.setTooltip("Exit Full Screen");
                
                // Store state
                oButton.data("isFullScreen", true);
                
            } else {
                // EXITING FULL SCREEN MODE
                oSection.removeStyleClass("fullScreenSection");
                if (oParentPanel) {
                    oParentPanel.removeStyleClass("parentPanelFullScreen");
                }
                
                // Unlock body scroll to restore normal scrolling
                document.body.classList.remove("fullScreenLock");
                
                // Update button appearance
                oButton.setIcon("sap-icon://full-screen");
                oButton.setTooltip("Full Screen");
                
                // Store state
                oButton.data("isFullScreen", false);
            }
        }
    };
});