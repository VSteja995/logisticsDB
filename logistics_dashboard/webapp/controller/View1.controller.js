sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "genslogiques/logisticsdashboard/utils/LayoutHelper",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, JSONModel, LayoutHelper, MessageToast, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("genslogiques.logisticsdashboard.controller.View1", {

        // ── Lifecycle ────────────────────────────────────────────────────────────
        onInit() {
            this._oCrossNav = null;
            if (sap.ushell && sap.ushell.Container) {
                this._oCrossNav = sap.ushell.Container.getService("CrossApplicationNavigation");
            }

            this._oDateFilterState = {
                fromDate: null,
                toDate:   null,
                motKey:   "11"    // Default mode of transport key matching backend expectation
            };

            // Initialise JSON models for both controls
            var oUniqDealCmdtyModel = new JSONModel({ UniqDealCmdtySet: [] });
            this.getView().setModel(oUniqDealCmdtyModel, "UniqDealCmdtyData");

            var oDealQtyMotModel = new JSONModel({ DealQtyMotSet: [] });
            this.getView().setModel(oDealQtyMotModel, "dealQtyMotData");

            var oDealDetailModel = new JSONModel({ DealDetailSet: [] });
            this.getView().setModel(oDealDetailModel, "DealDetailData");

            var oEntDetailModel = new JSONModel({ EntDetailSet: [] });
            this.getView().setModel(oEntDetailModel, "EntDetailData");

            var oOblDetailModel = new JSONModel({ OblDetailSet: [] });
            this.getView().setModel(oOblDetailModel, "OblDetailData");

            // var oMatDetailModel = new JSONModel({  MatDetailSet: [] });
            // this.getView().setModel(oMatDetailModel, "MatDetailData");
        },

        // ── Helper: resolve the DateRangeSelection control ───────────────────────
        _getDRS: function () {
            return this.byId("DlPnl1DRS005") ||
                   this.byId("MainPnlFra011--DlPnl1DRS005") ||
                   this.byId("dateDrs") ||
                   this.byId("MainPnlFra013--dateDrs")||
                   this.byId("monthDrs")
        },

        // ── O/E Schedule  –  Date-Range filter logic ─────────────────────────────
        onOEScheduleDateRangeChange: function (oEvent) {
            var oDRS  = oEvent.getSource();
            var dFrom = oDRS.getDateValue();
            var dTo   = oDRS.getSecondDateValue();

            if (dFrom && dTo && dFrom > dTo) {
                oDRS.setValueState("Error");
                oDRS.setValueStateText("'From' date must not be after 'To' date.");
                return;
            }
            oDRS.setValueState("None");
            this._oDateFilterState.fromDate = dFrom;
            this._oDateFilterState.toDate   = dTo;
        },

        onModeChange: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var sMot;
            if (sKey === "Train") {
                sMot = "02";
            } else if (sKey === "Truck") {
                sMot = "13";
            } else {
                sMot = "11";
            }
            this._oDateFilterState.motKey = sMot;

            var oDRS  = this._getDRS();
            var dFrom = oDRS ? oDRS.getDateValue()       : null;
            var dTo   = oDRS ? oDRS.getSecondDateValue() : null;

            if (dFrom && dTo) {
                this._applyOEScheduleFilters(dFrom, dTo);
            }
        },

        onOEScheduleApply: function () {
            var oDRS  = this._getDRS();

            if (!oDRS) {
                MessageToast.show("Date range control not found.");
                return;
            }

            var dFrom = oDRS.getDateValue();
            var dTo   = oDRS.getSecondDateValue();

            if (dFrom && dTo && dFrom > dTo) {
                oDRS.setValueState("Error");
                oDRS.setValueStateText("'From' date must not be after 'To' date.");
                MessageToast.show("Please correct the date range before applying.");
                return;
            }

            if (!dFrom || !dTo) {
                MessageToast.show("Please select a From and To date.");
                return;
            }

            oDRS.setValueState("None");
            this._oDateFilterState.fromDate = dFrom;
            this._oDateFilterState.toDate   = dTo;

            this._applyOEScheduleFilters(dFrom, dTo);
        },

        onCommoditySelectionFinish : function (oEvent)
        {
            var oMultiComboBox = oEvent.getSource();
            var aSelectedKeys = oMultiComboBox.getSelectedKeys();
            var aSelectedItems = oEvent.getParameter("changedItem");
            var bSelected = oEvent.getParameter("selected");
            
        },
        _applyOEScheduleFilters: function (dFrom, dTo) {
            var sMotKey = (this._oDateFilterState && this._oDateFilterState.motKey) || "11";
            
            var oModel = this.getView().getModel();
            var oView  = this.getView();

            oView.setBusy(true);

            // Shared completion tracker for both parallel reads below.
            // setBusy(false) only fires once BOTH requests have returned.
            var iCompletedRequests = 0;
            var iTotalRequests = 2;
            var checkCompleted = function () {
                iCompletedRequests++;
                if (iCompletedRequests === iTotalRequests) {
                    oView.setBusy(false);
                }
            };

        //sending calls Entityset wise     
        
        var UcmParameters ={
            p_FromDate: dFrom,
            p_ToDate:   dTo,
        }
        var UcmKeyPath = oModel.createKey("/UniqDealCmdty",UcmParameters) + "/Set";

        oModel.read(UcmKeyPath, {
            success: function (oData) {
                var UcmResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                var oJSONModel = oView.getModel("UniqDealCmdtyData");
                if (oJSONModel) {
                    oJSONModel.setProperty("/UniqDealCmdtySet", UcmResults);
                }
                checkCompleted();
            },
            error: function (oError) {
                checkCompleted();
                MessageToast.show("Error loading UniqDealCmdty.");
            }
        });        
        var oCommodity = this.aSelectedKeys.length ===0;
            var mParameters = { 
                p_FromDate: dFrom,
                p_ToDate:   dTo,
                p_MoT:      sMotKey
            };

            var dqKeyPath = oModel.createKey("/DealQtyMot", mParameters) + "/Set";

            oModel.read(dqKeyPath, {
                success: function (oData) {
                    var dqResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    var oJSONModel = oView.getModel("dealQtyMotData");
                    if (oJSONModel) {
                        oJSONModel.setProperty("/DealQtyMotSet", dqResults);
                    }
                    checkCompleted();
                },
                error: function (oError) {
                    checkCompleted();
                    MessageToast.show("Error loading DealQtyMot.");
                }
            });
            var dParameters = {
                p_FromDate: dFrom,
                p_ToDate:   dTo,
                p_MoT:      sMotKey
            };
            var ddKeyPath = oModel.createKey("/DealDetail", dParameters) + "/Set";

            oModel.read(ddKeyPath, {
                success: function (oData) {
                    var ddResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    var oJSONModel = oView.getModel("DealDetailData");
                    if (oJSONModel) {
                        oJSONModel.setProperty("/DealDetailSet", ddResults);
                    }
                    checkCompleted();
                },
                error: function (oError) {
                    checkCompleted();
                    MessageToast.show("Error loading DealDetail.");
                }
            });
                var EntParameters = {
                p_FromDate: dFrom,
                p_ToDate:   dTo,    
            };
            var EntKeyPath = oModel.createKey("/EntDetails", EntParameters) + "/Set";
            oModel.read(EntKeyPath, {
                success: function (oData) {
                    var EntResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    var oJSONModel = oView.getModel("EntDetailData");
                    if (oJSONModel) {
                        oJSONModel.setProperty("/EntDetailSet", EntResults);
                    }
                    checkCompleted();
                },
                error: function (oError) {
                    checkCompleted();
                    MessageToast.show("Error loading EntDetails.");
                }
            });

            var OblParameters = {
                p_FromDate: dFrom,
                p_ToDate:   dTo,
                
            };
            var  OblKeyPath = oModel.createKey("/OblDetails",  OblParameters) + "/Set";

            oModel.read( OblKeyPath, {
                success: function (oData) {
                    var  OblResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    var oJSONModel = oView.getModel("OblDetailData");
                    if (oJSONModel) {
                        oJSONModel.setProperty("/OblDetailSet", OblResults);
                    }
                    checkCompleted();
                },
                error: function (oError) {
                    checkCompleted();
                    MessageToast.show("Error loading  OblDetails.");
                }
            });

        //     var MatParameters = {
        //         p_FromDate: dFrom,
        //         p_ToDate:   dTo,
                
        //     };    
        //     var  MatKeyPath = oModel.createKey("/MatchPosSet",  MatParameters) + "/Set";

        //     oModel.read( MatKeyPath, {
        //         success: function (oData) {
        //             var  MatResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
        //             var oJSONModel = oView.getModel("MatDetailData");
        //             if (oJSONModel) {
        //                 oJSONModel.setProperty("/MatDetailSet",  MatResults);
        //             }
        //             checkCompleted();
        //         },
        //         error: function (oError) {
        //             checkCompleted();
        //             MessageToast.show("Error loading  MatDetails.");
        //         }
        //     });
        },
        _formatODataDate: function (oDate) {
            if (!oDate) { return ""; }
            var y = oDate.getFullYear();
            var m = String(oDate.getMonth() + 1).padStart(2, "0");
            var d = String(oDate.getDate()).padStart(2, "0");
            return y + "-" + m + "-" + d;
         },
        
        

        // ── Cross-App Navigation helpers ─────────────────────────────────────────
        navToCreateDeals: function () {
            this._navigateToIntent("CommodityManagementDeal", "create");
        },

        navToEditDeals: function () {
            this._navigateToIntent("CommodityManagementDeal", "lookup");
        },

        navToCreateNomination: function () {
            this._navigateToIntent("Nomination", "create");
        },

        navToCreateTicket: function () {
            this._navigateToIntent("Ticket", "create");
        },

        _navigateToIntent: function (sSemanticObject, sAction) {
            var oCrossNav = this._oCrossNav;
            if (!oCrossNav) {
                MessageToast.show(
                    "Navigation service is unavailable. " +
                    "Please run the app inside the SAP Fiori Launchpad."
                );
                return;
            }

            var oTarget = {
                target: { semanticObject: sSemanticObject, action: sAction }
            };

            oCrossNav.isIntentSupported([sSemanticObject + "-" + sAction])
                .done(function (oSupportedIntents) {
                    var sIntent = sSemanticObject + "-" + sAction;
                    if (oSupportedIntents[sIntent] && oSupportedIntents[sIntent].supported) {
                        oCrossNav.toExternal(oTarget);
                    } else {
                        MessageToast.show(
                            "Navigation to '" + sSemanticObject + "#" + sAction +
                            "' is not supported for your user role."
                        );
                    }
                })
                .fail(function () {
                    MessageToast.show("Could not verify navigation intent. Please try again.");
                });
        },

        // ── Layout helpers ───────────────────────────────────────────────────────
        onFullScreenToggle: function (oEvent) {
            LayoutHelper.toggleFullScreen(oEvent);
        }
    });
});