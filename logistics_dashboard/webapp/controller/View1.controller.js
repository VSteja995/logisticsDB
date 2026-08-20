sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "genslogiques/logisticsdashboard/utils/LayoutHelper",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, JSONModel, LayoutHelper, MessageToast, MessageBox, Filter, FilterOperator) => {
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
                commodityKeys: [],
                motKey: null
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

            var oDealDetailModel = new JSONModel({ DealDetailSet: [] , hasMore: false });
            this.getView().setModel(oDealDetailModel, "DealDetailData");
            // Pagination tracking state for DealDetail
            this._sNextDealUrl = null;
            this._aAllDealResults = [];
            this._aDealBuffer = [];
            this._onDealDetailLoadedCallback = null;

            var oTotalSummaryModel = new JSONModel({  TotalSummaryData: [] });
            this.getView().setModel(oTotalSummaryModel, "TotalSummaryData");

            var oEntDetailModel = new JSONModel({ EntDetailSet: [] });
            this.getView().setModel(oEntDetailModel, "EntDetailData");

            var oOblDetailModel = new JSONModel({ OblDetailSet: [] });
            this.getView().setModel(oOblDetailModel, "OblDetailData");

            var oPosSmryModel = new JSONModel({ PosSmrySet: [] });
            this.getView().setModel(oPosSmryModel, "PosSmryData");

            var oMatchPosModel = new JSONModel({ MatchPosSet: [] });
            this.getView().setModel(oMatchPosModel, "MatchPosData");

            

            
                // Local UI state for view-level toggles (e.g. Deals table full screen)
                var oViewModel = new JSONModel({ isTableFullScreen: false });
                this.getView().setModel(oViewModel, "view");

        },

        onAfterRendering: function () {
 
            // =====================================================
            // Deals Overview default filters
            // =====================================================
         
            if (!this._bDefaultDealsInitialized) {
         
                this._bDefaultDealsInitialized = true;
         
                this._initializeDefaultDealsFilters();
            }

            // =====================================================
            // Logistics Planning default filters
            // =====================================================
         
            if (!this._bDefaultPlanningInitialized) {
         
                this._bDefaultPlanningInitialized = true;
         
                this._initializeDefaultPlanningFilters();
            }
        },

        _initializeDefaultDealsFilters: function () {
 
            // =====================================================
            // 1. Calculate default date range
            // =====================================================
         
            var dToday = new Date();
         
            var dFromDate = new Date(dToday);
         
            dFromDate.setMonth(
                dFromDate.getMonth() - 1
            );
         
            // =====================================================
            // 2. Store default filter values
            // =====================================================
         
            this._oDealFilterState.fromDate = dFromDate;
            this._oDealFilterState.toDate = dToday;
         
            // Truck
            this._oDealFilterState.motKey = "01";
         
            // No commodity filter
            this._oDealFilterState.commodityKeys = [];

            // =====================================================
            // 3. Get controls from DealsOverview fragment
            // =====================================================
         
            var oDateRange = this.byId(
                "MainPnlFra011--DlPnl1DRS005"
            );
         
            var oMode = this.byId(
                "MainPnlFra011--DlPnl1SgB007"
            );
         
         
            // =====================================================
            // 4. Set Date Range
            // =====================================================
         
            if (oDateRange) {
         
                oDateRange.setDateValue(dFromDate);
                oDateRange.setSecondDateValue(dToday);
         
                console.log(
                    "Default Date Range set:",
                    dFromDate,
                    dToday
                );
         
            } else {
         
                console.error(
                    "DateRangeSelection not found"
                );
         
                return;
            }
      
            // =====================================================
            // 5. Set Mode = Truck
            // =====================================================
         
            if (oMode) {
         
                oMode.setSelectedKey("Truck");
         
                console.log(
                    "Default Mode set: Truck"
                );
         
            } else {
         
                console.error(
                    "SegmentedButton not found"
                );
         
                return;
            }
         
         
            // =====================================================
            // 6. Load Deals data using default filters
            // =====================================================
         
            var oModel = this.getView().getModel();
         
            if (!oModel) {
         
                console.error(
                    "OData model not available"
                );
         
                return;
            }

            // Wait until OData metadata is available
            oModel.metadataLoaded().then(function () {
         
                console.log(
                    "Loading Deals data with default filters..."
                );
         
                this._applyDealsFilters(
                    dFromDate,
                    dToday
                );
         
            }.bind(this));
         
        },
         
        _initializeDefaultPlanningFilters: function () {
         
            // =====================================================
            // 1. Calculate default date range
            //    From = today - 1 month
            //    To   = today
            // =====================================================
         
            var dToday = new Date();
         
            var dFromDate = new Date(dToday);
         
            dFromDate.setMonth(
                dFromDate.getMonth() - 1
            );
         
         
            // =====================================================
            // 2. Store default date range in filter state
            // =====================================================
         
            this._oPosFilterState.fromDate = dFromDate;
            this._oPosFilterState.toDate = dToday;
         
            // No commodity selected initially
            this._oPosFilterState.commodityKeys = [];
         
         
            // =====================================================
            // 3. Get Logistics Planning DateRangeSelection
            // =====================================================
         
            var oDateRange = this.byId(
                "MainPnlFra013--dateDrs"
            );
         
            var oDateRange2 = this.byId(
                "MainPnlFra013--monthDrs"
            );
            // =====================================================
            // 4. Set default date range in UI
            // =====================================================
         
            if (oDateRange) {
         
                oDateRange.setDateValue(dFromDate);
         
                oDateRange.setSecondDateValue(dToday);
         
                console.log(
                    "Default Logistics Date Range set:",
                    dFromDate,
                    dToday
                );
         
            } else {
         
                console.error(
                    "Logistics DateRangeSelection not found"
                );
         
                return;
            }
                 
            // =====================================================
            // 5. Get OData model
            // =====================================================
         
            var oModel = this.getView().getModel();
         
            if (!oModel) {
         
                console.error(
                    "OData model not available"
                );
         
                return;
            }
         
         
            // =====================================================
            // 6. Wait for metadata and load default data
            // =====================================================
         
            oModel.metadataLoaded().then(function () {
         
                console.log(
                    "Loading default Logistics Planning data..."
                );
         
                this._applyPositionFilters(
                    dFromDate,
                    dToday
                );
         
            }.bind(this));
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
            //4. positionSummary
            var TSKeyPath = oModel.createKey("/PositionsSummary", {
                p_FromDate:  sFormattedFrom,
                p_ToDate:    sFormattedTo,
            }) + "/Set";

            oModel.read(TSKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("MonthPosSmryData");
                    if (oJM) { oJM.setProperty("/MonthPosSmrySet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading PositionsSummary."); }
            });
            //MATCHPOS
            var TSKeyPath = oModel.createKey("/PositionsSummary", {
                p_FromDate:  sFormattedFrom,
                p_ToDate:    sFormattedTo,
            }) + "/Set";

            oModel.read(TSKeyPath, {
                success: function (oData) {
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    var oJM = oView.getModel("PosSmryData");
                    if (oJM) { oJM.setProperty("/PosSmrySet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading PositionsSummary."); }
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
                 var oTable = this.byId("MainPnlFra013--" + sTableId) || this.byId(sTableId);
                 if (!oTable) { return []; }
                 
                 var aSelectedItems = oTable.getSelectedItems() || [];
                 var oBindingInfo = oTable.getBindingInfo("items");
                 var sModelName = oBindingInfo ? oBindingInfo.model : undefined;

                 return aSelectedItems.reduce(function (acc, oItem) {
                     var oCtx = (sModelName ? oItem.getBindingContext(sModelName) : null) || oItem.getBindingContext();
                     if (!oCtx) { return acc; }
                     var oRow = Object.assign({}, oCtx.getObject()); // Shallow copy to avoid mutating model directly
     
                     if (sTableId === "entTbl") {
                         oRow.Quantity = parseFloat(oRow.PurchaseQuantity) || 0;
                         oRow.DealNumber = oRow.DealNumber || oRow.DocumentNumber;
                         oRow.OriginName = oRow.OriginName || oRow.Origin;
                         oRow.ScheduleDate = oRow.DeliveryDate || oRow.ScheduleDate;
                         oRow.ScheduleMonth = oRow.ScheduleMonth || oRow.ScheduleMonth;
                         oRow.SupplierName = oRow.SupplierID || "";
                         oRow._tableId = sTableId;
                     } else if (sTableId === "oblTbl") {
                         oRow.Quantity = parseFloat(oRow.SalesQuantity) || 0;
                         oRow.DealNumber = oRow.DealNumber || oRow.DocumentNumber;
                         oRow.DestinationName = oRow.DestinationName || oRow.Destination;
                         oRow.ScheduleDate = oRow.DueDate || oRow.ScheduleDate;
                         oRow.ScheduleMonth = oRow.ScheduleMonth || oRow.ScheduleMonth;
                         oRow.Supplier = oRow.Customer;
                         oRow.CustomerName = oRow.CustomerID || "";
                         oRow._tableId = sTableId;
                     } else if (sTableId === "invTbl") {
                         oRow.Quantity = parseFloat(oRow.OnHandInventory || oRow.InventoryQty) || 0;
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
                    MessageBox.warning("Please select rows from at least 2 tables to create a match.\n You can select from Supply (Entitlements), Demand (Obligations), and/or Inventory.", { 
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
                     MessageBox.warning("Please select at least one Entitlement or Inventory row as a match source.", { 
                         title: "Create Match — Source Required" 
                     });
                     return;
                 }
     
                 if (!aTargetGroups || aTargetGroups.length === 0) {
                     MessageBox.warning("Please select at least one Obligation or Inventory row as a match target.", { 
                         title: "Create Match — Target Required" 
                     });
                     return;
                 }
     
                 // Staging new parent nodes into the matched model
                 var aNewParentNodes = aSourceRows.map(function(oSrc) {
                     var nSrcQty = parseFloat(oSrc.row.Quantity) || 0;
                     return {
                         NodeLabel: "Match: " + oSrc.row.DealNumber,
                         DealNumber: oSrc.row.DealNumber,
                         DocumentNumber: oSrc.row.DocumentNumber || oSrc.row.DealNumber,
                         DocumentItem: oSrc.row.DocumentItem || oSrc.row.PurchaseItem || "",
                         Commodity: oSrc.row.Commodity,
                         DisplayQty: nSrcQty,
                         MatchedQtyFormatted: nSrcQty.toLocaleString(),
                         DisplayUOM: oSrc.row.UOM || oSrc.row.PurchaseUOM || "LB",
                         TransactionType: "P",
                         Incoterms: oSrc.row.IncoTerms || "",
                         ScheduleType: oSrc.row.ScheduleType || "",
                         RefDocType: oSrc.row.RefDocType || "",
                         ModeOfTransportLabel: oSrc.row.ModeOfTransportText || oSrc.row.ModeOfTransport || "",
                         DisplayDate: oSrc.row.DeliveryDate || oSrc.row.ScheduleDate || "",
                         DisplayMonth: oSrc.row.ScheduleMonth || "",
                         DisplayParty: oSrc.row.SupplierName || oSrc.row.Supplier || "",
                         Origin: oSrc.row.Origin || "",
                         OriginName: oSrc.row.OriginName || "",
                         Destination: oSrc.row.Destination || "",
                         DestinationName: oSrc.row.DestinationName || "",
                         DisplayWeekID: oSrc.row.WeekID || "",
                         MatchSrc: "Supply",
                         Status: "Draft",
                         RowType: "parent",
                         _checked: true,
                         children: aTargetGroups.map(function(oTgt) {
                             var nTgtQty = parseFloat(oTgt.row.Quantity) || 0;
                             var nMatchQty = Math.min(nSrcQty, nTgtQty);
                             return {
                                 NodeLabel: "Target: " + oTgt.row.DealNumber,
                                 DealNumber: oTgt.row.DealNumber,
                                 DocumentNumber: oTgt.row.DocumentNumber || oTgt.row.DealNumber,
                                 DocumentItem: oTgt.row.DocumentItem || oTgt.row.SalesItem || "",
                                 Commodity: oTgt.row.Commodity,
                                 MatchedQty: nMatchQty,
                                 MatchedQtyFormatted: nMatchQty.toLocaleString(),
                                 MatchedUOM: oTgt.row.UOM || oTgt.row.SalesUOM || "LB",
                                 TransactionType: "S",
                                 Incoterms: oTgt.row.IncoTerms || "",
                                 ScheduleType: oTgt.row.ScheduleType || "",
                                 RefDocType: oTgt.row.RefDocType || "",
                                 ModeOfTransportLabel: oTgt.row.ModeOfTransportText || oTgt.row.ModeOfTransport || "",
                                 DisplayDate: oTgt.row.DueDate || oTgt.row.ScheduleDate || "",
                                 DisplayMonth: oTgt.row.ScheduleMonth || "",
                                 DisplayParty: oTgt.row.CustomerName || oTgt.row.Customer || "",
                                 Origin: oTgt.row.Origin || "",
                                 OriginName: oTgt.row.OriginName || "",
                                 Destination: oTgt.row.Destination || "",
                                 DestinationName: oTgt.row.DestinationName || "",
                                 DisplayWeekID: oTgt.row.WeekID || "",
                                 MatchSrc: "Demand",
                                 Status: "Pending",
                                 RowType: "child",
                                 _checked: true
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
                     var oTable = this.byId("MainPnlFra013--" + sId) || this.byId(sId);
                     if (oTable) {
                         if (typeof oTable.removeSelections === "function") {
                             oTable.removeSelections(true);
                         } else if (typeof oTable.clearSelection === "function") {
                             oTable.clearSelection();
                         }
                     }
                 }, this);
             },
     
             onClearAllSelections: function () {
                 this._clearAllTableSelections();
                 MessageToast.show("Selections cleared.");
             },

             onSelectionChangeENT: function () {
                 // Entitlements table selection changed
             },

             onSelectionChangeOBL: function () {
                 // Obligations table selection changed
             },

             onConfirmMatch: function () {
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (!oMM) {
                     MessageToast.show("No matches to confirm.");
                     return;
                 }
                 var aResults = oMM.getProperty("/results") || [];
                 if (aResults.length === 0) {
                     MessageToast.show("No matches to confirm.");
                     return;
                 }
                 var nConfirmed = 0;
                 aResults.forEach(function (oParent) {
                     if (oParent._checked) {
                         oParent.Status = "Confirmed";
                         nConfirmed++;
                     }
                     if (oParent.children) {
                         oParent.children.forEach(function (oChild) {
                             if (oChild._checked) {
                                 oChild.Status = "Confirmed";
                             }
                         });
                     }
                 });
                 oMM.refresh(true);
                 MessageToast.show(nConfirmed + " match(es) confirmed.");
             },

             onMatchCheckChange: function (oEvent) {
                 var oSource = oEvent.getSource();
                 var oCtx = oSource.getBindingContext("matchedPositionsModel");
                 if (!oCtx) { return; }
                 var oObj = oCtx.getObject();
                 var bSelected = oEvent.getParameter("selected");
                 if (oObj.RowType === "parent" && oObj.children) {
                     oObj.children.forEach(function (oChild) {
                         oChild._checked = bSelected;
                     });
                 }
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (oMM) { oMM.refresh(true); }
             },

             onMoTSelectionChange: function () {
                 // Mode of Transport selection changed
             },

             onWeekIDSelectionChange: function () {
                 // Week ID selection changed
             },

             onMatchedQtyChange: function (oEvent) {
                 var oSource = oEvent.getSource();
                 var oCtx = oSource.getBindingContext("matchedPositionsModel");
                 if (!oCtx) { return; }
                 var oObj = oCtx.getObject();
                 var nVal = parseFloat(oSource.getValue()) || 0;
                 oObj.MatchedQty = nVal;
                 oObj.MatchedQtyFormatted = nVal.toLocaleString();
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (oMM) { oMM.refresh(true); }
             },

             onDeleteMatchedRow: function (oEvent) {
                 var oSource = oEvent.getSource();
                 var oCtx = oSource.getBindingContext("matchedPositionsModel");
                 if (!oCtx) { return; }
                 var sPath = oCtx.getPath();
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (!oMM) { return; }
                 var aResults = oMM.getProperty("/results") || [];
                 var aParts = sPath.split("/");
                 if (aParts.length === 3 && aParts[1] === "results") {
                     var iIdx = parseInt(aParts[2], 10);
                     aResults.splice(iIdx, 1);
                 } else if (aParts.length === 5 && aParts[1] === "results" && aParts[3] === "children") {
                     var iParentIdx = parseInt(aParts[2], 10);
                     var iChildIdx = parseInt(aParts[4], 10);
                     if (aResults[iParentIdx] && aResults[iParentIdx].children) {
                         aResults[iParentIdx].children.splice(iChildIdx, 1);
                         if (aResults[iParentIdx].children.length === 0) {
                             aResults.splice(iParentIdx, 1);
                         }
                     }
                 }
                 oMM.setProperty("/results", aResults);
                 oMM.refresh(true);
                 MessageToast.show("Matched row removed.");
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
        },
        onDealToggleFullScreen: function (oEvent) {
            var oViewModel = this.getView().getModel("view");
            var bFullScreen = true;
            if (oViewModel) {
                bFullScreen = !oViewModel.getProperty("/isTableFullScreen");
                oViewModel.setProperty("/isTableFullScreen", bFullScreen);
            }

            var sPrefix = "MainPnlFra011--";
            var oPanel = this.byId(sPrefix + "DlPnl2Pnl034") || this.byId("DlPnl2Pnl034");
            if (!oPanel && oEvent && typeof oEvent.getSource === "function") {
                var oBtn = oEvent.getSource();
                var oParent1 = oBtn ? oBtn.getParent() : null;
                var oParent2 = oParent1 ? oParent1.getParent() : null;
                oPanel = oParent2 ? oParent2.getParent() : null;
            }

            var oScrollContainer = this.byId(sPrefix + "DlPnl2Scr050") || this.byId("DlPnl2Scr050");
            var oSchedulePanel = this.byId(sPrefix + "DlPnl1Pnl001") || this.byId("DlPnl1Pnl001");
            var oKpiPanel = this.byId(sPrefix + "_IDGenPanel") || this.byId("_IDGenPanel");

            if (bFullScreen) {
                if (oPanel) {
                    oPanel.addStyleClass("dealsTableFullScreen");
                }
                if (oScrollContainer) {
                    oScrollContainer.setHeight("100%");
                }
                if (oSchedulePanel) {
                    oSchedulePanel.setVisible(false);
                }
                if (oKpiPanel) {
                    oKpiPanel.setVisible(false);
                }
                document.body.classList.add("fullScreenLock");
            } else {
                if (oPanel) {
                    oPanel.removeStyleClass("dealsTableFullScreen");
                }
                if (oScrollContainer) {
                    oScrollContainer.setHeight("280px");
                }
                if (oSchedulePanel) {
                    oSchedulePanel.setVisible(true);
                }
                if (oKpiPanel) {
                    oKpiPanel.setVisible(true);
                }
                document.body.classList.remove("fullScreenLock");
            }
        }
        
    });
});