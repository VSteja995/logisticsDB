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
                fromDate:     null,
                toDate:       null,
                motKey:       "11",   // Default mode of transport key matching backend expectation
                commodityKeys: []     // Selected commodity keys from the MultiComboBox
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
                sMot = "01";
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

            this._oDateFilterState.commodityKeys = aSelectedKeys;

            // Re-run the read set if a date range is already active, so the
            // commodity filter takes effect immediately.
            var oDRS  = this._getDRS();
            var dFrom = oDRS ? oDRS.getDateValue()       : null;
            var dTo   = oDRS ? oDRS.getSecondDateValue() : null;

            if (dFrom && dTo) {
                this._applyOEScheduleFilters(dFrom, dTo);
            }
        },
        _applyOEScheduleFilters: function (dFrom, dTo) {
            var sMotKey = (this._oDateFilterState && this._oDateFilterState.motKey) || "11";
            
            var oModel = this.getView().getModel();
            var oView  = this.getView();
        
            oView.setBusy(true);
        
            // Format dates as strings (YYYY-MM-DD) to prevent timezone and time component issues
            var sFormattedFrom = this._formatODataDate(dFrom);
            var sFormattedTo   = this._formatODataDate(dTo);
        
            var iCompletedRequests = 0;
            var iTotalRequests = 6; // Total number of parallel reads below
            var checkCompleted = function () {
                iCompletedRequests++;
                if (iCompletedRequests === iTotalRequests) {
                    oView.setBusy(false);
                }
            };
        
            // 1. UniqDealCmdty
            var UcmParameters = {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo
            };
            var UcmKeyPath = oModel.createKey("/UniqDealCmdty", UcmParameters) + "/Set";
        
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
        
            // 2. DealQtyMot
            var dqParameters = { 
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo,
                p_MoT:      sMotKey
            };
            var dqKeyPath = oModel.createKey("/DealQtyMot", dqParameters) + "/Set";
        
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
        
            // 3. DealDetail
            var dParameters = {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo,
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
        
            // 4. EntDetails
            var EntParameters = {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo
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
        
            // 5. OblDetails
            var OblParameters = {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo
            };
            var OblKeyPath = oModel.createKey("/OblDetails", OblParameters) + "/Set";
        
            oModel.read(OblKeyPath, {
                success: function (oData) {
                    var OblResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    var oJSONModel = oView.getModel("OblDetailData");
                    if (oJSONModel) {
                        oJSONModel.setProperty("/OblDetailSet", OblResults);
                    }
                    checkCompleted();
                },
                error: function (oError) {
                    checkCompleted();
                    MessageToast.show("Error loading OblDetails.");
                }
            });
        
            // 6. TotalSummary
            var aCommodityKeys = (this._oDateFilterState && this._oDateFilterState.commodityKeys) || [];
            var sCommodity     = aCommodityKeys.join(",");
        
            var TSParameters = {
                p_FromDate:  sFormattedFrom,
                p_ToDate:    sFormattedTo,
                p_commodity: sCommodity
            };    
            var TSKeyPath = oModel.createKey("/TotalSummary", TSParameters) + "/Set";
        
            oModel.read(TSKeyPath, {
                success: function (oData) {
                    var TSResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    var oJSONModel = oView.getModel("TotalSummaryData");
                    if (oJSONModel) {
                        oJSONModel.setProperty("/TotalSummarySet", TSResults);
                    }
                    checkCompleted();
                },
                error: function (oError) {
                    checkCompleted();
                    MessageToast.show("Error loading TotalSummary.");
                }
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
                     sap.m.MessageBox.warning("Please select rows from at least 2 tables to create a match.\n\nYou can select from Supply (Entitlements), Demand (Obligations), and/or Inventory.", { 
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