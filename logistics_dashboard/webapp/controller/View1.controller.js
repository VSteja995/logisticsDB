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
], (Controller, JSONModel, LayoutHelper, MessageToast, Filter, FilterOperator,Fragment,Dialog, FileUploader) => {
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
    fromDate: null,
    toDate: null,
    commodityKeys: [],
    motKey: "01"
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

    // Get selected key from SegmentedButton
   var sKey = oEvent.getSource().getSelectedKey();

    console.log("Selected Deal Mode:", sKey);

    // =====================================================
    // Set MoT based on selected toggle
    // =====================================================

    if (sKey === "Truck") {

        // Truck = Road
        this._oDealFilterState.motKey = "01";

    } else if (sKey === "Rail") {

        // Rail = Rail
        this._oDealFilterState.motKey = "02";

    } else {

        this._oDealFilterState.motKey = "";
    }

    console.log(
        "Selected MoT Key:",
        this._oDealFilterState.motKey
    );

    // =====================================================
    // Get current date range
    // =====================================================

    var dFrom = this._oDealFilterState.fromDate;
    var dTo   = this._oDealFilterState.toDate;

    // =====================================================
    // Reload Deal Details
    // =====================================================

    if (dFrom && dTo) {

        this._applyDealsFilters(
            dFrom,
            dTo
        );

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

    // Truck = Road

    aResults = aResults.filter(function (oItem) {

        return String(oItem.MOT || "")
            .trim()
            .toLowerCase() === "road";

    });

} else if (sMotKey === "02") {

    // Rail = Rail

    aResults = aResults.filter(function (oItem) {

        return String(oItem.MOT || "")
            .trim()
            .toLowerCase() === "rail";

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
    this._navigateToIntent(
        "Ticket",
        "create"
    );
},

navToUploadTicket: function () {

    if (!this._oTicketUploadDialog) {

        var oFileUploader = new FileUploader({
            width: "100%",
            placeholder: "Choose an Excel or CSV file...",
            buttonText: "Browse",
            fileType: ["xlsx", "xls", "csv"],
            change: this.onTicketFileChange.bind(this)
        });

        this._oTicketUploadDialog = new Dialog({
            title: "Upload Ticket File",
            contentWidth: "500px",

            content: [
                new sap.m.VBox({
                    class: "sapUiMediumMargin",
                    items: [

                        new sap.m.Label({
                            text: "Select Ticket File"
                        }),

                        oFileUploader

                    ]
                })
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
