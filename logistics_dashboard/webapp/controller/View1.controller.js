sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "genslogiques/logisticsdashboard/utils/LayoutHelper",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/Dialog",
    "sap/ui/unified/FileUploader"
], function (Controller, JSONModel, LayoutHelper, MessageToast, MessageBox, Filter, FilterOperator, Fragment, Dialog, FileUploader) {
    "use strict";

    // ── Pure Date & Type Utility Helpers ─────────────────────────────────────
    function _parseDate(vDate) {
        if (!vDate) {
            return null;
        }
        if (vDate instanceof Date) {
            return isNaN(vDate.getTime()) ? null : vDate;
        }
        if (typeof vDate === "string") {
            var mOData = /\/Date\((\d+)\)\//.exec(vDate);
            if (mOData) {
                return new Date(parseInt(mOData[1], 10));
            }
            var d = new Date(vDate);
            if (!isNaN(d.getTime())) {
                return d;
            }
        }
        return null;
    }

    function _toODataDate(vDate) {
        var d = _parseDate(vDate);
        return d || null;
    }

    function _toODataMonth(vDate, sFallbackMonth) {
        if (sFallbackMonth && typeof sFallbackMonth === "string" && sFallbackMonth.trim()) {
            var sClean = sFallbackMonth.trim();
            if (sClean.length === 1) {
                return "0" + sClean;
            }
            if (sClean.length === 2 && !isNaN(parseInt(sClean, 10))) {
                return sClean;
            }
        }
        var d = _parseDate(vDate);
        if (d) {
            return String(d.getMonth() + 1).padStart(2, "0");
        }
        return sFallbackMonth || "";
    }

    // Dynamic MOT description map - populated from actual data
    var _motDescMap = {};

    function _motLabel(sCode) {
        if (!sCode) { return ""; }
        return _motDescMap[sCode] || sCode;
    }

    function _motDisplay(sCode) {
        if (!sCode) { return ""; }
        var sDesc = _motDescMap[sCode] || "";
        return sDesc ? (sCode + " \u2014 " + sDesc) : sCode;
    }

    function _fmtDate(vDate) {
        var d = _parseDate(vDate);
        if (!d) { return ""; }
        return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + d.getUTCFullYear();
    }

    function _fmtMonth(vDate) {
        var d = _parseDate(vDate);
        if (!d) { return ""; }
        return String(d.getUTCMonth() + 1).padStart(2, "0");
    }

    function _fmtQty(n, sUOM) {
        return parseFloat(n || 0).toLocaleString("en-US") + (sUOM ? " " + sUOM : "");
    }

    function _toODataTimestamp(sDateString) {
        if (!sDateString) return null;
        var oDate = new Date(sDateString);
        if (isNaN(oDate.getTime())) return null;
        var nTimestamp = oDate.getTime();
        return "/Date(" + nTimestamp + ")/";
    }

    return Controller.extend("genslogiques.logisticsdashboard.controller.View1", {

        // ── Lifecycle ────────────────────────────────────────────────────────────
        onInit() {
            this._oCrossNav = null;
            if (sap.ushell && sap.ushell.Container) {
                this._oCrossNav = sap.ushell.Container.getService("CrossApplicationNavigation");
            }
           
                
            
                
            // ── Separate filter state per tab ─────────────────────────────────
            this._oDealFilterState = {
                fromDate: null,
                toDate: null,
                commodityKeys: [],
                motKey: " "
            };
            this._oPosFilterState = {
                fromDate:      null,
                toDate:        null,
                commodityKeys: [],
                motKey:        " "
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

            // Track latest Deals request
             this._iDealsRequestId = 0;

            var oTotalSummaryModel = new JSONModel({ TotalSummarySet: [] });
            this.getView().setModel(oTotalSummaryModel, "TotalSummaryData");

            var oEntDetailModel = new JSONModel({ EntDetailSet: [] });
            this.getView().setModel(oEntDetailModel, "EntDetailData");

            var oOblDetailModel = new JSONModel({ OblDetailSet: [] });
            this.getView().setModel(oOblDetailModel, "OblDetailData");
           

            // Nomination Details Model
var oNomDetailsModel = new JSONModel({ NomDetailsSet: [] });
this.getView().setModel(oNomDetailsModel, "NomDetailsData");

// Ticket Details Model
var oTicketDetailsModel = new JSONModel({  TicketDetailsSet: [] });
this.getView().setModel( oTicketDetailsModel, "TicketDetailsData" );

// =====================================================
// Nomination Dropdown Models
// =====================================================

var oNomCmdtyModel = new JSONModel({
    UniqNomCmdtySet: []
});
this.getView().setModel(
    oNomCmdtyModel,
    "UniqNomCmdtyData"
);


var oNomLocModel = new JSONModel({
    UniqNomLocSet: []
});
this.getView().setModel(
    oNomLocModel,
    "UniqNomLocData"
);


var oNomStatModel = new JSONModel({
    UniqNomStatSet: []
});
this.getView().setModel(
    oNomStatModel,
    "UniqNomStatData"
);


// Keep complete nomination result
this._aNominationResults = [];

// Nomination filter state
this._oNomFilterState = {
    fromDate: null,
    toDate: null,
    dealId: "",
    nominationId: "",
    commodity: "",
    location: "",
    status: ""
};



            var oPosSmryModel = new JSONModel({ PosSmrySet: [] });
            this.getView().setModel(oPosSmryModel, "PosSmryData");

            var oMatchPosModel = new JSONModel({ MatchPosSet: [] });
            this.getView().setModel(oMatchPosModel, "MatchPosData");

            // Nomination Dialog & Value Help models
            this.getView().setModel(new JSONModel({ options: [] }), "nomMOTModel");
            this.getView().setModel(new JSONModel({ results: [] }), "CarrierVHDModel");
            this.getView().setModel(new JSONModel({ results: [] }), "ShipperVHDModel");
            this.getView().setModel(new JSONModel({ results: [] }), "VehicleVHDModel");

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
         
            // Mode: All
            this._oDealFilterState.motKey = " ";
         
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
            // 5. Set Mode = All
            // =====================================================
         
            if (oMode) {
         
                oMode.setSelectedKey("All");
         
                console.log(
                    "Default Mode set: All"
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

    // =====================================================
// Nominations default filters
// =====================================================

if (!this._bDefaultNominationInitialized) {

    this._bDefaultNominationInitialized = true;

    this._initializeDefaultNominationFilters();
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
    // 2. Store default date range and mode in filter state
    // =====================================================

    this._oPosFilterState.fromDate = dFromDate;
    this._oPosFilterState.toDate = dToday;
    this._oPosFilterState.motKey = " ";

    // No commodity selected initially
    this._oPosFilterState.commodityKeys = [];


    // =====================================================
    // 3. Get Logistics Planning controls
    // =====================================================

    var oDateRange = this.byId(
        "MainPnlFra013--dateDrs"
    );

    var oMode = this.byId(
        "MainPnlFra013--modeSeg"
    );


    // =====================================================
    // 4. Set default date range & mode in UI
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

    if (oMode) {
        oMode.setSelectedKey("All");
        console.log("Default Logistics Mode set: All");
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


_initializeDefaultNominationFilters: function () {

       console.log("===== NOMINATION DEFAULT INITIALIZATION STARTED =====");
    // =====================================================
    // 1. Calculate default date range
    // From = today - 1 month
    // To   = today
    // =====================================================

    var dToday = new Date();

    var dFromDate = new Date(dToday);

    dFromDate.setMonth(
        dFromDate.getMonth() - 1
    );


    // =====================================================
    // 2. Store default filter values
    // =====================================================

    this._oNomFilterState.fromDate = dFromDate;
    this._oNomFilterState.toDate = dToday;


    // =====================================================
    // 3. Get Nomination DateRangeSelection
    // =====================================================

    var oDateRange = this.byId(
      "MainPnlFra015--_IDGenDateRangeSelection"
    );


    // =====================================================
    // 4. Set default date range in UI
    // =====================================================

    if (oDateRange) {

        oDateRange.setDateValue(dFromDate);

        oDateRange.setSecondDateValue(dToday);

        console.log(
            "Default Nomination Date Range set:",
            dFromDate,
            dToday
        );

    } else {

        console.error(
            "Nomination DateRangeSelection not found"
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
    // 6. Wait for OData metadata
    // =====================================================

oModel.metadataLoaded().then(function () {

    console.log(
        "Loading Nomination Details with default filters..."
    );

    // Load dropdown values
    this._loadNominationDropdownData();

    // Load Nomination Details
    this._applyNominationFilters(
        dFromDate,
        dToday
    );

    // Load Ticket Details
    this._applyTicketFilters(
        dFromDate,
        dToday
    );

}.bind(this));
},

_loadNominationDropdownData: function () {

    var oModel = this.getView().getModel();

    if (!oModel) {
        console.error("OData model not available.");
        return;
    }


    // =====================================================
    // 1. Commodity
    // =====================================================

    oModel.read("/UniqNomCmdty", {

       success: function (oData) {

    var aResults = oData && oData.results
        ? oData.results
        : [];

    // Add blank option at the beginning
    aResults.unshift({
        Commodity: "",
        CommodityName: ""
    });

    var oCmdtyModel = this.getView().getModel(
        "UniqNomCmdtyData"
    );

    if (oCmdtyModel) {
        oCmdtyModel.setProperty(
            "/UniqNomCmdtySet",
            aResults
        );
    }

}.bind(this),

        error: function (oError) {

            console.error(
                "Error loading UniqNomCmdty:",
                oError
            );

        }.bind(this)
    });


    // =====================================================
    // 2. Location
    // =====================================================

    oModel.read("/UniqNomLoc", {

        success: function (oData) {

            var aResults =
                oData && oData.results
                    ? oData.results
                    : [];

            var oLocModel =
                this.getView().getModel(
                    "UniqNomLocData"
                );

            if (oLocModel) {

                oLocModel.setProperty(
                    "/UniqNomLocSet",
                    aResults
                );
            }

            console.log(
                "Nomination Location:",
                aResults
            );

        }.bind(this),

        error: function (oError) {

            console.error(
                "Error loading UniqNomLoc:",
                oError
            );

        }.bind(this)
    });


    // =====================================================
    // 3. Status
    // =====================================================

    oModel.read("/UniqNomStat", {

        success: function (oData) {

            var aResults =
                oData && oData.results
                    ? oData.results
                    : [];

            var oStatModel =
                this.getView().getModel(
                    "UniqNomStatData"
                );

            if (oStatModel) {

                oStatModel.setProperty(
                    "/UniqNomStatSet",
                    aResults
                );
            }

            console.log(
                "Nomination Status:",
                aResults
            );

        }.bind(this),

        error: function (oError) {

            console.error(
                "Error loading UniqNomStat:",
                oError
            );

        }.bind(this)
    });
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
            var sKey = oEvent.getParameter("key") || (oEvent.getParameter("item") && oEvent.getParameter("item").getKey()) || oEvent.getSource().getSelectedKey();
            if (sKey === "Train" || sKey === "Rail" || sKey === "02") {
                this._oDealFilterState.motKey = "02";
            } else if (sKey === "Truck" || sKey === "01") {
                this._oDealFilterState.motKey = "01";
            } else {
                // "All" mode: pass empty / blank so both Rail and Truck are included
                this._oDealFilterState.motKey = " ";
            }

            var dFrom = this._oDealFilterState.fromDate;
            var dTo   = this._oDealFilterState.toDate;
            if (dFrom && dTo) {
                this._applyDealsFilters(dFrom, dTo);
            }
        },

        onDealCommoditySelectionFinish: function (oEvent) {
            var aSelectedKeys = oEvent.getSource().getSelectedKeys ? oEvent.getSource().getSelectedKeys() : [];
            this._oDealFilterState.commodityKeys = aSelectedKeys;

            var dFrom = this._oDealFilterState.fromDate;
            var dTo   = this._oDealFilterState.toDate;
            if (dFrom && dTo) {
                this._applyDealsFilters(dFrom, dTo);
            }
        },

onNominationRefresh: function () {

    console.log("===== NOMINATION REFRESH STARTED =====");

    // =====================================================
    // 1. Calculate the ORIGINAL default date range
    //    Same logic as app initial load
    // =====================================================

    var dToday = new Date();

    var dFromDate = new Date(dToday);

    dFromDate.setMonth(
        dFromDate.getMonth() - 1
    );


    // =====================================================
    // 2. RESET NOMINATION FILTER STATE
    // =====================================================

    this._oNomFilterState = {
        fromDate: dFromDate,
        toDate: dToday,
        dealId: "",
        nominationId: "",
        commodity: "",
        location: "",
        status: ""
    };


    // =====================================================
    // 3. RESET DATE RANGE IN UI
    // =====================================================

    var oDateRange = this.byId(
        "MainPnlFra015--_IDGenDateRangeSelection"
    );

    if (oDateRange) {

        oDateRange.setDateValue(dFromDate);
        oDateRange.setSecondDateValue(dToday);
        oDateRange.setValueState("None");

    }


    // =====================================================
    // 4. RESET DEAL NUMBER INPUT
    // =====================================================

    var oDealInput = this.byId(
        "MainPnlFra015--NomPnl1Inp005"
    );

    if (oDealInput) {
        oDealInput.setValue("");
    }


    // =====================================================
    // 5. RESET NOMINATION ID INPUT
    // =====================================================

    var oNominationInput = this.byId(
        "MainPnlFra015--NomPnl1Inp008"
    );

    if (oNominationInput) {
        oNominationInput.setValue("");
    }


    // =====================================================
    // 6. RESET COMMODITY DROPDOWN
    // =====================================================

    var oCommoditySelect = this.byId(
        "MainPnlFra015--NomPnl1Sel018"
    );

    if (oCommoditySelect) {
        oCommoditySelect.setSelectedKey("");
    }


    // =====================================================
    // 7. RESET LOCATION DROPDOWN
    // =====================================================

    var oLocationSelect = this.byId(
        "MainPnlFra015--NomPnl1Sel025"
    );

    if (oLocationSelect) {
        oLocationSelect.setSelectedKey("");
    }


    // =====================================================
    // 8. RESET STATUS DROPDOWN
    // =====================================================

    var oStatusSelect = this.byId(
        "MainPnlFra015--NomPnl1Sel033"
    );

    if (oStatusSelect) {
        oStatusSelect.setSelectedKey("");
    }


    // =====================================================
    // 9. CLEAR CURRENT NOMINATION DATA
    // =====================================================

    this._aNominationResults = [];

    var oNomModel = this.getView().getModel(
        "NomDetailsData"
    );

    if (oNomModel) {

        oNomModel.setProperty(
            "/NomDetailsSet",
            []
        );

    }


    // =====================================================
    // 10. LOAD NOMINATION DATA WITH DEFAULT DATE RANGE
    // =====================================================

    this._applyNominationFilters(
        dFromDate,
        dToday
    );


    // =====================================================
    // 11. LOAD TICKET DATA WITH DEFAULT DATE RANGE
    // =====================================================

    this._applyTicketFilters(
        dFromDate,
        dToday
    );


    console.log(
        "Nomination filters reset to default:",
        dFromDate,
        dToday
    );

    console.log(
        "===== NOMINATION REFRESH COMPLETED ====="
    );
},

onTicketRefresh: function () {

    console.log("===== TICKET REFRESH STARTED =====");

    // =====================================================
    // 1. Calculate INITIAL / DEFAULT date range
    //    From = Today - 1 month
    //    To   = Today
    // =====================================================

    var dToday = new Date();

    var dFromDate = new Date(dToday);

    dFromDate.setMonth(
        dFromDate.getMonth() - 1
    );


    // =====================================================
    // 2. Reset date range in UI
    // =====================================================

    var oDateRange = this.byId(
        "MainPnlFra015--_IDGenDateRangeSelection"
    );

    if (oDateRange) {

        oDateRange.setDateValue(dFromDate);
        oDateRange.setSecondDateValue(dToday);

    }


    // =====================================================
    // 3. Update filter state
    // =====================================================

    this._oNomFilterState.fromDate = dFromDate;
    this._oNomFilterState.toDate = dToday;


    // =====================================================
    // 4. Clear existing Ticket Details data
    // =====================================================

    var oTicketModel = this.getView().getModel(
        "TicketDetailsData"
    );

    if (oTicketModel) {

        oTicketModel.setProperty(
            "/TicketDetailsSet",
            []
        );

    }


    // =====================================================
    // 5. Reload Ticket Details using DEFAULT dates
    // =====================================================

    this._applyTicketFilters(
        dFromDate,
        dToday
    );


    console.log(
        "Ticket Details refreshed with default date range:",
        dFromDate,
        dToday
    );

    console.log("===== TICKET REFRESH COMPLETED =====");
},


onDealsRefresh: function () {

    console.log("===== DEALS REFRESH STARTED =====");

    // =====================================================
    // 1. Calculate INITIAL / DEFAULT date range
    //    From = Today - 1 month
    //    To   = Today
    // =====================================================

    var dToday = new Date();

    var dFromDate = new Date(dToday);

    dFromDate.setMonth(
        dFromDate.getMonth() - 1
    );


    // =====================================================
    // 2. RESET DEAL FILTER STATE
    // =====================================================

    this._oDealFilterState.fromDate = dFromDate;
    this._oDealFilterState.toDate = dToday;

    // Default Mode = Truck
    this._oDealFilterState.motKey = "01";

    // Remove commodity filter
    this._oDealFilterState.commodityKeys = [];


    // =====================================================
    // 3. RESET DATE RANGE IN UI
    // =====================================================

    var oDateRange = this.byId(
        "MainPnlFra011--DlPnl1DRS005"
    );

    if (oDateRange) {

        oDateRange.setDateValue(dFromDate);
        oDateRange.setSecondDateValue(dToday);
        oDateRange.setValueState("None");

    }


    // =====================================================
    // 4. RESET MODE TO TRUCK
    // =====================================================

    var oMode = this.byId(
        "MainPnlFra011--DlPnl1SgB007"
    );

    if (oMode) {
        oMode.setSelectedKey("Truck");
    }


    // =====================================================
    // 5. RESET COMMODITY SELECTION
    // =====================================================

    // IMPORTANT:
    // Replace this ID with your actual Deals commodity
    // MultiComboBox / Select ID if different.

    var oCommodity = this.byId(
        "MainPnlFra011--DlPnl1Mcb009"
    );

    if (oCommodity) {

        if (oCommodity.removeAllSelectedItems) {
            oCommodity.removeAllSelectedItems();
        }

        if (oCommodity.setSelectedKey) {
            oCommodity.setSelectedKey("");
        }

    }


    // =====================================================
    // 6. CLEAR EXISTING DEAL DATA
    // =====================================================

    var oMonthModel = this.getView().getModel(
        "MonthData"
    );

    if (oMonthModel) {
        oMonthModel.setProperty(
            "/MonthSet",
            []
        );
    }


    var oDealQtyModel = this.getView().getModel(
        "dealQtyMotData"
    );

    if (oDealQtyModel) {
        oDealQtyModel.setProperty(
            "/DealQtyMotSet",
            []
        );
    }


    var oDealDetailModel = this.getView().getModel(
        "DealDetailData"
    );

    if (oDealDetailModel) {

        oDealDetailModel.setProperty(
            "/DealDetailSet",
            []
        );

        oDealDetailModel.setProperty(
            "/hasMore",
            false
        );
    }


    // Reset pagination state
    this._sNextDealUrl = null;
    this._aAllDealResults = [];
    this._aDealBuffer = [];


    // =====================================================
    // 7. LOAD DEALS WITH DEFAULT DATE RANGE
    // =====================================================

    this._applyDealsFilters(
        dFromDate,
        dToday
    );


    console.log(
        "Deals refreshed with default filters:",
        {
            fromDate: dFromDate,
            toDate: dToday,
            mode: "Truck",
            commodity: []
        }
    );

    console.log("===== DEALS REFRESH COMPLETED =====");
},



        onNominationDateRangeChange: function (oEvent) {

    var oDateRange =
        oEvent.getSource();

    var dFromDate =
        oDateRange.getDateValue();

    var dToDate =
        oDateRange.getSecondDateValue();


    // =====================================================
    // Validate dates
    // =====================================================

    if (!dFromDate || !dToDate) {
        return;
    }


    if (dFromDate > dToDate) {

        oDateRange.setValueState("Error");

        oDateRange.setValueStateText(
            "'From' date must not be after 'To' date."
        );

        return;
    }


    oDateRange.setValueState("None");


    // =====================================================
    // Store selected date range
    // =====================================================

    this._oNomFilterState.fromDate =
        dFromDate;

    this._oNomFilterState.toDate =
        dToDate;


    console.log(
        "Nomination Date Range Changed:",
        dFromDate,
        dToDate
    );


    // =====================================================
    // Load Nomination Details
    // =====================================================

    this._applyNominationFilters(
        dFromDate,
        dToDate
    );


    // =====================================================
    // Load Ticket Details
    // =====================================================

    this._applyTicketFilters(
        dFromDate,
        dToDate
    );

},

_filterNominationTable: function () {

    var oNomModel =
        this.getView().getModel(
            "NomDetailsData"
        );

    if (!oNomModel) {
        return;
    }


    var aResults =
        this._aNominationResults || [];


    // =====================================================
    // Search values
    // =====================================================

    var sDealId =
        String(
            this._oNomFilterState.dealId || ""
        )
        .trim()
        .toLowerCase();


    var sNominationId =
        String(
            this._oNomFilterState.nominationId || ""
        )
        .trim()
        .toLowerCase();


    // =====================================================
    // Dropdown values
    // =====================================================

    var sCommodity =
        this._oNomFilterState.commodity || "";


    var sLocation =
        this._oNomFilterState.location || "";


    var sStatus =
        this._oNomFilterState.status || "";


    // =====================================================
    // Filter
    // =====================================================

    var aFilteredResults =
        aResults.filter(function (oItem) {


            // ---------------------------------------------
            // Deal ID
            // ---------------------------------------------

            var sDealNumber =
                String(
                    oItem.DealNumber || ""
                )
                .toLowerCase();


            var bDealMatch =
                !sDealId ||
                sDealNumber.indexOf(
                    sDealId
                ) !== -1;


            // ---------------------------------------------
            // Nomination ID
            // ---------------------------------------------

            var sNominationKey =
                String(
                    oItem.NominationKey || ""
                )
                .toLowerCase();


            var bNominationMatch =
                !sNominationId ||
                sNominationKey.indexOf(
                    sNominationId
                ) !== -1;


            // ---------------------------------------------
            // Commodity
            // ---------------------------------------------

            var bCommodityMatch =
                !sCommodity ||
                oItem.Commodity === sCommodity;


            // ---------------------------------------------
            // Location
            // ---------------------------------------------

            var bLocationMatch =
                !sLocation ||
                oItem.Locationid === sLocation;


            // ---------------------------------------------
            // Status
            // ---------------------------------------------

            var bStatusMatch =
                !sStatus ||
                oItem.Status === sStatus;


            // ---------------------------------------------
            // ALL conditions
            // ---------------------------------------------

            return (
                bDealMatch &&
                bNominationMatch &&
                bCommodityMatch &&
                bLocationMatch &&
                bStatusMatch
            );

        });


    // =====================================================
    // Update ONLY Nominations Details table
    // =====================================================

    oNomModel.setProperty(
        "/NomDetailsSet",
        aFilteredResults
    );


    console.log(
        "Filtered Nomination records:",
        aFilteredResults.length
    );
},



onNominationSearch: function (oEvent) {

    // =====================================================
    // Get Deal ID
    // =====================================================

    var oDealInput = this.byId(
        "MainPnlFra015--NomPnl1Inp005"
    );

    var sDealId = oDealInput
        ? oDealInput.getValue().trim()
        : "";


    // =====================================================
    // Get Nomination ID
    // =====================================================

    var oNominationInput = this.byId(
        "MainPnlFra015--NomPnl1Inp008"
    );

    var sNominationId = oNominationInput
        ? oNominationInput.getValue().trim()
        : "";


    // =====================================================
    // Store values in filter state
    // =====================================================

    this._oNomFilterState.dealId =
        sDealId;

    this._oNomFilterState.nominationId =
        sNominationId;


    // =====================================================
    // Apply ALL nomination filters
    // =====================================================

    this._filterNominationTable();


    console.log(
        "Nomination Search:",
        "Deal ID =", sDealId,
        "Nomination ID =", sNominationId
    );
},

onNominationDropdownChange: function (oEvent) {

    var oSelect = oEvent.getSource();

    var sSelectedKey =
        oSelect.getSelectedKey();


    // =====================================================
    // Commodity
    // =====================================================

    if (
        oSelect.getId().indexOf(
            "NomPnl1Sel018"
        ) !== -1
    ) {

        this._oNomFilterState.commodity =
            sSelectedKey;
    }


    // =====================================================
    // Location
    // =====================================================

    else if (
        oSelect.getId().indexOf(
            "NomPnl1Sel025"
        ) !== -1
    ) {

        this._oNomFilterState.location =
            sSelectedKey;
    }


    // =====================================================
    // Status
    // =====================================================

    else if (
        oSelect.getId().indexOf(
            "NomPnl1Sel033"
        ) !== -1
    ) {

        this._oNomFilterState.status =
            sSelectedKey;
    }


    // =====================================================
    // Apply ALL nomination filters
    // =====================================================

    this._filterNominationTable();


    console.log(
        "Nomination Dropdown Changed:",
        sSelectedKey,
        this._oNomFilterState
    );
},
    





_readAllODataPages: function (sPath) {

    var oModel = this.getView().getModel();
    var aAllResults = [];

    // Keep track of pages already requested
    var oVisitedPages = {};

    return new Promise(function (resolve, reject) {

        var readPage = function (sRequestPath) {

            // ============================================
            // Convert absolute __next URL to relative path
            // ============================================

            if (sRequestPath &&
                /^https?:\/\//i.test(sRequestPath)) {

                var sServiceUrl = oModel.sServiceUrl;

                if (sServiceUrl &&
                    /^https?:\/\//i.test(sServiceUrl) &&
                    sRequestPath.indexOf(sServiceUrl) === 0) {

                    sRequestPath =
                        sRequestPath.substring(
                            sServiceUrl.length
                        );

                } else {

                    var sMarker =
                        "/CM_API_LOGISTIC/";

                    var iIndex =
                        sRequestPath.indexOf(sMarker);

                    if (iIndex !== -1) {

                        sRequestPath =
                            sRequestPath.substring(
                                iIndex + sMarker.length
                            );
                    }
                }

                if (sRequestPath.charAt(0) !== "/") {
                    sRequestPath = "/" + sRequestPath;
                }
            }

            // ============================================
            // Prevent infinite pagination loop
            // ============================================

            if (oVisitedPages[sRequestPath]) {

                console.error(
                    "Duplicate OData page detected:",
                    sRequestPath
                );

                // Stop pagination and return records
                // already loaded
                resolve(aAllResults);

                return;
            }

            // Mark page as visited
            oVisitedPages[sRequestPath] = true;

            console.log(
                "Reading OData page:",
                sRequestPath
            );

            // ============================================
            // Read page
            // ============================================

            oModel.read(sRequestPath, {

                success: function (oData) {

                    var aPageResults =
                        oData && oData.results
                            ? oData.results
                            : [];

                    aAllResults =
                        aAllResults.concat(
                            aPageResults
                        );

                    console.log(
                        "Current page:",
                        aPageResults.length,
                        "| Total loaded:",
                        aAllResults.length
                    );

                    // ====================================
                    // Next page
                    // ====================================

                    if (oData && oData.__next) {

                        console.log(
                            "Backend returned __next:",
                            oData.__next
                        );

                        readPage(oData.__next);

                    } else {

                        console.log(
                            "All OData pages loaded. Total:",
                            aAllResults.length
                        );

                        resolve(aAllResults);
                    }
                },

                error: function (oError) {

                    console.error(
                        "Error while loading OData page:",
                        oError
                    );

                    reject(oError);
                }
            });
        };

        // Start first page
        readPage(sPath);
    });
},

        // ── Deals Overview: OData reads (UniqDealCmdty, DealQtyMot, DealDetail) ─
        _applyDealsFilters: function (dFrom, dTo) {
            var sMotKey        = this._oDealFilterState.motKey;
            var iRequestId     = ++this._iDealsRequestId;
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
                    if (iRequestId !== this._iDealsRequestId) {
                        checkDone();
                        return;
                    }
                 var aResults = (oData && oData.results)
    ? oData.results
    : (Array.isArray(oData) ? oData : [oData]);

// Remove blank Commodity entries
aResults = aResults.filter(function (oItem) {
    return oItem.Commodity &&
        String(oItem.Commodity).trim() !== "";
});

if (aCommodityKeys.length > 0) {
    aResults = aResults.filter(function (oItem) {
        return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
    });
}
                    var oJM = oView.getModel("UniqDealCmdtyData");
                    if (oJM) { oJM.setProperty("/UniqDealCmdtySet", aResults); }
                    checkDone();
                }.bind(this),
                error: function () { checkDone(); MessageToast.show("Error loading UniqDealCmdty."); }
            });

            // 2. DealQtyMot
            var dqKeyPath = oModel.createKey("/DealQtyMot", {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo,
                p_MoT:      (sMotKey && sMotKey.trim()) ? sMotKey.trim() : " "
            }) + "/Set";

            oModel.read(dqKeyPath, {
                success: function (oData) {
                    if (iRequestId !== this._iDealsRequestId) {
                        checkDone();
                        return;
                    }
                    var aResults = (oData && oData.results) ? oData.results : (Array.isArray(oData) ? oData : [oData]);
                    if (aCommodityKeys.length > 0) {
                        aResults = aResults.filter(function (oItem) {
                            return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                        });
                    }
                    if (sMotKey === "01") {
                        // Truck = Road / 01
                        aResults = aResults.filter(function (oItem) {
                            var sMotField = oItem.MOT || oItem.ModeOfTransport || oItem.MoT || oItem.Mode;
                            if (sMotField === undefined) { return true; }
                            var sVal = String(sMotField).trim().toLowerCase();
                            return sVal === "road" || sVal === "truck" || sVal === "01";
                        });
                    } else if (sMotKey === "02") {
                        // Rail = Rail / 02
                        aResults = aResults.filter(function (oItem) {
                            var sMotField = oItem.MOT || oItem.ModeOfTransport || oItem.MoT || oItem.Mode;
                            if (sMotField === undefined) { return true; }
                            var sVal = String(sMotField).trim().toLowerCase();
                            return sVal === "rail" || sVal === "train" || sVal === "02";
                        });
                    }

                    // Group results by ScheduleMonth
                    var mMonthGroups = {};
                    aResults.forEach(function (oItem) {
                        var sMonth = String(oItem.ScheduleMonth || "");
                        if (!mMonthGroups[sMonth]) {
                            mMonthGroups[sMonth] = {
                                ScheduleMonth: sMonth,
                                Commodities: []
                            };
                        }
                        mMonthGroups[sMonth].Commodities.push(oItem);
                    });

                    var aGroupedResults = Object.keys(mMonthGroups).map(function (sKey) {
                        return mMonthGroups[sKey];
                    }).sort(function (a, b) {
                        return parseInt(a.ScheduleMonth, 10) - parseInt(b.ScheduleMonth, 10);
                    });

                    var oJM = oView.getModel("dealQtyMotData");
                    if (oJM) { oJM.setProperty("/DealQtyMotSet", aGroupedResults); }
                    checkDone();
                }.bind(this),
                error: function () { checkDone(); MessageToast.show("Error loading DealQtyMot."); }
            });

          // 3. DealDetail
var ddKeyPath = oModel.createKey("/DealDetail", {
    p_FromDate: sFormattedFrom,
    p_ToDate:   sFormattedTo,
    p_MoT:      (sMotKey && sMotKey.trim()) ? sMotKey.trim() : " "
}) + "/Set";

this._readAllODataPages(ddKeyPath)

   .then(function (aResults) {

    console.log(
        "Total DealDetail records received:",
        aResults.length
    );


    // =====================================================
    // 1. Apply Commodity filter
    // =====================================================

    if (aCommodityKeys.length > 0) {

        aResults = aResults.filter(function (oItem) {

            return aCommodityKeys.indexOf(
                oItem.Commodity
            ) !== -1;

        });

    }


   // =====================================================
// 2. Apply MoT filter
// =====================================================

console.log("Selected MoT Key for this request:", sMotKey);

if (sMotKey === "01") {
    // Truck = Road / Truck / 01
    aResults = aResults.filter(function (oItem) {
        var sVal = String(oItem.MOT || oItem.ModeOfTransport || oItem.MoT || oItem.Mode || "").trim().toLowerCase();
        return sVal === "road" || sVal === "truck" || sVal === "01" || sVal.indexOf("road") !== -1 || sVal.indexOf("truck") !== -1;
    });
} else if (sMotKey === "02") {
    // Rail = Rail / Train / 02
    aResults = aResults.filter(function (oItem) {
        var sVal = String(oItem.MOT || oItem.ModeOfTransport || oItem.MoT || oItem.Mode || "").trim().toLowerCase();
        return sVal === "rail" || sVal === "train" || sVal === "02" || sVal.indexOf("rail") !== -1 || sVal.indexOf("train") !== -1;
    });
}

console.log(
    "DealDetail records after MoT filter:",
    aResults.length
);


    // =====================================================
    // 3. Update Deal Details table
    // =====================================================
   if (iRequestId !== this._iDealsRequestId) {

        console.log(
            "Ignoring old Deals response. Request:",
            iRequestId,
            "Latest:",
            this._iDealsRequestId
        );

        return;
    }

       // =====================================================
    // 4. Update Deal Details table
    // =====================================================


    var oJM =
        oView.getModel("DealDetailData");


    if (oJM) {

        oJM.setProperty(
            "/DealDetailSet",
            aResults
        );

        oJM.refresh(true);

    }


    checkDone();

}.bind(this))

    .catch(function (oError) {

        console.error(
            "Error loading DealDetail:",
            oError
        );

        checkDone();

        MessageToast.show(
            "Error loading DealDetail."
        );
    });
        },


        // ══════════════════════════════════════════════════════════════════════
        //  LOGISTICS PLANNING TAB — Filter Handlers
        // ══════════════════════════════════════════════════════════════════════


onMatchPosRefresh: function () {

    var oView = this.getView();

    var dFrom = this._oPosFilterState.fromDate;
    var dTo = this._oPosFilterState.toDate;

    if (!dFrom || !dTo) {
        var oDateRange = this.byId("MainPnlFra013--dateDrs");

        if (oDateRange) {
            dFrom = oDateRange.getDateValue();
            dTo = oDateRange.getSecondDateValue();
        }
    }

    if (!dFrom || !dTo) {
        MessageToast.show("Please select a valid date range.");
        return;
    }

    var oMatchModel =
        oView.getModel("MatchPosData");

    if (oMatchModel) {
        oMatchModel.setProperty(
            "/MatchPosSet",
            []
        );
    }

    this._applyPositionFilters(
        dFrom,
        dTo
    );

    MessageToast.show(
        "Matched Positions refreshed."
    );
},
        
onPlanningDetailRefresh: function () {

    console.log("===== PLANNING DETAIL REFRESH STARTED =====");

    var oView = this.getView();

    // Get current Planning Detail filter values
    var dFrom = this._oPosFilterState.fromDate;
    var dTo   = this._oPosFilterState.toDate;

    // If filter state is not available, get dates from UI
    if (!dFrom || !dTo) {

        var oDateRange = this.byId(
            "MainPnlFra013--dateDrs"
        );

        if (oDateRange) {
            dFrom = oDateRange.getDateValue();
            dTo   = oDateRange.getSecondDateValue();
        }
    }

    // Validate dates
    if (!dFrom || !dTo) {

        MessageToast.show(
            "Please select a valid date range."
        );

        return;
    }

    // ---------------------------------------------------------
    // Clear existing Planning Detail table data
    // ---------------------------------------------------------

    var oEntModel = oView.getModel("EntDetailData");

    if (oEntModel) {
        oEntModel.setProperty(
            "/EntDetailSet",
            []
        );
    }


    var oOblModel = oView.getModel("OblDetailData");

    if (oOblModel) {
        oOblModel.setProperty(
            "/OblDetailSet",
            []
        );
    }


    var oTotalModel = oView.getModel("TotalSummaryData");

    if (oTotalModel) {
        oTotalModel.setProperty(
            "/TotalSummarySet",
            []
        );
    }


    var oMonthModel = oView.getModel("MonthPosSmryData");

    if (oMonthModel) {
        oMonthModel.setProperty(
            "/MonthPosSmrySet",
            []
        );
    }


    var oMatchModel = oView.getModel("MatchPosData");

    if (oMatchModel) {
        oMatchModel.setProperty(
            "/MatchPosSet",
            []
        );
    }


    // ---------------------------------------------------------
    // Reload Planning Detail using CURRENT filters
    // ---------------------------------------------------------

    this._applyPositionFilters(
        dFrom,
        dTo
    );


    console.log(
        "Planning Detail refreshed with current filters:",
        {
            fromDate: dFrom,
            toDate: dTo,
            mode: this._oPosFilterState.motKey,
            commodity: this._oPosFilterState.commodityKeys
        }
    );

    console.log(
        "===== PLANNING DETAIL REFRESH COMPLETED ====="
    );
},


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
            var sKey = oEvent.getParameter("key") || (oEvent.getParameter("item") && oEvent.getParameter("item").getKey()) || oEvent.getSource().getSelectedKey();
            if (sKey === "Train" || sKey === "Rail" || sKey === "02") {
                this._oPosFilterState.motKey = "02";
            } else if (sKey === "Truck" || sKey === "01") {
                this._oPosFilterState.motKey = "01";
            } else {
                // "All" mode
                this._oPosFilterState.motKey = " ";
            }

            var dFrom = this._oPosFilterState.fromDate;
            var dTo   = this._oPosFilterState.toDate;
            if (dFrom && dTo) {
                this._applyPositionFilters(dFrom, dTo);
            }
        },

        onPosCommoditySelectionFinish: function (oEvent) {
            var aSelectedKeys = oEvent.getSource().getSelectedKeys ? oEvent.getSource().getSelectedKeys() : [];
            this._oPosFilterState.commodityKeys = aSelectedKeys;

            var dFrom = this._oPosFilterState.fromDate;
            var dTo   = this._oPosFilterState.toDate;
            if (dFrom && dTo) {
                this._applyPositionFilters(dFrom, dTo);
            }
        },

        // ── Logistics Planning: OData reads (EntDetails, OblDetails, TotalSummary, PositionsSummary, MatchPosSet)
        _applyPositionFilters: function (dFrom, dTo) {
            if (!dFrom || !dTo) {
                dFrom = this._oPosFilterState.fromDate;
                dTo   = this._oPosFilterState.toDate;
            }
            if (!dFrom || !dTo) {
                return;
            }

            var sMotKey        = this._oPosFilterState.motKey || " ";
            var aCommodityKeys = this._oPosFilterState.commodityKeys || [];
            var sCommodity     = aCommodityKeys.join(",");
            var oModel         = this.getView().getModel();
            var oView          = this.getView();

            oView.setBusy(true);

            var sFormattedFrom = this._formatODataDate(dFrom);
            var sFormattedTo   = this._formatODataDate(dTo);

            var iCompleted = 0;
            var iTotal     = 5;
            var checkDone  = function () {
                iCompleted++;
                if (iCompleted === iTotal) { oView.setBusy(false); }
            };

            // Helper to filter results by commodity and MoT
            var filterByCmdtyAndMot = function (aItems) {
                var aRes = (aItems && aItems.results) ? aItems.results : (Array.isArray(aItems) ? aItems : [aItems]);
                if (aCommodityKeys.length > 0) {
                    aRes = aRes.filter(function (oItem) {
                        return aCommodityKeys.indexOf(oItem.Commodity) !== -1;
                    });
                }
                if (sMotKey === "01") {
                    // Truck = Road / Truck / 01
                    aRes = aRes.filter(function (oItem) {
                        var sMotField = oItem.ModeOfTransport || oItem.ModeOfTransportText || oItem.MOT || oItem.MoT || oItem.Mode;
                        if (sMotField === undefined) { return true; }
                        var sVal = String(sMotField).trim().toLowerCase();
                        return sVal === "road" || sVal === "truck" || sVal === "01" || sVal.indexOf("road") !== -1 || sVal.indexOf("truck") !== -1;
                    });
                } else if (sMotKey === "02") {
                    // Rail = Rail / Train / 02
                    aRes = aRes.filter(function (oItem) {
                        var sMotField = oItem.ModeOfTransport || oItem.ModeOfTransportText || oItem.MOT || oItem.MoT || oItem.Mode;
                        if (sMotField === undefined) { return true; }
                        var sVal = String(sMotField).trim().toLowerCase();
                        return sVal === "rail" || sVal === "train" || sVal === "02" || sVal.indexOf("rail") !== -1 || sVal.indexOf("train") !== -1;
                    });
                }
                return aRes;
            };

            // 1. EntDetails
            var EntKeyPath = oModel.createKey("/EntDetails", {
                p_FromDate: sFormattedFrom,
                p_ToDate:   sFormattedTo
            }) + "/Set";

            oModel.read(EntKeyPath, {
                success: function (oData) {
                    var aResults = filterByCmdtyAndMot(oData);
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
                    var aResults = filterByCmdtyAndMot(oData);
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
                    var aResults = filterByCmdtyAndMot(oData);
                    var oJM = oView.getModel("TotalSummaryData");
                    if (oJM) { oJM.setProperty("/TotalSummarySet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading TotalSummary."); }
            });
            // 4. positionSummary
            var PosSmryKeyPath = oModel.createKey("/PositionsSummary", {
                p_FromDate:  sFormattedFrom,
                p_ToDate:    sFormattedTo,
            }) + "/Set";

            oModel.read(PosSmryKeyPath, {
                success: function (oData) {
                    var aResults = filterByCmdtyAndMot(oData);
                    var oJM = oView.getModel("MonthPosSmryData");
                    if (oJM) { oJM.setProperty("/MonthPosSmrySet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading PositionsSummary."); }
            });
            // 5. MatchPos
            oModel.read("/MatchConfirm", {
                success: function (oData) {
                    var aResults = filterByCmdtyAndMot(oData);
                    var oJM = oView.getModel("MatchPosData");
                    if (oJM) { oJM.setProperty("/MatchPosSet", aResults); }
                    checkDone();
                },
                error: function () { checkDone(); MessageToast.show("Error loading MatchPosData."); }
            });
        },


_applyNominationFilters: function (dFrom, dTo) {

    var oModel = this.getView().getModel();

    var oView = this.getView();

    oView.setBusy(true);


    // =====================================================
    // Format dates
    // =====================================================

    var sFormattedFrom = this._formatODataDate(dFrom);

    var sFormattedTo = this._formatODataDate(dTo);


    console.log(
        "Nomination From Date:",
        sFormattedFrom
    );

    console.log(
        "Nomination To Date:",
        sFormattedTo
    );


    // =====================================================
    // Create parameterized OData path
    // =====================================================

    var sNomKeyPath = oModel.createKey(
        "/NomDetails",
        {
            p_FromDate: sFormattedFrom,
            p_ToDate: sFormattedTo
        }
    ) + "/Set";


    console.log(
        "Nomination OData Path:",
        sNomKeyPath
    );


    // =====================================================
    // Read Nomination Details
    // =====================================================

    oModel.read(sNomKeyPath, {

        success: function (oData) {

            console.log(
                "Nomination OData Response:",
                oData
            );


            var aResults =
                oData && oData.results
                    ? oData.results
                    : [];


            console.log(
                "Nomination records received:",
                aResults.length
            );


            // =================================================
            // Set JSONModel data
            // =================================================

         var oNomModel =
    oView.getModel("NomDetailsData");

if (oNomModel) {

    // Store complete nomination data
    this._aNominationResults =
        aResults.slice();

    // Apply current filters
    this._filterNominationTable();
}


            oView.setBusy(false);

        }.bind(this),

        error: function (oError) {

            console.error(
                "Error loading Nomination Details:",
                oError
            );

            oView.setBusy(false);

            MessageToast.show(
                "Error loading Nomination Details."
            );
        }

    });
},

_applyTicketFilters: function (dFrom, dTo) {

    var oModel = this.getView().getModel();
    var oView = this.getView();

    if (!oModel) {
        console.error(
            "OData model not available for Ticket Details"
        );
        return;
    }

    // =====================================================
    // 1. Format dates
    // =====================================================

    var sFormattedFrom =
        this._formatODataDate(dFrom);

    var sFormattedTo =
        this._formatODataDate(dTo);


    console.log(
        "Ticket From Date:",
        sFormattedFrom
    );

    console.log(
        "Ticket To Date:",
        sFormattedTo
    );


    // =====================================================
    // 2. Create Ticket OData path
    // =====================================================

    var sTicketKeyPath = oModel.createKey(
        "/TicketDetails",
        {
            p_FromDate: sFormattedFrom,
            p_ToDate: sFormattedTo
        }
    ) + "/Set";


    console.log(
        "Ticket OData Path:",
        sTicketKeyPath
    );


    // =====================================================
    // 3. Read Ticket Details
    // =====================================================

    oModel.read(sTicketKeyPath, {

        success: function (oData) {

            console.log(
                "Ticket OData Response:",
                oData
            );


            var aResults =
                oData && oData.results
                    ? oData.results
                    : [];


            console.log(
                "Ticket records received:",
                aResults.length
            );


            // =================================================
            // 4. Put data into Ticket JSON Model
            // =================================================

            var oTicketModel =
                oView.getModel(
                    "TicketDetailsData"
                );


            if (oTicketModel) {

                oTicketModel.setProperty(
                    "/TicketDetailsSet",
                    aResults
                );

            } else {

                console.error(
                    "TicketDetailsData model not found"
                );
            }

        }.bind(this),

        error: function (oError) {

            console.error(
                "Error loading Ticket Details:",
                oError
            );

        }.bind(this)

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
                         TransactionType: oSrc.row.TransactionType || (oSrc.type === "purchase" ? "P" : ""),
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
                         MatchSrc: oSrc.type === "purchase" ? "Supply" : "Inventory",
                         Status: "Draft",
                         RowType: "parent",
                         _checked: true,
                         _sourceRaw: oSrc.row,
                         _srcType: oSrc.type,
                         children: aTargetGroups.map(function(oTgt) {
                             var nTgtQty = parseFloat(oTgt.row.Quantity) || 0;
                             var nMatchQty = Math.min(nSrcQty, nTgtQty);

                             var sSrcWeek = oSrc.row.WeekID || "";
                             var sTgtWeek = oTgt.row.WeekID || "";
                             var bWeekConflict = !!(sSrcWeek && sTgtWeek && sSrcWeek !== sTgtWeek);
                             var sSelectedWeekID = sSrcWeek || sTgtWeek || "";

                             var sSrcMoT = oSrc.row.ModeOfTransport || oSrc.row.MOT || "";
                             var sTgtMoT = oTgt.row.ModeOfTransport || oTgt.row.MOT || "";
                             var sSrcMoTText = oSrc.row.ModeOfTransportText || sSrcMoT;
                             var sTgtMoTText = oTgt.row.ModeOfTransportText || sTgtMoT;
                             var bMoTConflict = !!(sSrcMoT && sTgtMoT && sSrcMoT !== sTgtMoT);
                             var sSelectedMoT = sSrcMoT || sTgtMoT || "";

                             var aMoTOptions = [];
                             if (bMoTConflict) {
                                 aMoTOptions = [
                                     { key: sSrcMoT, text: sSrcMoTText || sSrcMoT },
                                     { key: sTgtMoT, text: sTgtMoTText || sTgtMoT }
                                 ];
                             }

                             return {
                                 NodeLabel: "Target: " + oTgt.row.DealNumber,
                                 DealNumber: oTgt.row.DealNumber,
                                 DocumentNumber: oTgt.row.DocumentNumber || oTgt.row.DealNumber,
                                 DocumentItem: oTgt.row.DocumentItem || oTgt.row.SalesItem || "",
                                 Commodity: oTgt.row.Commodity,
                                 MatchedQty: nMatchQty,
                                 MatchedQtyFormatted: nMatchQty.toLocaleString(),
                                 MatchedUOM: oTgt.row.UOM || oTgt.row.SalesUOM || "LB",
                                 TransactionType: oTgt.row.TransactionType || (oTgt.type === "sales" ? "S" : ""),
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
                                 DisplayWeekID: sSelectedWeekID,
                                 MatchSrc: oTgt.type === "sales" ? "Demand" : "Inventory",
                                 Status: "Pending",
                                 RowType: "child",
                                 _checked: true,
                                 _weekConflict: bWeekConflict,
                                 _srcWeekID: sSrcWeek,
                                 _tgtWeekID: sTgtWeek,
                                 _selectedWeekID: sSelectedWeekID,
                                 _motConflict: bMoTConflict,
                                 _srcMoT: sSrcMoT,
                                 _tgtMoT: sTgtMoT,
                                 _selectedMoT: sSelectedMoT,
                                 _motOptions: aMoTOptions,
                                 _targetRaw: oTgt.row,
                                 _tgtType: oTgt.type
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
                     MessageBox.warning("No valid match pairs are selected.", {
                         title: "Selection Required"
                     });
                     return;
                 }
                 var aResults = oMM.getProperty("/results") || [];
                 if (aResults.length === 0) {
                     MessageBox.warning("No valid match pairs are selected.", {
                         title: "Selection Required"
                     });
                     return;
                 }

                 var bHasWeekConflict = false;
                 var bHasMoTConflict = false;
                 var aCheckedChildren = [];

                 aResults.forEach(function (oParent) {
                     if (oParent.children && Array.isArray(oParent.children)) {
                         oParent.children.forEach(function (oChild) {
                             if (oChild._checked && oChild.Status !== "Blocked") {
                                 if (oChild._weekConflict && !oChild._selectedWeekID) {
                                     bHasWeekConflict = true;
                                 }
                                 if (oChild._motConflict && !oChild._selectedMoT) {
                                     bHasMoTConflict = true;
                                 }
                                 aCheckedChildren.push({ parent: oParent, child: oChild });
                             }
                         });
                     }
                 });

                 if (bHasWeekConflict) {
                     MessageBox.warning("Please resolve all Week conflicts for checked rows before confirming matches.", {
                         title: "Conflict Resolution Required"
                     });
                     return;
                 }

                 if (bHasMoTConflict) {
                     MessageBox.warning("Please resolve all Mode of Transport conflicts for checked rows before confirming matches.", {
                         title: "Conflict Resolution Required"
                     });
                     return;
                 }

                 if (aCheckedChildren.length === 0) {
                     MessageBox.warning("No valid match pairs are selected.", {
                         title: "Selection Required"
                     });
                     return;
                 }

                 var aPayloads = this._flattenTreeToPayloads(aResults);
                 if (!aPayloads || aPayloads.length === 0) {
                     MessageBox.warning("No valid match pairs are selected.", {
                         title: "Selection Required"
                     });
                     return;
                 }

                 MessageBox.confirm("Send " + aPayloads.length + " checked match pair(s) to the backend?", {
                     title: "Confirm Matches",
                     onClose: function (sAction) {
                         if (sAction === MessageBox.Action.OK || sAction === "OK") {
                             this._saveMatches(aPayloads);
                         }
                     }.bind(this)
                 });
             },

             _flattenTreeToPayloads: function (aResults) {
                 var aPayloads = [];
                 if (!Array.isArray(aResults)) {
                     return aPayloads;
                 }

                 aResults.forEach(function (oParent) {
                     var oSrc = oParent._sourceRaw || {};
                     var sSrcType = oParent._srcType || "purchase";

                     if (oParent.children && Array.isArray(oParent.children)) {
                         oParent.children.forEach(function (oChild) {
                             if (!oChild._checked || oChild.Status === "Blocked") {
                                 return;
                             }

                             var oTgt = oChild._targetRaw || {};
                             var sTgtType = oChild._tgtType || "sales";

                             var oPayload = {
                                 Commodity: oParent.Commodity || oChild.Commodity || oSrc.Commodity || oTgt.Commodity || "",
                                 Purchasedeal: "",
                                 Purchasedocument: "",
                                 Purchasedocitem: "",
                                 Purchscheddate: null,
                                 Purchschedmonth: "",
                                 Purchquantity: "0",
                                 Purchuom: "",
                                 Supplier: "",
                                 Supplierid: "",
                                 WeekID: oChild._selectedWeekID || oChild.DisplayWeekID || oSrc.WeekID || oTgt.WeekID || "",
                                 Origin: "",
                                 Originname: "",
                                 PTransactionType: "",
                                 PIncoTerms: "",
                                 Plant: "",
                                 Storagelocation: "",
                                 Invquantity: "0",
                                 Invuom: "",
                                 Salesdeal: "",
                                 Salesdocument: "",
                                 Salesdocitem: "",
                                 Salescheddate: null,
                                 Saleschedmonth: "",
                                 Salesquantity: "0",
                                 Salesuom: "",
                                 Customer: "",
                                 Customerid: "",
                                 Destination: "",
                                 DestinationName: "",
                                 STransactionType: "",
                                 SIncoTerms: "",
                                 Matchquantity: String(parseFloat(oChild.MatchedQty) || 0),
                                 Matchuom: oChild.MatchedUOM || oTgt.UOM || oSrc.UOM || "LB",
                                 Matchstatus: "Confirmed",
                                 Matchsource: (sSrcType === "purchase" && sTgtType === "inventory") ? "E2I" : (sSrcType === "inventory" && sTgtType === "sales") ? "I2O" : "E2O",
                                 ModeOfTransport: oChild._selectedMoT || oChild.ModeOfTransport || oSrc.ModeOfTransport || oTgt.ModeOfTransport || ""
                             };

                             // Source mapping
                             if (sSrcType === "purchase") {
                                 oPayload.Purchasedeal = oSrc.DealNumber || oSrc.DocumentNumber || oParent.DealNumber || "";
                                 oPayload.Purchasedocument = oSrc.DocumentNumber || "";
                                 oPayload.Purchasedocitem = oSrc.DocumentItem || oSrc.PurchaseItem || oParent.DocumentItem || "";
                                 oPayload.Purchscheddate = _toODataDate(oSrc.DeliveryDate || oSrc.ScheduleDate || oParent.DisplayDate);
                                 oPayload.Purchschedmonth = _toODataMonth(oSrc.DeliveryDate || oSrc.ScheduleDate || oParent.DisplayDate, oSrc.ScheduleMonth || oParent.DisplayMonth);
                                 oPayload.Purchquantity = String(parseFloat(oSrc.PurchaseQuantity || oSrc.Quantity || oParent.DisplayQty) || 0);
                                 oPayload.Purchuom = oSrc.PurchaseUOM || oSrc.UOM || oParent.DisplayUOM || "";
                                 oPayload.Supplier = oSrc.Supplier || oSrc.SupplierName || oParent.DisplayParty || "";
                                 oPayload.Supplierid = oSrc.SupplierID || oSrc.SupplierId || "";
                                 oPayload.Origin = oSrc.Origin || oParent.Origin || "";
                                 oPayload.Originname = oSrc.OriginName || oParent.OriginName || "";
                                 oPayload.PTransactionType = oSrc.TransactionType || oParent.TransactionType || "P";
                                 oPayload.PIncoTerms = oSrc.IncoTerms || oParent.Incoterms || "";
                             } else if (sSrcType === "inventory") {
                                 oPayload.Plant = oSrc.Plant || "";
                                 oPayload.Storagelocation = oSrc.StorageLocation || "";
                                 oPayload.Invquantity = String(parseFloat(oSrc.OnHandInventory || oSrc.InventoryQty || oSrc.Quantity) || 0);
                                 oPayload.Invuom = oSrc.UOM || oSrc.InventoryUOM || oParent.DisplayUOM || "";
                             }

                             // Target mapping
                             if (sTgtType === "sales") {
                                 oPayload.Salesdeal = oTgt.DealNumber || oTgt.DocumentNumber || oChild.DealNumber || "";
                                 oPayload.Salesdocument = oTgt.DocumentNumber || "";
                                 oPayload.Salesdocitem = oTgt.DocumentItem || oTgt.SalesItem || oChild.DocumentItem || "";
                                 oPayload.Salescheddate = _toODataDate(oTgt.DueDate || oTgt.DeliveryDate || oTgt.ScheduleDate || oChild.DisplayDate);
                                 oPayload.Saleschedmonth = _toODataMonth(oTgt.DueDate || oTgt.DeliveryDate || oTgt.ScheduleDate || oChild.DisplayDate, oTgt.ScheduleMonth || oChild.DisplayMonth);
                                 oPayload.Salesquantity = String(parseFloat(oTgt.SalesQuantity || oTgt.Quantity) || 0);
                                 oPayload.Salesuom = oTgt.SalesUOM || oTgt.UOM || oChild.MatchedUOM || "";
                                 oPayload.Customer = oTgt.Customer || oTgt.CustomerName || oChild.DisplayParty || "";
                                 oPayload.Customerid = oTgt.CustomerID || oTgt.CustomerId || "";
                                 oPayload.Destination = oTgt.Destination || oChild.Destination || "";
                                 oPayload.DestinationName = oTgt.DestinationName || oChild.DestinationName || "";
                                 oPayload.STransactionType = oTgt.TransactionType || oChild.TransactionType || "S";
                                 oPayload.SIncoTerms = oTgt.IncoTerms || oChild.Incoterms || "";
                             } else if (sTgtType === "inventory") {
                                 oPayload.Plant = oTgt.Plant || "";
                                 oPayload.Storagelocation = oTgt.StorageLocation || "";
                                 oPayload.Invquantity = String(parseFloat(oTgt.OnHandInventory || oTgt.InventoryQty || oTgt.Quantity) || 0);
                                 oPayload.Invuom = oTgt.UOM || oTgt.InventoryUOM || oChild.MatchedUOM || "";
                                 oPayload.Matchsource = "Inventory";
                             }

                             aPayloads.push(oPayload);
                         });
                     }
                 });

                 return aPayloads;
             },

             _saveMatches: function (aPayloads) {
                 var oModel = this.getView().getModel();
                 var oView = this.getView();

                 if (!oModel) {
                     MessageBox.error("OData Model is not available.", {
                         title: "Model Error"
                     });
                     return;
                 }

                 oView.setBusy(true);

                 if (aPayloads.length === 1) {
                     oModel.create("/MatchConfirm", aPayloads[0], {
                         success: function (oData) {
                             oView.setBusy(false);
                             MessageBox.success("Match confirmed successfully.", {
                                 title: "Match Confirmed",
                                 onClose: function () {
                                     this._onMatchSaveSuccess();
                                 }.bind(this)
                             });
                         }.bind(this),
                         error: function (oError) {
                             oView.setBusy(false);
                             var sMsg = this._extractODataError(oError);
                             MessageBox.error("Failed to confirm match:\n" + sMsg, {
                                 title: "Save Error"
                             });
                         }.bind(this)
                     });
                 } else {
                     var sGroupId = "matchBatchGroup_" + Date.now();
                     var aCurrentDeferred = oModel.getDeferredGroups() || [];
                     if (aCurrentDeferred.indexOf(sGroupId) === -1) {
                         oModel.setDeferredGroups(aCurrentDeferred.concat([sGroupId]));
                     }

                     aPayloads.forEach(function (oPayload, idx) {
                         var sChangeSetId = "cs_match_" + idx;
                         oModel.create("/MatchPos", oPayload, {
                             groupId: sGroupId,
                             changeSetId: sChangeSetId
                         });
                     });

                     oModel.submitChanges({
                         groupId: sGroupId,
                         success: function (oData) {
                             oView.setBusy(false);
                             var aErrors = this._parseBatchErrors(oData);
                             if (aErrors.length === 0) {
                                 MessageBox.success(aPayloads.length + " match(es) confirmed successfully.", {
                                     title: "Match Confirmed",
                                     onClose: function () {
                                         this._onMatchSaveSuccess();
                                     }.bind(this)
                                 });
                             } else {
                                 oModel.resetChanges();
                                 var sErrorSummary = aErrors.join("\n• ");
                                 if (aErrors.length < aPayloads.length) {
                                     MessageBox.warning("Some matches were saved, but " + aErrors.length + " error(s) occurred:\n• " + sErrorSummary, {
                                         title: "Partial Success"
                                     });
                                     this._onMatchSaveSuccess();
                                 } else {
                                     MessageBox.error("Failed to confirm matches:\n• " + sErrorSummary, {
                                         title: "Batch Save Error"
                                     });
                                 }
                             }
                         }.bind(this),
                         error: function (oError) {
                             oView.setBusy(false);
                             oModel.resetChanges();
                             var sMsg = this._extractODataError(oError);
                             MessageBox.error("Batch request failed:\n" + sMsg, {
                                 title: "Error"
                             });
                         }.bind(this)
                     });
                 }
             },

             _extractODataError: function (oError) {
                 if (!oError) {
                     return "Unknown error occurred.";
                 }
                 try {
                     if (oError.responseText) {
                         var oParsed = JSON.parse(oError.responseText);
                         if (oParsed.error && oParsed.error.message && oParsed.error.message.value) {
                             return oParsed.error.message.value;
                         }
                         if (oParsed.error && oParsed.error.innererror && Array.isArray(oParsed.error.innererror.errordetails) && oParsed.error.innererror.errordetails.length > 0) {
                             return oParsed.error.innererror.errordetails.map(function (d) { return d.message; }).join("; ");
                         }
                     }
                 } catch (e) {
                     // Not JSON, check for XML or raw response
                     if (typeof oError.responseText === "string") {
                         var mXml = /<message[^>]*>([^<]+)<\/message>/i.exec(oError.responseText);
                         if (mXml && mXml[1]) {
                             return mXml[1];
                         }
                     }
                 }
                 if (oError.message) {
                     return oError.message;
                 }
                 if (oError.statusText) {
                     return oError.statusText;
                 }
                 return "An unknown error occurred while communicating with the backend.";
             },

             _parseBatchErrors: function (oData) {
                 var aErrors = [];
                 if (!oData || !oData.__batchResponses) {
                     return aErrors;
                 }

                 oData.__batchResponses.forEach(function (oResp) {
                     if (oResp.response && oResp.response.statusCode && parseInt(oResp.response.statusCode, 10) >= 400) {
                         aErrors.push(this._extractODataError(oResp.response));
                     } else if (oResp.statusCode && parseInt(oResp.statusCode, 10) >= 400) {
                         aErrors.push(this._extractODataError(oResp));
                     } else if (oResp.__changeResponses && Array.isArray(oResp.__changeResponses)) {
                         oResp.__changeResponses.forEach(function (oChange) {
                             if (oChange.statusCode && parseInt(oChange.statusCode, 10) >= 400) {
                                 aErrors.push(this._extractODataError(oChange));
                             } else if (oChange.response && oChange.response.statusCode && parseInt(oChange.response.statusCode, 10) >= 400) {
                                 aErrors.push(this._extractODataError(oChange.response));
                             }
                         }, this);
                     }
                 }, this);

                 return aErrors;
             },

             _onMatchSaveSuccess: function () {
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (oMM) {
                     oMM.setProperty("/results", []);
                 }

                 if (this._oPosFilterState && this._oPosFilterState.fromDate && this._oPosFilterState.toDate) {
                     this._applyPositionFilters(this._oPosFilterState.fromDate, this._oPosFilterState.toDate);
                 }

                 var oInvTable = this.byId("MainPnlFra013--" + "invTbl") || this.byId("invTbl");
                 if (oInvTable) {
                     try {
                         var oBinding = oInvTable.getBinding("items");
                         if (oBinding && typeof oBinding.refresh === "function") {
                             oBinding.refresh(true);
                         }
                     } catch (e) {
                         console.warn("Could not refresh invTbl binding:", e);
                     }
                 }
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

             onMoTSelectionChange: function (oEvent) {
                 var oSource = oEvent.getSource();
                 var oCtx = oSource.getBindingContext("matchedPositionsModel");
                 if (!oCtx) { return; }
                 var oChild = oCtx.getObject();
                 var oSelectedItem = oEvent.getParameter("selectedItem");
                 oChild._selectedMoT = oSelectedItem ? oSelectedItem.getKey() : oSource.getSelectedKey();
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (oMM) { oMM.refresh(true); }
             },

             onWeekIDSelectionChange: function (oEvent) {
                 var oSource = oEvent.getSource();
                 var oCtx = oSource.getBindingContext("matchedPositionsModel");
                 if (!oCtx) { return; }
                 var oChild = oCtx.getObject();
                 var oSelectedItem = oEvent.getParameter("selectedItem");
                 oChild._selectedWeekID = oSelectedItem ? oSelectedItem.getKey() : oSource.getSelectedKey();
                 var oMM = this.getView().getModel("matchedPositionsModel");
                 if (oMM) { oMM.refresh(true); }
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


 onDeleteSelectedMatches: function () {

    var that = this;

    // =====================================================
    // 1. Get Matched Positions table
    // =====================================================

    var oTable = this.byId("MainPnlFra013--matchTbl") ||
                 this.byId("matchTbl");

    if (!oTable) {
        MessageBox.error("Matched Positions table not found.");
        return;
    }


    // =====================================================
    // 2. Get selected row(s)
    // =====================================================

    var aSelectedItems = [];

    if (typeof oTable.getSelectedItems === "function") {
        aSelectedItems = oTable.getSelectedItems();
    }


    // =====================================================
    // 3. Validate selection
    // =====================================================

    if (!aSelectedItems || aSelectedItems.length === 0) {

        MessageBox.warning(
            "Please select a record to delete.",
            {
                title: "Delete Selected"
            }
        );

        return;
    }


    // =====================================================
    // 4. Get OData model
    // =====================================================

    var oODataModel =
        (this.getOwnerComponent() &&
         this.getOwnerComponent().getModel()) ||
        this.getView().getModel();


    if (!oODataModel) {

        MessageBox.error(
            "OData model not found."
        );

        return;
    }


    // =====================================================
    // 5. Get selected MatchConfirm records
    // =====================================================

    var aSelectedRecords = [];

    aSelectedItems.forEach(function (oItem) {

        var oContext =
            oItem.getBindingContext("MatchPosData");

        if (!oContext) {
            return;
        }

        var oObject = oContext.getObject();

        if (oObject && oObject.Matchid) {
            aSelectedRecords.push(oObject);
        }
    });


    // =====================================================
    // 6. Validate Matchid
    // =====================================================

    if (aSelectedRecords.length === 0) {

        MessageBox.error(
            "Selected record does not contain Matchid."
        );

        return;
    }


    // =====================================================
    // 7. Confirmation popup
    // =====================================================

    MessageBox.confirm(
        "Are you sure you want to delete " +
        aSelectedRecords.length +
        " selected record(s)?",
        {
            title: "Confirm Delete",

            actions: [
                MessageBox.Action.YES,
                MessageBox.Action.NO
            ],

            emphasizedAction: MessageBox.Action.YES,

            onClose: function (sAction) {

                if (sAction !== MessageBox.Action.YES) {
                    return;
                }

                that._deleteSelectedMatchRecords(
                    oODataModel,
                    oTable,
                    aSelectedRecords
                );
            }
        }
    );
},


_deleteSelectedMatchRecords: function (
    oODataModel,
    oTable,
    aSelectedRecords
) {

    var that = this;

    var iTotal = aSelectedRecords.length;
    var iCompleted = 0;
    var iSuccess = 0;
    var aErrors = [];


    oTable.setBusy(true);


    aSelectedRecords.forEach(function (oRecord) {

        var sMatchId = oRecord.Matchid;

        // =================================================
        // Build OData key
        // =================================================

        var sPath = oODataModel.createKey(
            "MatchConfirm",
            {
                Matchid: sMatchId
            }
        );


        // =================================================
        // Get ETag
        // =================================================

        var sETag = null;

        if (oRecord.__metadata &&
            oRecord.__metadata.etag) {

            sETag = oRecord.__metadata.etag;
        }


        // =================================================
        // DELETE MatchConfirm record
        // =================================================

        oODataModel.remove(
            "/" + sPath,
            {

                eTag: sETag || "*",

                success: function () {

                    iSuccess++;
                    iCompleted++;

                    checkFinished();
                },

                error: function (oError) {

                    iCompleted++;

                    var sError =
                        that._extractODataError(oError);

                    aErrors.push(
                        sMatchId + ": " + sError
                    );

                    checkFinished();
                }
            }
        );
    });


    // =====================================================
    // Check whether all DELETE calls completed
    // =====================================================

    function checkFinished() {

        if (iCompleted !== iTotal) {
            return;
        }


        oTable.setBusy(false);


        // =================================================
        // Clear selected rows
        // =================================================

        if (typeof oTable.removeSelections === "function") {
            oTable.removeSelections(true);
        }


        // =================================================
        // Refresh MatchConfirm data
        // =================================================

        var oBinding =
            oTable.getBinding("items");

        if (oBinding) {
            oBinding.refresh();
        }


        // =================================================
        // Show result
        // =================================================

        if (aErrors.length === 0) {

            MessageBox.success(
                iSuccess +
                " record(s) deleted successfully.",
                {
                    title: "Delete Successful"
                }
            );

        } else if (iSuccess > 0) {

            MessageBox.warning(
                iSuccess +
                " record(s) deleted successfully.\n\n" +
                aErrors.length +
                " record(s) failed:\n\n" +
                aErrors.join("\n"),
                {
                    title: "Partial Delete"
                }
            );

        } else {

            MessageBox.error(
                "Failed to delete the selected record(s).\n\n" +
                aErrors.join("\n"),
                {
                    title: "Delete Failed"
                }
            );
        }
    }
},




        // ══════════════════════════════════════════════════════════════════════
        //  CREATE NOMINATIONS DIALOG SUBSYSTEM (from Matched Positions)
        // ══════════════════════════════════════════════════════════════════════

        // ==================== F4 VALUE HELP — CARRIER (TSW001) ====================
        onCarrierValueHelp: function (oEvent) {
            var oInput = oEvent.getSource();
            this._oActiveCarrierInput = oInput;
            var oCtx = oInput.getBindingContext("nomDialogModel");
            this._oActiveCarrierCtxPath = oCtx ? oCtx.getPath() : null;

            var that = this;
            var oODataModel = (this.getOwnerComponent() && this.getOwnerComponent().getModel()) || this.getView().getModel();
            oODataModel.read("/PartnerInfo(p_role='',p_roletype='TSW001')/Set", {
                success: function (oData) {
                    var aResults = oData.results || [];
                    that.getView().getModel("CarrierVHDModel").setProperty("/results", aResults);

                    if (!that._oCarrierVHD) {
                        that._oCarrierVHD = new sap.m.SelectDialog({
                            title: "Select Carrier",
                            noDataText: "No carriers found",
                            search: that._onCarrierVHDSearch.bind(that),
                            confirm: that._onCarrierVHDConfirm.bind(that),
                            cancel: function () { }
                        });
                        that.getView().addDependent(that._oCarrierVHD);
                    }
                    that._oCarrierVHD.bindAggregation("items", {
                        path: "CarrierVHDModel>/results",
                        template: new sap.m.StandardListItem({
                            title: "{CarrierVHDModel>PartnerName}",
                            description: "{CarrierVHDModel>Supplier}"
                        }),
                        templateShareable: true
                    });
                    that._oCarrierVHD.open();
                },
                error: function () {
                    MessageToast.show("Failed to load carrier data.");
                }
            });
        },

        _onCarrierVHDSearch: function (oEvent) {
            var sVal = oEvent.getParameter("value") || "";
            oEvent.getParameter("itemsBinding").filter(
                sVal ? [new Filter({
                    filters: [
                        new Filter("PartnerName", FilterOperator.Contains, sVal),
                        new Filter("Supplier", FilterOperator.Contains, sVal)
                    ], and: false
                })] : []
            );
        },

        _onCarrierVHDConfirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }
            var sName = oItem.getTitle();        // PartnerName
            var sCode = oItem.getDescription();  // Supplier (ID) — the highlighted value

            var oModel = this.getView().getModel("nomDialogModel");
            var sPath = this._oActiveCarrierCtxPath;

            if (sPath) {
                oModel.setProperty(sPath + "/CarrierName", sName);
                oModel.setProperty(sPath + "/CarrierCode", sCode);
                // Display ONLY the code in the input so only the ID is ever shown/passed
                if (this._oActiveCarrierInput) { this._oActiveCarrierInput.setValue(sCode); }
            }
            MessageToast.show("Carrier selected: " + sCode + (sName ? " (" + sName + ")" : ""));
        },

        // ==================== F4 VALUE HELP — Supplier (TSW002) ====================
        onShipperValueHelp: function (oEvent) {
            var oInput = oEvent.getSource();
            this._oActiveShipperInput = oInput;
            var oCtx = oInput.getBindingContext("nomDialogModel");
            this._oActiveShipperCtxPath = oCtx ? oCtx.getPath() : null;

            var that = this;
            var oODataModel = (this.getOwnerComponent() && this.getOwnerComponent().getModel()) || this.getView().getModel();
            oODataModel.read("/PartnerInfo(p_role='0001014749',p_roletype='TSW003')/Set", {
                success: function (oData) {
                    var aResults = oData.results || [];
                    that.getView().getModel("ShipperVHDModel").setProperty("/results", aResults);

                    if (!that._oShipperVHD) {
                        that._oShipperVHD = new sap.m.SelectDialog({
                            title: "Select Shipper",
                            noDataText: "No Shippers found",
                            search: that._onShipperVHDSearch.bind(that),
                            confirm: that._onShipperVHDConfirm.bind(that),
                            cancel: function () { }
                        });
                        that.getView().addDependent(that._oShipperVHD);
                    }
                    that._oShipperVHD.bindAggregation("items", {
                        path: "ShipperVHDModel>/results",
                        template: new sap.m.StandardListItem({
                            title: "{ShipperVHDModel>PartnerName}",
                            description: "{ShipperVHDModel>Supplier}"
                        }),
                        templateShareable: true
                    });
                    that._oShipperVHD.open();
                },
                error: function () {
                    MessageToast.show("Failed to load Shipper data.");
                }
            });
        },

        _onShipperVHDSearch: function (oEvent) {
            var sVal = oEvent.getParameter("value") || "";
            oEvent.getParameter("itemsBinding").filter(
                sVal ? [new Filter({
                    filters: [
                        new Filter("PartnerName", FilterOperator.Contains, sVal),
                        new Filter("Supplier", FilterOperator.Contains, sVal)
                    ], and: false
                })] : []
            );
        },

        _onShipperVHDConfirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }
            var sName = oItem.getTitle();        // PartnerName
            var sCode = oItem.getDescription();  // Supplier (ID) — the highlighted value

            var oModel = this.getView().getModel("nomDialogModel");
            var sPath = this._oActiveShipperCtxPath;

            if (sPath) {
                oModel.setProperty(sPath + "/ShipperName", sName);
                oModel.setProperty(sPath + "/ShipperCode", sCode);
                // Display ONLY the code in the input so only the ID is ever shown/passed
                if (this._oActiveShipperInput) { this._oActiveShipperInput.setValue(sCode); }
            }
            MessageToast.show("Shipper selected: " + sCode + (sName ? " (" + sName + ")" : ""));
        },

        // ==================== F4 VALUE HELP — VEHICLE ====================
        onVehicleValueHelp: function (oEvent) {
            var oInput = oEvent.getSource();
            this._oActiveVehicleInput = oInput;
            var oCtx = oInput.getBindingContext("nomDialogModel");
            this._oActiveVehicleCtxPath = oCtx ? oCtx.getPath() : null;

            var that = this;
            var oODataModel = (this.getOwnerComponent() && this.getOwnerComponent().getModel()) || this.getView().getModel();
            oODataModel.read("/VehicleInfo", {
                success: function (oData) {
                    var aResults = oData.results || [];
                    that.getView().getModel("VehicleVHDModel").setProperty("/results", aResults);

                    if (!that._oVehicleVHD) {
                        that._oVehicleVHD = new sap.m.SelectDialog({
                            title: "Select Vehicle",
                            noDataText: "No vehicles found",
                            search: that._onVehicleVHDSearch.bind(that),
                            confirm: that._onVehicleVHDConfirm.bind(that),
                            cancel: function () { }
                        });
                        that.getView().addDependent(that._oVehicleVHD);
                    }
                    that._oVehicleVHD.bindAggregation("items", {
                        path: "VehicleVHDModel>/results",
                        template: new sap.m.StandardListItem({
                            title: "{VehicleVHDModel>VehicleDesc}",
                            description: "{VehicleVHDModel>VehicleID}"
                        }),
                        templateShareable: true
                    });
                    that._oVehicleVHD.open();
                },
                error: function () {
                    MessageToast.show("Failed to load vehicle data.");
                }
            });
        },

        _onVehicleVHDSearch: function (oEvent) {
            var sVal = oEvent.getParameter("value") || "";
            oEvent.getParameter("itemsBinding").filter(
                sVal ? [new Filter({
                    filters: [
                        new Filter("VehicleDesc", FilterOperator.Contains, sVal),
                        new Filter("VehicleID", FilterOperator.Contains, sVal)
                    ], and: false
                })] : []
            );
        },

        _onVehicleVHDConfirm: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }
            var sDesc = oItem.getTitle();        // VehicleDesc
            var sId = oItem.getDescription();    // VehicleID — the highlighted value

            var oModel = this.getView().getModel("nomDialogModel");
            var sPath = this._oActiveVehicleCtxPath;

            if (sPath) {
                oModel.setProperty(sPath + "/VehicleId", sId);
                oModel.setProperty(sPath + "/VehicleDesc", sDesc);
                // Display ONLY the ID in the input so only the ID is ever shown/passed
                if (this._oActiveVehicleInput) { this._oActiveVehicleInput.setValue(sId); }
            }
            MessageToast.show("Vehicle selected: " + sId + (sDesc ? " \u2014 " + sDesc : ""));
        },

        // ==================== CORE NOMINATION DIALOG OPEN & BUILD ====================
        onCreateNominationsFromMatches: function (oEvent) {
            var oTable = this.byId("MainPnlFra013--matchTbl") || this.byId("matchTbl");
            if (!oTable && oEvent && typeof oEvent.getSource === "function") {
                var oBtn = oEvent.getSource();
                var sPrefix = oBtn.getId().split("--")[0] + "--";
                oTable = this.byId(sPrefix + "matchTbl") || (sap.ui.getCore && sap.ui.getCore().byId(sPrefix + "matchTbl"));
            }
            if (!oTable) {
                var aControls = this.getView().findAggregatedObjects(true, function (oControl) {
                    return oControl.getId && (oControl.getId().indexOf("matchTbl") !== -1);
                });
                if (aControls && aControls.length > 0) {
                    oTable = aControls[0];
                }
            }

            if (!oTable) {
                MessageBox.error("Could not find the Matched Positions table.", { title: "Error" });
                return;
            }

            var oData = null;
            if (typeof oTable.getSelectedItems === "function") {
                var aSelectedItems = oTable.getSelectedItems();
                if (!aSelectedItems || !aSelectedItems.length) {
                    MessageBox.warning(
                        "Please select exactly one confirmed matched position to create nominations from.",
                        { title: "Create Nominations" }
                    );
                    return;
                }
                if (aSelectedItems.length > 1) {
                    MessageBox.warning(
                        "Only one matched position can be selected at a time to create nominations.\n\nPlease select a single row and try again.",
                        { title: "Create Nominations \u2014 Single Selection Required" }
                    );
                    return;
                }
                var oCtx = aSelectedItems[0].getBindingContext("MatchPosData") || aSelectedItems[0].getBindingContext();
                oData = oCtx ? oCtx.getObject() : null;
            } else if (typeof oTable.getSelectedIndices === "function") {
                var aIndices = oTable.getSelectedIndices();
                if (!aIndices.length) {
                    MessageBox.warning(
                        "Please select exactly one confirmed matched position to create nominations from.",
                        { title: "Create Nominations" }
                    );
                    return;
                }
                if (aIndices.length > 1) {
                    MessageBox.warning(
                        "Only one matched position can be selected at a time to create nominations.\n\nPlease select a single row and try again.",
                        { title: "Create Nominations \u2014 Single Selection Required" }
                    );
                    return;
                }
                var oCtx2 = oTable.getContextByIndex(aIndices[0]);
                oData = oCtx2 ? oCtx2.getObject() : null;
            }

            if (!oData) {
                MessageToast.show("Could not retrieve data for the selected row.");
                return;
            }

            this._openCreateNominationsDialog(oData);
        },

        _getDistinctMOTsFromMatch: function (oMatchRow) {
            // Seed _motDescMap from every description field the backend may return
            var _seedDesc = function (sCode, sDesc) {
                if (sCode && sDesc && !_motDescMap[sCode]) { _motDescMap[sCode] = sDesc; }
            };
            _seedDesc(oMatchRow.ModeOfTransport, oMatchRow.ModeOfTransportDesc || oMatchRow.ModeOfTransportText || "");
            _seedDesc(oMatchRow.PModeOfTransport, oMatchRow.PModeOfTransportDesc || oMatchRow.PModeOfTransportText || "");
            _seedDesc(oMatchRow.SModeOfTransport, oMatchRow.SModeOfTransportDesc || oMatchRow.SModeOfTransportText || "");

            var aMOTs = [];
            var _addMoT = function (sCode) {
                if (sCode && aMOTs.indexOf(sCode) === -1) { aMOTs.push(sCode); }
            };
            _addMoT(oMatchRow.ModeOfTransport);
            _addMoT(oMatchRow.PModeOfTransport);
            _addMoT(oMatchRow.SModeOfTransport);
            if (oMatchRow.Purchase && oMatchRow.Purchase.ModeOfTransport) {
                _seedDesc(oMatchRow.Purchase.ModeOfTransport, oMatchRow.Purchase.ModeOfTransportDesc || "");
                _addMoT(oMatchRow.Purchase.ModeOfTransport);
            }
            if (oMatchRow.Sales && oMatchRow.Sales.ModeOfTransport) {
                _seedDesc(oMatchRow.Sales.ModeOfTransport, oMatchRow.Sales.ModeOfTransportDesc || "");
                _addMoT(oMatchRow.Sales.ModeOfTransport);
            }
            if (aMOTs.length === 0) { aMOTs.push(""); }

            return aMOTs.map(function (sCode) {
                return { key: sCode, text: _motDisplay(sCode) || sCode };
            });
        },

        _openCreateNominationsDialog: function (oMatchData) {
            var oView = this.getView();
            var that = this;

            this._buildNomDialogModel(oMatchData);

            var aMOToptions = this._getDistinctMOTsFromMatch(oMatchData);
            var oNomMOTModel = this.getView().getModel("nomMOTModel");
            if (!oNomMOTModel) {
                oNomMOTModel = new JSONModel({ options: [] });
                this.getView().setModel(oNomMOTModel, "nomMOTModel");
            }
            oNomMOTModel.setProperty("/options", aMOToptions);

            if (!this._pNomDialog) {
                this._pNomDialog = Fragment.load({
                    id: oView.getId(),
                    name: "genslogiques.logisticsdashboard.fragments.CreateNominationsDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    that._oNomDialog = oDialog;
                    return oDialog;
                }).catch(function (oErr) {
                    console.error("Error loading CreateNominationsDialog fragment:", oErr);
                    MessageBox.error("Failed to load Nomination dialog: " + (oErr && oErr.message ? oErr.message : oErr));
                    that._pNomDialog = null;
                });
            }

            this._pNomDialog.then(function (oDialog) {
                if (oDialog) {
                    oDialog.open();
                }
            });
        },

        // Helper — Monday of ISO WeekID (YYYYWW)
        _getMondayFromWeekID: function (sWeekID) {
            if (!sWeekID || String(sWeekID).length < 6) { return null; }
            var sW = String(sWeekID).trim();
            var nYear = parseInt(sW.substring(0, 4), 10);
            var nWeek = parseInt(sW.substring(4), 10);
            if (isNaN(nYear) || isNaN(nWeek) || nWeek < 1 || nWeek > 53) { return null; }
            // ISO 8601: 4 January is always in week 1
            var oJan4 = new Date(Date.UTC(nYear, 0, 4));
            var nDow = oJan4.getUTCDay() || 7;           // Mon=1 … Sun=7
            var oMonday = new Date(oJan4);
            oMonday.setUTCDate(oJan4.getUTCDate() - (nDow - 1) + (nWeek - 1) * 7);
            oMonday.setUTCHours(0, 0, 0, 0);
            return oMonday;
        },

        _buildNomDialogModel: function (oRow) {
            var sPurchDateVal = oRow.Purchscheddate || oRow.PurchSchedDate || oRow.DeliveryDate || oRow.ScheduleDate || "";
            var sSalesDateVal = oRow.Salescheddate || oRow.SalesSchedDate || oRow.DueDate || oRow.ScheduleDate || "";

            var oPurchDate = _parseDate(sPurchDateVal) || new Date();
            var nMatchQty = parseFloat(oRow.Matchquantity || oRow.MatchQuantity) || 0;
            var nPurchQty = parseFloat(oRow.Purchquantity || oRow.PurchaseQuantity) || 0;
            var sUOM = oRow.Matchuom || oRow.MatchUOM || oRow.Purchuom || oRow.UOM || "";
            var nDefaultRows = 1;

            var sCommodity = (oRow.Commodity || "").trim();
            var sWeekID = (oRow.WeekID || oRow.Purchschedmonth || "").trim();
            var sPurchDealNumber = (oRow.Purchasedeal || oRow.PurchDealNumber || "").trim();
            var sSalesDealNumber = (oRow.Salesdeal || oRow.SalesDealNumber || "").trim();
            var sMatchQtyLabel = _fmtQty(nMatchQty, sUOM);

            var sMatchSource = (oRow.Matchsource || oRow.MatchSource || oRow.Matchsrc || "").trim();
            var sPlantVal = (oRow.Plant || "").trim();
            var sStorageLocVal = (oRow.Storagelocation || oRow.StorageLocation || "").trim();

            var sMoT = oRow.ModeOfTransport || "";
            var sMoTDesc = oRow.ModeOfTransportDesc || oRow.ModeOfTransportText || oRow.MOTDescription || "";
            if (sMoT && sMoTDesc) { _motDescMap[sMoT] = sMoTDesc; }

            var oWeekMonday = this._getMondayFromWeekID(sWeekID);
            var oStartDate = oWeekMonday || oPurchDate;
            var sMoTLabel = _motDisplay(sMoT) || sMoT;

            var sDialogTitle = "Create Nomination" +
                (sCommodity ? " \u2014 " + sCommodity : "") +
                (sWeekID ? " \u2014 " + sWeekID : "") +
                (sMatchQtyLabel ? " \u2014 " + sMatchQtyLabel : "");

            var sPurchDoc = oRow.Purchasedocument || oRow.PurchaseDocument || "";
            var sPurchItem = oRow.Purchasedocitem || oRow.PurchaseDocItem || "";
            var sSalesDoc = oRow.Salesdocument || oRow.SalesDocument || "";
            var sSalesItem = oRow.Salesdocitem || oRow.SalesDocItem || "";

            var sOrigin = oRow.Origin || "";
            var sOriginName = oRow.OriginName || oRow.Originname || oRow.Origin || "";
            var sOriginDisplay = (sOrigin && sOriginName && sOrigin !== sOriginName)
                ? sOrigin + " \u2014 " + sOriginName
                : (sOrigin || sOriginName);

            var sDest = oRow.Destination || "";
            var sDestName = oRow.DestinationName || oRow.Destination || "";
            var sDestDisplay = (sDest && sDestName && sDest !== sDestName)
                ? sDest + " \u2014 " + sDestName
                : (sDest || sDestName);

            var sSupplierID = oRow.Supplierid || oRow.SupplierId || oRow.SupplierID || oRow.SUPPLIERID || "";
            var sSupplierName = oRow.Supplier || oRow.SupplierName || sSupplierID;
            if (sSupplierName && !sSupplierID && /^\d+$/.test(sSupplierName)) {
                sSupplierID = sSupplierName; sSupplierName = "";
            }
            var sSupplierDisplay = (sSupplierID && sSupplierName && sSupplierID !== sSupplierName)
                ? sSupplierID + " \u2014 " + sSupplierName
                : (sSupplierID || sSupplierName);

            var sCustomerID = oRow.Customerid || oRow.CustomerId || oRow.CustomerID || oRow.CUSTOMERID || "";
            var sCustomerName = oRow.Customer || oRow.CustomerName || sCustomerID;
            if (sCustomerName && !sCustomerID && /^\d+$/.test(sCustomerName)) {
                sCustomerID = sCustomerName; sCustomerName = "";
            }
            var sCustomerDisplay = (sCustomerID && sCustomerName && sCustomerID !== sCustomerName)
                ? sCustomerID + " \u2014 " + sCustomerName
                : (sCustomerID || sCustomerName);

            var sPTxType = oRow.PTransactionType || "";
            var sSTxType = oRow.STransactionType || "";
            var sPInco = oRow.PIncoTerms || "";
            var sSInco = oRow.SIncoTerms || "";

            var sPurchUOM = oRow.Purchuom || oRow.UOM || sUOM;
            var sSalesUOM = oRow.Salesuom || oRow.UOM || sUOM;
            var nSalesQty = parseFloat(oRow.Salesquantity || oRow.SalesQuantity) || 0;

            var bIsE2I = (sMatchSource === "E2I");
            var bIsI2O = (sMatchSource === "I2O");

            var bIsE2I_DAP = (sMatchSource === "E2I" && sPInco === "DAP");
            var bIsI2O_FOB = (sMatchSource === "I2O" && sSInco === "FOB");

            var bShowOriginPanel = true;
            var bShowDestinationPanel = true;

            var sLocationLeftLabel = "";
            var sLocationLeftValue = "";
            var sLocationRightLabel = "";
            var sLocationRightValue = "";

            var sOriginDealNumber = sPurchDealNumber;
            var sOriginLocation = sOriginDisplay;
            var sOriginQty = _fmtQty(nPurchQty, sPurchUOM);
            var sOriginPartner = sSupplierDisplay;

            var sDestinationDealNumber = sSalesDealNumber;
            var sDestinationLocation = sDestDisplay;
            var sDestinationQty = _fmtQty(nSalesQty, sSalesUOM);
            var sDestinationPartner = sCustomerDisplay;

            if (bIsE2I_DAP) {
                // Destination should show Entitlement data
                sDestinationDealNumber = sPurchDealNumber;
                sDestinationLocation = sOriginDisplay;
                sDestinationQty = _fmtQty(nPurchQty, sPurchUOM);
                sDestinationPartner = sSupplierDisplay;
                sLocationRightLabel = "Entitlement Location";
                sLocationRightValue = sOriginDisplay || sOrigin || "";
                bShowOriginPanel = false;
                bShowDestinationPanel = true;
            } else if (bIsI2O_FOB) {
                // Origin should show Obligation data
                sOriginDealNumber = sSalesDealNumber;
                sOriginLocation = sDestDisplay;
                sOriginQty = _fmtQty(nSalesQty, sSalesUOM);
                sOriginPartner = sCustomerDisplay;
                sLocationLeftLabel = "Obligation Location";
                sLocationLeftValue = sDestDisplay || sDest || "";
                bShowOriginPanel = true;
                bShowDestinationPanel = false;
            } else if (bIsE2I) {
                sLocationLeftLabel = "Entitlement Location";
                sLocationLeftValue = sOriginDisplay || sOrigin || "";
                sLocationRightLabel = "Inventory Location";
                sLocationRightValue = sDestDisplay || sDest || "";
            } else if (bIsI2O) {
                sLocationLeftLabel = "Inventory Location";
                sLocationLeftValue = sOriginDisplay || sOrigin || "";
                sLocationRightLabel = "Obligation Location";
                sLocationRightValue = sDestDisplay || sDest || "";
            }

            var oDialogData = {
                DialogTitle: sDialogTitle,
                Commodity: sCommodity,
                WeekID: sWeekID,
                PurchDealNumber: sPurchDealNumber,
                SalesDealNumber: sSalesDealNumber,
                MatchQtyFormatted: sMatchQtyLabel,
                EditMatchQty: String(nMatchQty),
                NoOfRows: nDefaultRows,
                _uom: sUOM,
                _purchQty: nPurchQty,
                _matchQty: nMatchQty,

                MatchSource: sMatchSource,
                Plant: sPlantVal,
                StorageLocation: sStorageLocVal,

                ShowLocationBoxes: (bIsE2I || bIsI2O || bIsE2I_DAP || bIsI2O_FOB),
                LocationLeftLabel: sLocationLeftLabel,
                LocationLeftValue: sLocationLeftValue,
                LocationRightLabel: sLocationRightLabel,
                LocationRightValue: sLocationRightValue,

                ShowOriginPanel: bShowOriginPanel,
                ShowDestinationPanel: bShowDestinationPanel,

                OriginDealNumber: sOriginDealNumber,
                OriginLocation: sOriginLocation,
                OriginQty: sOriginQty,
                OriginPartner: sOriginPartner,

                DestinationDealNumber: sDestinationDealNumber,
                DestinationLocation: sDestinationLocation,
                DestinationQty: sDestinationQty,
                DestinationPartner: sDestinationPartner,

                PurchaseDocument: sPurchDoc,
                PurchaseDocItem: sPurchItem,
                Origin: sOrigin,
                OriginName: sOriginName,
                OriginDisplay: sOriginDisplay,
                PurchScheduleQtyFormatted: _fmtQty(nPurchQty, sPurchUOM),
                PurchSchedDateDisplay: _fmtDate(sPurchDateVal),
                _purchDateVal: sPurchDateVal,
                Supplier: sSupplierName,
                SupplierID: sSupplierID,
                SupplierDisplay: sSupplierDisplay,
                PTransactionType: sPTxType,
                PIncoTerms: sPInco,
                SalesDocument: sSalesDoc,
                SalesDocItem: sSalesItem,
                Destination: sDest,
                DestinationName: sDestName,
                DestinationDisplay: sDestDisplay,
                SalesScheduleQtyFormatted: _fmtQty(nSalesQty, sSalesUOM),
                SalesSchedDateDisplay: _fmtDate(sSalesDateVal),
                _salesDateVal: sSalesDateVal,
                Customer: sCustomerName,
                CustomerID: sCustomerID,
                CustomerDisplay: sCustomerDisplay,
                STransactionType: sSTxType,
                SIncoTerms: sSInco,
                ModeOfTransport: sMoT,
                ModeOfTransportLabel: sMoTLabel,
                _purchStartDate: oStartDate,
                scheduleRows: []
            };

            oDialogData.scheduleRows = this._buildScheduleRows(oStartDate, nDefaultRows, nMatchQty, sUOM, nPurchQty);

            var oExisting = this.getView().getModel("nomDialogModel");
            if (oExisting) { oExisting.setData(oDialogData); }
            else { this.getView().setModel(new JSONModel(oDialogData), "nomDialogModel"); }
        },

        _buildScheduleRows: function (oStart, nCount, nTotalMatchQty, sUOM, nTotalPurchQty) {
            var nEffPurchQty = (nTotalPurchQty && nTotalPurchQty > 0) ? nTotalPurchQty : nTotalMatchQty;

            var nMatchPer = nCount > 0 ? parseFloat((nTotalMatchQty / nCount).toFixed(3)) : 0;
            var nPurchPer = nCount > 0 ? parseFloat((nEffPurchQty / nCount).toFixed(3)) : 0;

            var aDates = [];
            var oCur = new Date(oStart);
            oCur.setUTCHours(0, 0, 0, 0);
            aDates.push(new Date(oCur));
            while (aDates.length < nCount) {
                oCur = this._getNextWorkingDay(oCur);
                aDates.push(new Date(oCur));
            }

            return aDates.map(function (oDate) {
                var sY = oDate.getUTCFullYear();
                var sMo = String(oDate.getUTCMonth() + 1).padStart(2, "0");
                var sD = String(oDate.getUTCDate()).padStart(2, "0");
                return {
                    ScheduleDate: sY + "-" + sMo + "-" + sD,
                    ScheduleQty: String(nMatchPer),
                    PurchScheduleQty: String(nPurchPer),
                    NoOfNominations: 1,
                    TotalScheduleQty: nMatchPer,
                    TotalScheduleQtyFormatted: nMatchPer > 0
                        ? nMatchPer.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "",
                    MoT: "", CarrierName: "", CarrierCode: "",
                    ShipperName: "", ShipperCode: "", VehicleId: "", VehicleDesc: ""
                };
            });
        },

        _generateWorkingDays: function (oStartDate, nCount) {
            var aDays = [], oCur = new Date(oStartDate);
            oCur.setUTCHours(0, 0, 0, 0);
            while (aDays.length < nCount) {
                var nDow = oCur.getUTCDay();
                if (nDow !== 0 && nDow !== 6) { aDays.push(new Date(oCur)); }
                oCur.setUTCDate(oCur.getUTCDate() + 1);
            }
            return aDays;
        },

        _getNextWorkingDay: function (oDate) {
            var oNext = new Date(oDate);
            oNext.setUTCDate(oNext.getUTCDate() + 1);
            while (oNext.getUTCDay() === 0 || oNext.getUTCDay() === 6) {
                oNext.setUTCDate(oNext.getUTCDate() + 1);
            }
            return oNext;
        },

        // ==================== EDITING & ROW HANDLERS ====================
        onNomNoOfRowsChange: function (oEvent) {
            var oModel = this.getView().getModel("nomDialogModel");
            if (!oModel) { return; }

            var nNew = Math.min(50, Math.max(1,
                parseInt(oEvent.getParameter("value") || oEvent.getSource().getValue(), 10) || 1));
            oModel.setProperty("/NoOfRows", nNew);

            var oStart = oModel.getProperty("/_purchStartDate") || new Date();
            var nMatchQty = parseFloat(oModel.getProperty("/EditMatchQty")) || 0;
            var nPurchQty = parseFloat(oModel.getProperty("/_purchQty")) || 0;
            var nEffPurchQty = nPurchQty > 0 ? nPurchQty : nMatchQty;
            var sUOM = oModel.getProperty("/_uom") || "";

            var aCur = oModel.getProperty("/scheduleRows") || [];
            var nCur = aCur.length;
            if (nNew === nCur) { return; }

            var nMatchPer = nNew > 0 ? parseFloat((nMatchQty / nNew).toFixed(3)) : 0;
            var nPurchPer = nNew > 0 ? parseFloat((nEffPurchQty / nNew).toFixed(3)) : 0;

            var aNew;
            if (nNew > nCur) {
                aNew = aCur.slice();
                var oLast = nCur > 0
                    ? new Date(aCur[nCur - 1].ScheduleDate + "T00:00:00Z")
                    : oStart;
                for (var i = 0; i < nNew - nCur; i++) {
                    oLast = this._getNextWorkingDay(oLast);
                    var sY = oLast.getUTCFullYear();
                    var sMo = String(oLast.getUTCMonth() + 1).padStart(2, "0");
                    var sD = String(oLast.getUTCDate()).padStart(2, "0");
                    aNew.push({
                        ScheduleDate: sY + "-" + sMo + "-" + sD,
                        ScheduleQty: String(nMatchPer),
                        PurchScheduleQty: String(nPurchPer),
                        NoOfNominations: 1,
                        TotalScheduleQty: 0, TotalScheduleQtyFormatted: "",
                        MoT: "", CarrierName: "", CarrierCode: "",
                        ShipperName: "", ShipperCode: "", VehicleId: "", VehicleDesc: ""
                    });
                }
            } else {
                aNew = aCur.slice(0, nNew);
            }

            // Re-spread quantities evenly across all rows
            aNew.forEach(function (r) {
                r.ScheduleQty = String(nMatchPer);
                r.PurchScheduleQty = String(nPurchPer);
                r.TotalScheduleQty = nMatchPer;
                r.TotalScheduleQtyFormatted = nMatchPer > 0
                    ? nMatchPer.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "";
            });

            oModel.setProperty("/scheduleRows", aNew);
        },

        onNomMatchQtyChange: function (oEvent) {
            var oModel = this.getView().getModel("nomDialogModel");
            if (!oModel) { return; }

            var nNew = parseFloat((oEvent.getParameter("value") || "").replace(/,/g, ""));
            if (isNaN(nNew) || nNew < 0) {
                MessageToast.show("Please enter a valid positive number.");
                return;
            }

            var sUOM = oModel.getProperty("/_uom") || "";
            var nPurchQty = parseFloat(oModel.getProperty("/_purchQty")) || 0;
            var nEffPurchQty = nPurchQty > 0 ? nPurchQty : nNew;

            oModel.setProperty("/EditMatchQty", String(nNew));
            oModel.setProperty("/MatchQtyFormatted",
                nNew.toLocaleString("en-US") + (sUOM ? " " + sUOM : ""));

            var sCommodity = oModel.getProperty("/Commodity") || "";
            var sWeekID = oModel.getProperty("/WeekID") || "";
            oModel.setProperty("/DialogTitle",
                "Create Nomination" +
                (sCommodity ? " \u2014 " + sCommodity : "") +
                (sWeekID ? " \u2014 " + sWeekID : "") +
                " \u2014 " + nNew.toLocaleString("en-US") + (sUOM ? " " + sUOM : ""));

            var aRows = oModel.getProperty("/scheduleRows") || [];
            var nRows = aRows.length || 1;
            var nMatchPer = parseFloat((nNew / nRows).toFixed(3));
            var nPurchPer = parseFloat((nEffPurchQty / nRows).toFixed(3));

            aRows.forEach(function (r) {
                r.ScheduleQty = String(nMatchPer);
                r.PurchScheduleQty = String(nPurchPer);
                r.TotalScheduleQty = nMatchPer;
                r.TotalScheduleQtyFormatted = nMatchPer > 0
                    ? nMatchPer.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "";
            });
            oModel.setProperty("/scheduleRows", aRows);
        },

        onNomRowQtyChange: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("nomDialogModel");
            var oModel = this.getView().getModel("nomDialogModel");
            if (!oCtx || !oModel) { return; }
            var sPath = oCtx.getPath(), oRow = oModel.getProperty(sPath);
            var nQty = parseFloat((oEvent.getParameter("value") || "").replace(/,/g, "")) || 0;
            var nNoms = parseInt(oRow.NoOfNominations, 10) || 1;
            var sUOM = oModel.getProperty("/_uom") || "";
            var nTotal = parseFloat((nQty * nNoms).toFixed(3));
            oModel.setProperty(sPath + "/TotalScheduleQty", nTotal);
            oModel.setProperty(sPath + "/TotalScheduleQtyFormatted", nTotal > 0 ? nTotal.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "");
        },

        onNomRowNomCountChange: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("nomDialogModel");
            var oModel = this.getView().getModel("nomDialogModel");
            if (!oCtx || !oModel) { return; }
            var sPath = oCtx.getPath(), oRow = oModel.getProperty(sPath);
            var nQty = parseFloat(oRow.ScheduleQty) || 0;
            var nNoms = parseInt(oEvent.getParameter("value") || 1, 10) || 1;
            var sUOM = oModel.getProperty("/_uom") || "";
            var nTotal = parseFloat((nQty * nNoms).toFixed(3));
            oModel.setProperty(sPath + "/TotalScheduleQty", nTotal);
            oModel.setProperty(sPath + "/TotalScheduleQtyFormatted", nTotal > 0 ? nTotal.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "");
        },

        onAddNominationRow: function () {
            var oModel = this.getView().getModel("nomDialogModel");
            if (!oModel) { return; }

            var aRows = oModel.getProperty("/scheduleRows") || [];
            var oStart = oModel.getProperty("/_purchStartDate") || new Date();
            var nMatchQty = parseFloat(oModel.getProperty("/EditMatchQty")) || 0;
            var nPurchQty = parseFloat(oModel.getProperty("/_purchQty")) || 0;
            var nEffPurchQty = nPurchQty > 0 ? nPurchQty : nMatchQty;
            var sUOM = oModel.getProperty("/_uom") || "";

            var nCur = aRows.length;
            var oLast = nCur > 0
                ? new Date(aRows[nCur - 1].ScheduleDate + "T00:00:00Z")
                : oStart;
            var oNext = this._getNextWorkingDay(oLast);
            var nNew = nCur + 1;

            var nMatchPer = nNew > 0 ? parseFloat((nMatchQty / nNew).toFixed(3)) : 0;
            var nPurchPer = nNew > 0 ? parseFloat((nEffPurchQty / nNew).toFixed(3)) : 0;

            // Re-spread existing rows
            aRows.forEach(function (r) {
                r.ScheduleQty = String(nMatchPer);
                r.PurchScheduleQty = String(nPurchPer);
                r.TotalScheduleQty = nMatchPer;
                r.TotalScheduleQtyFormatted = nMatchPer > 0
                    ? nMatchPer.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "";
            });

            // Append new row
            var sY = oNext.getUTCFullYear();
            var sMo = String(oNext.getUTCMonth() + 1).padStart(2, "0");
            var sD = String(oNext.getUTCDate()).padStart(2, "0");
            aRows.push({
                ScheduleDate: sY + "-" + sMo + "-" + sD,
                ScheduleQty: String(nMatchPer),
                PurchScheduleQty: String(nPurchPer),
                NoOfNominations: 1,
                TotalScheduleQty: nMatchPer,
                TotalScheduleQtyFormatted: nMatchPer > 0
                    ? nMatchPer.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "",
                MoT: "", CarrierName: "", CarrierCode: "",
                ShipperName: "", ShipperCode: "", VehicleId: "", VehicleDesc: ""
            });

            oModel.setProperty("/NoOfRows", nNew);
            oModel.setProperty("/scheduleRows", aRows);
            MessageToast.show("New row added. Total rows: " + nNew);
        },

        onRemoveNominationRow: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("nomDialogModel");
            if (!oCtx) { return; }

            var oModel = this.getView().getModel("nomDialogModel");
            var aParts = oCtx.getPath().split("/");
            var nIdx = parseInt(aParts[aParts.length - 1], 10);
            var aRows = oModel.getProperty("/scheduleRows") || [];

            if (aRows.length <= 1) { MessageToast.show("Cannot remove the last row."); return; }

            aRows.splice(nIdx, 1);

            var nMatchQty = parseFloat(oModel.getProperty("/EditMatchQty")) || 0;
            var nPurchQty = parseFloat(oModel.getProperty("/_purchQty")) || 0;
            var nEffPurchQty = nPurchQty > 0 ? nPurchQty : nMatchQty;
            var sUOM = oModel.getProperty("/_uom") || "";
            var nRows = aRows.length;

            var nMatchPer = nRows > 0 ? parseFloat((nMatchQty / nRows).toFixed(3)) : 0;
            var nPurchPer = nRows > 0 ? parseFloat((nEffPurchQty / nRows).toFixed(3)) : 0;

            aRows.forEach(function (r) {
                r.ScheduleQty = String(nMatchPer);
                r.PurchScheduleQty = String(nPurchPer);
                r.TotalScheduleQty = nMatchPer;
                r.TotalScheduleQtyFormatted = nMatchPer > 0
                    ? nMatchPer.toLocaleString("en-US") + (sUOM ? " " + sUOM : "") : "";
            });

            oModel.setProperty("/NoOfRows", nRows);
            oModel.setProperty("/scheduleRows", aRows);
            MessageToast.show("Row removed. Total rows: " + nRows);
        },

        onNomDialogCancel: function () {
            if (this._oNomDialog) {
                this._oNomDialog.close();
            }
        },

        onNomRowMoTChange: function (oEvent) {
            var oSelect = oEvent.getSource();
            var sKey = oSelect.getSelectedKey();
            var oCtx = oSelect.getBindingContext("nomDialogModel");
            var oModel = this.getView().getModel("nomDialogModel");
            if (!oCtx || !oModel) { return; }
            var sPath = oCtx.getPath();
            oModel.setProperty(sPath + "/MoT", sKey);
        },

        // ==================== SUBMIT HANDLER & PAYLOAD BUILDER ====================
        onNomDialogSubmit: function () {
            var oView = this.getView();
            var oModel = oView.getModel("nomDialogModel");
            if (!oModel) { return; }

            var aRows = oModel.getProperty("/scheduleRows") || [];
            var sMissing = [];

            aRows.forEach(function (r, idx) {
                if (!r.ScheduleDate) {
                    sMissing.push("Row " + (idx + 1) + ": Schedule Date is required.");
                }
                if (!r.ScheduleQty || parseFloat(r.ScheduleQty) <= 0) {
                    sMissing.push("Row " + (idx + 1) + ": Schedule Qty must be > 0.");
                }
            });

            if (sMissing.length) {
                MessageBox.error(
                    "Please fix the following issues before submitting:\n\n" + sMissing.join("\n"),
                    { title: "Validation Errors" }
                );
                return;
            }

            var aPayloads = this._buildNominationPayload(oModel, aRows);
            if (!aPayloads || !aPayloads.length) { return; }

            jQuery.sap.log.info(
                "[NomCreate] " + aPayloads.length + " nomination(s) to submit. First payload preview:\n" +
                JSON.stringify({
                    mot: aPayloads[0].mot,
                    uom: aPayloads[0].uom,
                    vehicleno: aPayloads[0].vehicleno,
                    carrier: aPayloads[0].carrier,
                    shipper: aPayloads[0].shipper,
                    itemCount: (aPayloads[0].to_items && aPayloads[0].to_items.results) ? aPayloads[0].to_items.results.length : 0
                }, null, 2)
            );

            var oODataModel = (this.getOwnerComponent() && this.getOwnerComponent().getModel()) || this.getView().getModel();
            var that = this;

            if (this._oNomDialog) { this._oNomDialog.setBusy(true); }

            // ── SINGLE nomination ────────────────────────────────────────────────────
            if (aPayloads.length === 1) {
                oODataModel.create("/NomCreate", aPayloads[0], {
                    success: function (oData, oResponse) {
                        if (that._oNomDialog) {
                            that._oNomDialog.setBusy(false);
                        }
                        var sMessageText = "";
                        try {
                            var sSapMessage =
                                (oResponse && oResponse.headers && (oResponse.headers["sap-message"] || oResponse.headers["SAP-Message"]));
                            if (sSapMessage) {
                                var oSapMsg = JSON.parse(sSapMessage);
                                if (oSapMsg.message) {
                                    sMessageText += "• " + oSapMsg.message + "\n\n";
                                }
                                if (oSapMsg.details && oSapMsg.details.length) {
                                    var oUniqueMessages = {};
                                    oSapMsg.details.forEach(function (oDetail) {
                                        if (
                                            oDetail.message &&
                                            !oUniqueMessages[oDetail.message]
                                        ) {
                                            oUniqueMessages[oDetail.message] = true;
                                            sMessageText += "• " + oDetail.message + "\n";
                                        }
                                    });
                                }
                            }
                        } catch (e) {
                            console.error("SAP Message Parse Error", e);
                            sMessageText = "1 nomination created successfully.";
                        }
                        MessageBox.information(
                            sMessageText || "1 nomination created successfully.",
                            {
                                title: "Nomination Messages",
                                onClose: function () {
                                    if (that._oNomDialog) {
                                        that._oNomDialog.close();
                                    }
                                    var oMST = that.byId("MainPnlFra013--matchTbl") || that.byId("matchTbl");
                                    if (oMST) {
                                        var oBinding = oMST.getBinding("items");
                                        if (oBinding) { oBinding.refresh(); }
                                    }
                                    if (typeof that._applyPositionFilters === "function") {
                                        that._applyPositionFilters();
                                    }
                                }
                            }
                        );
                    },
                    error: function (oError) {
                        if (that._oNomDialog) { that._oNomDialog.setBusy(false); }
                        var sMessageText = that._extractODataError(oError);
                        MessageBox.error(
                            sMessageText,
                            {
                                title: "Nomination Messages"
                            }
                        );
                    }
                });
                return;
            }

            // ── MULTIPLE nominations — OData V2 batch ────────────────────────────────
            var sGroupId = "nomCreateBatch";
            oODataModel.setUseBatch(true);
            oODataModel.setDeferredGroups([sGroupId]);
            // Each nomination is its own change set so they succeed/fail independently
            aPayloads.forEach(function (oPayload, nIdx) {
                oODataModel.create("/NomCreate", oPayload, {
                    groupId: sGroupId,
                    changeSetId: "cs_nom_" + nIdx
                });
            });

            oODataModel.submitChanges({
                groupId: sGroupId,
                success: function (oData) {
                    if (that._oNomDialog) { that._oNomDialog.setBusy(false); }
                    oODataModel.setDeferredGroups([]);

                    var aErrors = that._parseBatchErrors(oData);

                    if (aErrors.length) {
                        var nFailed = aErrors.length;
                        var nOk = aPayloads.length - nFailed;
                        oODataModel.resetChanges();

                        jQuery.sap.log.error("[NomCreate Batch] " + nFailed + " changeset(s) failed:\n\u2022 " + aErrors.join("\n\u2022 "));
                        MessageBox.error(
                            nFailed + " of " + aPayloads.length + " nomination(s) failed to save" +
                            (nOk > 0 ? " (" + nOk + " succeeded)" : "") + ":\n\n\u2022 " +
                            aErrors.join("\n\u2022 "),
                            {
                                title: "Submit Error",
                                onClose: function () {
                                    if (nOk > 0) {
                                        var oMST = that.byId("MainPnlFra013--matchTbl") || that.byId("matchTbl");
                                        if (oMST) {
                                            var oBinding = oMST.getBinding("items");
                                            if (oBinding) { oBinding.refresh(); }
                                        }
                                        if (typeof that._applyPositionFilters === "function") {
                                            that._applyPositionFilters();
                                        }
                                    }
                                }
                            }
                        );
                        return;
                    }

                    MessageBox.success(
                        aPayloads.length + " nomination(s) created successfully.",
                        {
                            onClose: function () {
                                if (that._oNomDialog) {
                                    that._oNomDialog.close();
                                }
                                var oMST = that.byId("MainPnlFra013--matchTbl") || that.byId("matchTbl");
                                if (oMST) {
                                    var oBinding = oMST.getBinding("items");
                                    if (oBinding) { oBinding.refresh(); }
                                }
                                if (typeof that._applyPositionFilters === "function") {
                                    that._applyPositionFilters();
                                }
                            }
                        }
                    );
                },
                error: function (oError) {
                    if (that._oNomDialog) { that._oNomDialog.setBusy(false); }
                    oODataModel.setDeferredGroups([]);
                    oODataModel.resetChanges();
                    var sDetail = that._extractODataError(oError);
                    jQuery.sap.log.error("[NomCreate Batch] HTTP " + (oError && oError.statusCode ? oError.statusCode : "?") + " — " + sDetail);
                    MessageBox.error(
                        "Failed to submit " + aPayloads.length + " nominations.\n\n" + sDetail,
                        { title: "Submit Error" }
                    );
                }
            });
        },

        _buildNominationPayload: function (oModel, aRows) {
            var sMoT = oModel.getProperty("/ModeOfTransport") || "";
            var sUOM = oModel.getProperty("/_uom") || "";
            var sCommodity = oModel.getProperty("/Commodity") || "";
            var sOrigin = oModel.getProperty("/Origin") || "";
            var sDestination = oModel.getProperty("/Destination") || "";
            var sPurchDoc = oModel.getProperty("/PurchaseDocument") || "";
            var sPurchItem = oModel.getProperty("/PurchaseDocItem") || "";
            var sSalesDoc = oModel.getProperty("/SalesDocument") || "";
            var sSalesItem = oModel.getProperty("/SalesDocItem") || "";
            var sPInco = oModel.getProperty("/PIncoTerms") || "";
            var sSInco = oModel.getProperty("/SIncoTerms") || "";

            var sMatchSource = oModel.getProperty("/MatchSource") || "";
            var sPlant = oModel.getProperty("/Plant") || "";
            var sStorageLoc = oModel.getProperty("/StorageLocation") || "";
            var bIsE2I = (sMatchSource === "E2I");
            var bIsI2O = (sMatchSource === "I2O");
            var bIsE2I_DAP = (sMatchSource === "E2I" && sPInco === "DAP");
            var bIsI2O_FOB = (sMatchSource === "I2O" && sSInco === "FOB");

            var sPurchTxType = "P";
            var sSalesTxType = "S";
            var sInvTxType = "I";

            var bHasPurch = !!(sPurchDoc || sPurchItem);
            var bHasSales = !!(sSalesDoc || sSalesItem);
            var bHasInv = (bIsE2I || bIsI2O) && !!(sPlant || sStorageLoc);

            if (!bHasPurch && !bHasSales && !bHasInv) {
                MessageBox.error(
                    "Cannot create nominations: no Purchase, Sales, or Inventory reference found " +
                    "in the selected match.\n\nEnsure the matched position has at least one document reference.",
                    { title: "Create Nominations \u2014 Missing Document Reference" }
                );
                return null;
            }

            var aPayloads = [];
            var aSkipped = [];

            aRows.forEach(function (r, nIdx) {
                var sSchedDate = r.ScheduleDate || "";
                var oSchedDate = null;
                if (sSchedDate) {
                    var aParts = sSchedDate.split("-");
                    if (aParts.length === 3) {
                        var oUTC = new Date(Date.UTC(
                            parseInt(aParts[0], 10),
                            parseInt(aParts[1], 10) - 1,
                            parseInt(aParts[2], 10)
                        ));
                        if (!isNaN(oUTC.getTime())) { oSchedDate = oUTC; }
                    }
                }
                if (!oSchedDate) {
                    aSkipped.push("Row " + (nIdx + 1) + ": invalid or missing schedule date (" + (sSchedDate || "empty") + ").");
                    return;
                }

                var nSchedQtyRow = parseFloat(r.ScheduleQty || 0);
                if (!nSchedQtyRow || nSchedQtyRow <= 0) {
                    aSkipped.push("Row " + (nIdx + 1) + ": schedule quantity is zero or missing.");
                    return;
                }
                var sSchedQty = nSchedQtyRow.toFixed(3);

                var sRowMoT = r.MoT || sMoT || "";
                var sRowVehicle = r.VehicleId || "";
                var sRowCarrier = r.CarrierCode || "";
                var sRowShipper = r.ShipperCode || "";

                var aItems = [];

                if (bIsE2I) {
                    // E2I : Entitlement (P) → Inventory (I)
                    if (bHasPurch) {
                        aItems.push({
                            refdoc: sPurchDoc,
                            refdocitem: sPurchItem,
                            scheddate: oSchedDate,
                            schedqty: sSchedQty,
                            scheduom: sUOM,
                            schedtype: "ZO",
                            schedmat: sCommodity,
                            locid: sOrigin,
                            incoterms: sPInco,
                            transtype: sPurchTxType
                        });
                    }
                    if (!bIsE2I_DAP && bHasInv) {
                        aItems.push({
                            refdoc: "",
                            refdocitem: "",
                            scheddate: oSchedDate,
                            schedqty: sSchedQty,
                            scheduom: sUOM,
                            schedtype: "ZD",
                            schedmat: sCommodity,
                            locid: sDestination,
                            incoterms: "DAP",
                            transtype: sInvTxType
                        });
                    }
                } else if (bIsI2O) {
                    // I2O : Inventory (I) → Obligation (S)
                    if (!bIsI2O_FOB && bHasInv) {
                        aItems.push({
                            refdoc: "",
                            refdocitem: "",
                            scheddate: oSchedDate,
                            schedqty: sSchedQty,
                            scheduom: sUOM,
                            schedtype: "ZO",
                            schedmat: sCommodity,
                            locid: sOrigin,
                            incoterms: "FOB",
                            transtype: sInvTxType
                        });
                    }
                    if (bHasSales) {
                        aItems.push({
                            refdoc: sSalesDoc,
                            refdocitem: sSalesItem,
                            scheddate: oSchedDate,
                            schedqty: sSchedQty,
                            scheduom: sUOM,
                            schedtype: "ZD",
                            schedmat: sCommodity,
                            locid: sDestination,
                            incoterms: sSInco,
                            transtype: sSalesTxType
                        });
                    }
                } else {
                    // E2O : standard bilateral
                    if (bHasPurch) {
                        aItems.push({
                            refdoc: sPurchDoc,
                            refdocitem: sPurchItem,
                            scheddate: oSchedDate,
                            schedqty: sSchedQty,
                            scheduom: sUOM,
                            schedtype: "ZO",
                            schedmat: sCommodity,
                            locid: sOrigin,
                            incoterms: sPInco,
                            transtype: sPurchTxType
                        });
                    }
                    if (bHasSales) {
                        aItems.push({
                            refdoc: sSalesDoc,
                            refdocitem: sSalesItem,
                            scheddate: oSchedDate,
                            schedqty: sSchedQty,
                            scheduom: sUOM,
                            schedtype: "ZD",
                            schedmat: sCommodity,
                            locid: sDestination,
                            incoterms: sSInco,
                            transtype: sSalesTxType
                        });
                    }
                }

                aPayloads.push({
                    mot: sRowMoT,
                    uom: sUOM,
                    vehicleno: sRowVehicle,
                    carrier: sRowCarrier,
                    shipper: sRowShipper,
                    to_items: { results: aItems }
                });
            });

            if (aSkipped.length) {
                MessageToast.show(aSkipped.length + " row(s) skipped — check console for details.");
                aSkipped.forEach(function (s) { jQuery.sap.log.warning("[NomPayload] " + s); });
            }

            if (!aPayloads.length) {
                MessageBox.error(
                    "No valid schedule rows could be included in the payload.\n\n" +
                    (aSkipped.length
                        ? "Issues found:\n\u2022 " + aSkipped.join("\n\u2022 ")
                        : "Check that rows have a valid date and quantity > 0."),
                    { title: "Create Nominations \u2014 No Valid Rows" }
                );
                return null;
            }

            return aPayloads;
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
    this._navigateToIntent(
        "Ticket",
        "create"
    );
},

navToUploadTicket: function () {

    if (!this._oTicketUploadDialog) {

        // Create FileUploader
        var oFileUploader = new FileUploader({
            width: "100%",
            placeholder: "Choose an Excel or CSV file...",
            buttonText: "Browse",
            fileType: ["xlsx", "xls", "csv"],
            change: this.onTicketFileChange.bind(this)
        });

        // Create VBox
        var oVBox = new sap.m.VBox({
            items: [
                new sap.m.Label({
                    text: "Select Ticket File"
                }),
                oFileUploader
            ]
        });

        // Correct way to add CSS class
        oVBox.addStyleClass("sapUiMediumMargin");

        // Create Dialog
        this._oTicketUploadDialog = new Dialog({
            title: "Upload Ticket File",
            contentWidth: "500px",

            content: [
                oVBox
            ],

            beginButton: new sap.m.Button({
                text: "Upload",
                type: "Emphasized",
                press: this.onTicketUploadConfirm.bind(this)
            }),

            endButton: new sap.m.Button({
                text: "Cancel",
                press: function () {
                    this._oTicketUploadDialog.close();
                }.bind(this)
            })
        });

        this.getView().addDependent(
            this._oTicketUploadDialog
        );
    }

    this._oTicketUploadDialog.open();
},

onTicketFileChange: function (oEvent) {

    var aFiles = oEvent.getParameter("files");

    if (aFiles && aFiles.length > 0) {

        this._oSelectedTicketFile = aFiles[0];

        console.log(
            "Selected Ticket File:",
            this._oSelectedTicketFile.name
        );

        MessageToast.show(
            "File selected: " +
            this._oSelectedTicketFile.name
        );
    }
},

onTicketUploadConfirm: function () {

    if (!this._oSelectedTicketFile) {

        MessageToast.show(
            "Please select a file first."
        );

        return;
    }

    var oFile = this._oSelectedTicketFile;

    console.log(
        "Uploading Ticket File:",
        oFile.name
    );

    /*
     * FILE PROCESSING WILL COME HERE
     *
     * For example:
     * Excel -> read rows
     * -> validate data
     * -> send data to OData
     */

    MessageToast.show(
        "File selected: " + oFile.name
    );

    this._oTicketUploadDialog.close();

    this._oSelectedTicketFile = null;
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

        // ── Full Screen Layout Helpers ─────────────────────────────────────────────
        onFullScreenToggle: function (oEvent) {
            LayoutHelper.toggleFullScreen(oEvent);
        },

        _toggleGenericTableFullScreen: function (oEvent, mConfig) {
            var oViewModel = this.getView().getModel("view");
            if (!oViewModel) {
                oViewModel = new sap.ui.model.json.JSONModel({});
                this.getView().setModel(oViewModel, "view");
            }
            var bFullScreen = !oViewModel.getProperty(mConfig.flag);
            oViewModel.setProperty(mConfig.flag, bFullScreen);

            var oBtn = oEvent && typeof oEvent.getSource === "function" ? oEvent.getSource() : null;
            var sPrefix = oBtn ? oBtn.getId().split("--")[0] + "--" : "";

            // 1. Resolve target Panel
            var oPanel = this.byId(sPrefix + mConfig.panelId) || this.byId(mConfig.panelId);
            if (!oPanel && oBtn) {
                var oCurr = oBtn;
                while (oCurr && typeof oCurr.getParent === "function") {
                    oCurr = oCurr.getParent();
                    if (oCurr && oCurr.isA && oCurr.isA("sap.m.Panel")) {
                        oPanel = oCurr;
                        break;
                    }
                }
            }

            // 2. Resolve ScrollContainer
            var oScrollContainer = this.byId(sPrefix + mConfig.scrollContainerId) || this.byId(mConfig.scrollContainerId);

            // 3. Resolve Sibling Panels to hide/show
            var aSiblingPanels = [];
            if (mConfig.siblingPanelIds && Array.isArray(mConfig.siblingPanelIds)) {
                mConfig.siblingPanelIds.forEach(function (sId) {
                    var oSib = this.byId(sPrefix + sId) || this.byId(sId);
                    if (oSib) {
                        aSiblingPanels.push(oSib);
                    }
                }.bind(this));
            }

            // 4. Apply / Remove Full Screen styling and visibility
            if (bFullScreen) {
                if (oPanel) {
                    oPanel.addStyleClass("dealsTableFullScreen");
                }
                if (oScrollContainer && typeof oScrollContainer.setHeight === "function") {
                    oScrollContainer.setHeight("100%");
                }
                aSiblingPanels.forEach(function (oSib) {
                    if (oSib && typeof oSib.setVisible === "function") {
                        oSib.setVisible(false);
                    }
                });
                document.body.classList.add("fullScreenLock");
                if (oBtn && typeof oBtn.setIcon === "function") {
                    oBtn.setIcon("sap-icon://exit-full-screen");
                    oBtn.setTooltip("Exit Full Screen");
                }
            } else {
                if (oPanel) {
                    oPanel.removeStyleClass("dealsTableFullScreen");
                }
                if (oScrollContainer && typeof oScrollContainer.setHeight === "function") {
                    oScrollContainer.setHeight("280px");
                }
                aSiblingPanels.forEach(function (oSib) {
                    if (oSib && typeof oSib.setVisible === "function") {
                        oSib.setVisible(true);
                    }
                });
                document.body.classList.remove("fullScreenLock");
                if (oBtn && typeof oBtn.setIcon === "function") {
                    oBtn.setIcon("sap-icon://full-screen");
                    oBtn.setTooltip("Full Screen");
                }
            }
        },

        onDealToggleFullScreen: function (oEvent) {
            this._toggleGenericTableFullScreen(oEvent, {
                flag: "/isTableFullScreen",
                panelId: "DlPnl2Pnl034",
                scrollContainerId: "DlPnl2Scr050",
                siblingPanelIds: ["DlPnl1Pnl001", "_IDGenPanel"]
            });
        },

        onMonthTableToggleFullScreen: function (oEvent) {
            this._toggleGenericTableFullScreen(oEvent, {
                flag: "/isMonthTableFullScreen",
                panelId: "monthPanel",
                scrollContainerId: "monthScr",
                siblingPanelIds: ["_IDGenPanel1", "sumPanel", "uomPanel", "planPanel", "matchPanel"]
            });
        },

        onNominationTableToggleFullScreen: function (oEvent) {
            this._toggleGenericTableFullScreen(oEvent, {
                flag: "/isNomDetailsFullScreen",
                panelId: "NomPnl2Pnl045",
                scrollContainerId: "NomPnl2Scr061",
                siblingPanelIds: ["NomPnl1Pnl001", "NomPnl3Pnl120", "NomPnl4Pnl185"]
            });
        },

        onTicketTableToggleFullScreen: function (oEvent) {
            this._toggleGenericTableFullScreen(oEvent, {
                flag: "/isTicketDetailsFullScreen",
                panelId: "NomPnl3Pnl120",
                scrollContainerId: "NomPnl3Scr136",
                siblingPanelIds: ["NomPnl1Pnl001", "NomPnl2Pnl045", "NomPnl4Pnl185"]
            });
        },

        onMatchTableToggleFullScreen: function (oEvent) {
            this._toggleGenericTableFullScreen(oEvent, {
                flag: "/isMatchTableFullScreen",
                panelId: "matchPanel",
                scrollContainerId: "scmd",
                siblingPanelIds: ["_IDGenPanel1", "sumPanel", "uomPanel", "planPanel", "monthPanel"]
            });
        }
        
    });
});
