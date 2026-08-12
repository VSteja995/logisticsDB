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

            // ── Separate filter state per tab ─────────────────────────────────
            this._oDealFilterState = {
                fromDate:      null,
                toDate:        null,
                commodityKeys: []
            };
            this._oPosFilterState = {
                fromDate:      null,
                toDate:        null,
                commodityKeys: []
            };

            // Initialise JSON models for both controls
            var oUniqDealCmdtyModel = new JSONModel({ UniqDealCmdtySet: [] });
            this.getView().setModel(oUniqDealCmdtyModel, "UniqDealCmdtyData");

            var oDealQtyMotModel = new JSONModel({ DealQtyMotSet: [] });
            this.getView().setModel(oDealQtyMotModel, "dealQtyMotData");

            var oDealDetailModel = new JSONModel({ DealDetailSet: [] });
            this.getView().setModel(oDealDetailModel, "DealDetailData");

            var oTotalSummaryModel = new JSONModel({  TotalSummaryData: [] });
            this.getView().setModel(oTotalSummaryModel, "TotalSummaryData");

            var oEntDetailModel = new JSONModel({ EntDetailSet: [] });
            this.getView().setModel(oEntDetailModel, "EntDetailData");

            var oOblDetailModel = new JSONModel({ OblDetailSet: [] });
            this.getView().setModel(oOblDetailModel, "OblDetailData");

            // var oMatDetailModel = new JSONModel({  MatDetailSet: [] });
            // this.getView().setModel(oMatDetailModel, "MatDetailData");
        },

        // ══════════════════════════════════════════════════════════════════════
        //  DEALS OVERVIEW TAB — Filter Handlers
        // ══════════════════════════════════════════════════════════════════════

        onDealDateRangeChange: function (oEvent) {
            var oDRS  = oEvent.getSource();
            var dFrom = oDRS.getDateValue();
            var dTo   = oDRS.getSecondDateValue();

            if (dFrom && dTo && dFrom > dTo) {
                oDRS.setValueState("Error");
                oDRS.setValueStateText("'From' date must not be after 'To' date.");
                return;
            }
            oDRS.setValueState("None");
            this._oDealFilterState.fromDate = dFrom;
            this._oDealFilterState.toDate   = dTo;

            if (dFrom && dTo) {
                this._applyDealsFilters(dFrom, dTo);
            }
        },

        onDealModeChange: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "Train") {
                this._oDealFilterState.motKey = "02";
            } else if (sKey === "Truck") {
                this._oDealFilterState.motKey = "01";
            }
            else
            {
                this._oDealFilterState.motKey = " ";
            }

            var dFrom = this._oDealFilterState.fromDate;
            var dTo   = this._oDealFilterState.toDate;
            if (dFrom && dTo) {
                this._applyDealsFilters(dFrom, dTo);
            }
        },

        onDealCommoditySelectionFinish: function (oEvent) {
            var aSelectedKeys = oEvent.getSource().getSelectedKeys();
            this._oDealFilterState.commodityKeys = aSelectedKeys;

            var dFrom = this._oDealFilterState.fromDate;
            var dTo   = this._oDealFilterState.toDate;
            if (dFrom && dTo) {
                this._applyDealsFilters(dFrom, dTo);
            }
        },

        // ── Deals Overview: OData reads (UniqDealCmdty, DealQtyMot, DealDetail) ─
        _applyDealsFilters: function (dFrom, dTo) {
            var sMotKey        = this._oDealFilterState.motKey;
            var aCommodityKeys = this._oDealFilterState.commodityKeys || [];
            var oModel         = this.getView().getModel();
            var oView          = this.getView();

            oView.setBusy(true);

            var sFormattedFrom = this._formatODataDate(dFrom);
            var sFormattedTo   = this._formatODataDate(dTo);

            var iCompleted = 0;
            var iTotal     = 3;
            var checkDone  = function () {
                iCompleted++;
                if (iCompleted === iTotal) { oView.setBusy(false); }
            };

            // 1. UniqDealCmdty
            var UcmKeyPath = oModel.createKey("/UniqDealCmdty", {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo
            }) + "/Set";

            oModel.read(UcmKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("UniqDealCmdtyData");
                    if (oJM) { oJM.setProperty("/UniqDealCmdtySet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading UniqDealCmdty."); }
            });

            // 2. DealQtyMot
            var dqKeyPath = oModel.createKey("/DealQtyMot", {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo,
                p_MoT:      sMotKey
            }) + "/Set";

            oModel.read(dqKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("dealQtyMotData");
                    if (oJM) { oJM.setProperty("/DealQtyMotSet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading DealQtyMot."); }
            });

            // 3. DealDetail
            var ddKeyPath = oModel.createKey("/DealDetail", {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo,
                p_MoT:      sMotKey
            }) + "/Set";

            oModel.read(ddKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("DealDetailData");
                    if (oJM) { oJM.setProperty("/DealDetailSet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading DealDetail."); }
            });
        },

        // ══════════════════════════════════════════════════════════════════════
        //  LOGISTICS PLANNING TAB — Filter Handlers
        // ══════════════════════════════════════════════════════════════════════

        onPosDateRangeChange: function (oEvent) {
            var oDRS  = oEvent.getSource();
            var dFrom = oDRS.getDateValue();
            var dTo   = oDRS.getSecondDateValue();

            if (dFrom && dTo && dFrom > dTo) {
                oDRS.setValueState("Error");
                oDRS.setValueStateText("'From' date must not be after 'To' date.");
                return;
            }
            oDRS.setValueState("None");
            this._oPosFilterState.fromDate = dFrom;
            this._oPosFilterState.toDate   = dTo;

            if (dFrom && dTo) {
                this._applyPositionFilters(dFrom, dTo);
            }
        },

        onPosModeChange: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "Train") {
                this._oPosFilterState.motKey = "02";
            } else if (sKey === "Truck") {
                this._oPosFilterState.motKey = "01";
            }

            var dFrom = this._oPosFilterState.fromDate;
            var dTo   = this._oPosFilterState.toDate;
            if (dFrom && dTo) {
                this._applyPositionFilters(dFrom, dTo);
            }
        },

        onPosCommoditySelectionFinish: function (oEvent) {
            var aSelectedKeys = oEvent.getSource().getSelectedKeys();
            this._oPosFilterState.commodityKeys = aSelectedKeys;

            var dFrom = this._oPosFilterState.fromDate;
            var dTo   = this._oPosFilterState.toDate;
            if (dFrom && dTo) {
                this._applyPositionFilters(dFrom, dTo);
            }
        },

        // ── Logistics Planning: OData reads (EntDetails, OblDetails, TotalSummary)
        _applyPositionFilters: function (dFrom, dTo) {
            var sMotKey        = this._oPosFilterState.motKey || "11";
            var aCommodityKeys = this._oPosFilterState.commodityKeys || [];
            var sCommodity     = aCommodityKeys.join(",");
            var oModel         = this.getView().getModel();
            var oView          = this.getView();

            oView.setBusy(true);

            var sFormattedFrom = this._formatODataDate(dFrom);
            var sFormattedTo   = this._formatODataDate(dTo);

            var iCompleted = 0;
            var iTotal     = 3;
            var checkDone  = function () {
                iCompleted++;
                if (iCompleted === iTotal) { oView.setBusy(false); }
            };

            // 1. EntDetails
            var EntKeyPath = oModel.createKey("/EntDetails", {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo
            }) + "/Set";

            oModel.read(EntKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("EntDetailData");
                    if (oJM) { oJM.setProperty("/EntDetailSet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading EntDetails."); }
            });
            // 2. OblDetails
            var OblKeyPath = oModel.createKey("/OblDetails", {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo
            }) + "/Set";

            oModel.read(OblKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("OblDetailData");
                    if (oJM) { oJM.setProperty("/OblDetailSet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading OblDetails."); }
            });

            // 3. TotalSummary
            var TSKeyPath = oModel.createKey("/TotalSummary", {
                p_FromDate:  sFormattedFrom,
                p_ToDate:    sFormattedTo,
                p_commodity: sCommodity
            }) + "/Set";

            oModel.read(TSKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("TotalSummaryData");
                    if (oJM) { oJM.setProperty("/TotalSummarySet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading TotalSummary."); }
            });
        },
        _formatODataDate: function (oDate) {
            if (!oDate) { return ""; }
            var y = oDate.getFullYear();
            var m = String(oDate.getMonth() + 1).padStart(2, "0");
            var d = String(oDate.getDate()).padStart(2, "0");
            return y + "-" + m + "-" + d;
         },
       
             // ── Selection & Match Creation Logic ────────────────────────────────────
     
             _getSelectedRowData: function (sTableId) {
                 var oTable = this.byId(sTableId);
                 if (!oTable) { return []; }
                 
                 var aSelectedItems = oTable.getSelectedItems() || [];
                 return aSelectedItems.reduce(function (acc, oItem) {
                     var oCtx = oItem.getBindingContext();
                     if (!oCtx) { return acc; }
                     var oRow = Object.assign({}, oCtx.getObject()); // Shallow copy to avoid mutating model directly
     
                     if (sTableId === "entTbl") {
                         oRow.Quantity = oRow.PurchaseQuantity;
                         oRow.DealNumber = oRow.DealNumber || oRow.DocumentNumber;
                         oRow.OriginName = oRow.OriginName || oRow.Origin;
                         oRow.ScheduleDate = oRow.DeliveryDate || oRow.ScheduleDate;
                         oRow.ScheduleMonth = oRow.ScheduleMonth || oRow.ScheduleMonth;
                         oRow.SupplierName = oRow.SupplierID || "";
                         oRow._tableId = sTableId;
                     } else if (sTableId === "oblTbl") {
                         oRow.Quantity = oRow.SalesQuantity;
                         oRow.DealNumber = oRow.DealNumber || oRow.DocumentNumber;
                         oRow.DestinationName = oRow.DestinationName || oRow.Destination;
                         oRow.ScheduleDate = oRow.DueDate || oRow.ScheduleDate;
                         oRow.ScheduleMonth = oRow.ScheduleMonth || oRow.ScheduleMonth;
                         oRow.Supplier = oRow.Customer;
                         oRow.CustomerName = oRow.CustomerID || "";
                         oRow._tableId = sTableId;
                     } else if (sTableId === "invTbl") {
                         oRow.Quantity = oRow.OnHandInventory || oRow.InventoryQty;
                         oRow.InventoryQty = oRow.Quantity;
                         oRow.InventoryUOM = oRow.UOM;
                         oRow.DisplayParty = oRow.Plant;
                         oRow.DisplayLocation = oRow.StorageLocation;
                         oRow.Origin = oRow.Plant || "";
                         oRow.OriginName = oRow.StorageLocation || "";
                         oRow.Destination = "";
                         oRow.DestinationName = "";
                         oRow.DealNumber = oRow.Plant ? (oRow.Plant + (oRow.StorageLocation ? "/" + oRow.StorageLocation : "")) : oRow.DocumentNumber;
                         oRow._tableId = sTableId;
                     }
                     acc.push(oRow);
                     return acc;
                 }, []);
             },
     
             onCreateMatch: function () {
                 var aEntRows = this._getSelectedRowData("entTbl");
                 var aOblRows = this._getSelectedRowData("oblTbl");
                 var aInvRows = this._getSelectedRowData("invTbl");
                 
                 var nTotalSel = aEntRows.length + aOblRows.length + aInvRows.length;
                 if (nTotalSel < 2) {
                    sap.m.MessageBox.warning("Please select rows from at least 2 tables to create a match.\n You can select from Supply (Entitlements), Demand (Obligations), and/or Inventory.", { 
                        title: "Create Match — Selection Required" 
                    });
                    return;
                }
                 
     
                 var aSourceRows, aTargetGroups;
                 if (aEntRows.length > 0) {
                     aSourceRows = aEntRows.map(function (r) { return { row: r, type: "purchase" }; });
                     aTargetGroups = [];
                     if (aOblRows.length) { aOblRows.forEach(function (r) { aTargetGroups.push({ row: r, type: "sales" }); }); }
                     if (aInvRows.length) { aInvRows.forEach(function (r) { aTargetGroups.push({ row: r, type: "inventory" }); }); }
                 } else if (aInvRows.length > 0) {
                     aSourceRows = aInvRows.map(function (r) { return { row: r, type: "inventory" }; });
                     aTargetGroups = aOblRows.map(function (r) { return { row: r, type: "sales" }; });
                 } else {
                     sap.m.MessageBox.warning("Please select at least one Entitlement or Inventory row as a match source.", { 
                         title: "Create Match — Source Required" 
                     });
                     return;
                 }
     
                 if (!aTargetGroups || aTargetGroups.length === 0) {
                     sap.m.MessageBox.warning("Please select at least one Obligation or Inventory row as a match target.", { 
                         title: "Create Match — Target Required" 
                     });
                     return;
                 }
     
                 // Staging new parent nodes into the matched model
                 var aNewParentNodes = aSourceRows.map(function(oSrc) {
                     return {
                         NodeLabel: "Match: " + oSrc.row.DealNumber,
                         DealNumber: oSrc.row.DealNumber,
                         Commodity: oSrc.row.Commodity,
                         DisplayQty: oSrc.row.Quantity,
                         Status: "Draft",
                         RowType: "parent",
                         children: aTargetGroups.map(function(oTgt) {
                             return {
                                 NodeLabel: "Target: " + oTgt.row.DealNumber,
                                 DealNumber: oTgt.row.DealNumber,
                                 MatchedQty: Math.min(oSrc.row.Quantity || 0, oTgt.row.Quantity || 0),
                                 Status: "Pending",
                                 RowType: "child"
                             };
                         })
                     };
                 });
     
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (!oMM) {
                     oMM = new JSONModel({ results: [] });
                     this.getView().setModel(oMM, "matchedPositionsModel");
                 }
                 
                 var aExisting = (oMM.getProperty("/results") || []).concat(aNewParentNodes);
                 oMM.setProperty("/results", aExisting);
     
                 this._clearAllTableSelections();
                 MessageToast.show(aNewParentNodes.length + " match pair(s) staged successfully.");
             },
     
             _clearAllTableSelections: function () {
                 var aTableIds = ["entTbl", "oblTbl", "invTbl"];
                 aTableIds.forEach(function (sId) {
                     var oTable = this.byId(sId);
                     if (oTable && oTable.clearSelection) {
                         oTable.clearSelection();
                     }
                 }, this);
             },
     
             onClearAllSelections: function () {
                 this._clearAllTableSelections();
                 MessageToast.show("Selections cleared.");
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

        // _navigateToIntent: function (sSemanticObject, sAction) {
        //     var oCrossNav = this._oCrossNav;
        //     if (!oCrossNav) {
        //         MessageToast.show(
        //             "Navigation service is unavailable. " +
        //             "Please run the app inside the SAP Fiori Launchpad."
        //         );
        //         return;
        //     }

        //     var oTarget = {
        //         target: { semanticObject: sSemanticObject, action: sAction }
        //     };

        //     oCrossNav.isIntentSupported([sSemanticObject + "-" + sAction])
        //         .done(function (oSupportedIntents) {
        //             var sIntent = sSemanticObject + "-" + sAction;
        //             if (oSupportedIntents[sIntent] && oSupportedIntents[sIntent].supported) {
        //                 oCrossNav.toExternal(oTarget);
        //             } else {
        //                 MessageToast.show(
        //                     "Navigation to '" + sSemanticObject + "#" + sAction +
        //                     "' is not supported for your user role."
        //                 );
        //             }
        //         })
        //         .fail(function () {
        //             MessageToast.show("Could not verify navigation intent. Please try again.");
        //         });
        // }
        _navigateToIntent: function (sSemanticObject, sAction) {
            var oCrossNav = this._oCrossNav;
            if (!oCrossNav) {
                MessageToast.show(
                    "Navigation service is unavailable. " +
                    "Please run the app inside the SAP Fiori Launchpad."
                );
                return;
            }
        
            var sIntent = sSemanticObject + "-" + sAction;
        
            oCrossNav.isIntentSupported([sIntent])
                .done(function (oSupportedIntents) {
                    if (oSupportedIntents[sIntent] && oSupportedIntents[sIntent].supported) {
                        // Generate the target intent URL hash
                        var sHash = oCrossNav.hrefForExternal({
                            target: {
                                semanticObject: sSemanticObject,
                                action: sAction
                            }
                        });
        
                        if (sHash) {
                            // Combine launchpad base URL with the hash and open in new tab
                            var sFullUrl = window.location.href.split('#')[0] + sHash;
                            window.open(sFullUrl, '_blank');
                        }
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

        // ── GIT ayout helpers ───────────────────────────────────────────────────────
        onFullScreenToggle: function (oEvent) {
            LayoutHelper.toggleFullScreen(oEvent);
        }
    });
});