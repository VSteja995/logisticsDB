# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The repo root is only a wrapper (its `package.json` has no real scripts). The actual application is the SAP Fiori / SAPUI5 freestyle app in `logistics_dashboard/` (app id `genslogiques.logisticsdashboard`, generated with SAP Fiori tools "Basic" template). Run all npm commands from `logistics_dashboard/`.

## Commands (run in `logistics_dashboard/`)

- `npm start` — `fiori run` against the live backend via proxy (`ui5.yaml`; backend `http://gens.sapvista.com:50000`, client 100), opens the FLP sandbox at `test/flp.html#app-preview`.
- `npm run start-local` — serves a pinned SAPUI5 1.136.0 via the UI5 framework (`ui5-local.yaml`) instead of the CDN; this config also mounts the mock server.
- `npm run start-noflp` — opens `index.html` directly, without the FLP shell (cross-app navigation via `sap.ushell` will be unavailable).
- `npm run start-mock` — uses `ui5-mock.yaml` with `sap-fe-mockserver`.
- `npm run unit-test` / `npm run int-test` — open QUnit unit tests / OPA5 integration tests in the browser (no headless runner, no CLI test runner, no linter configured). To run a single test, open the QUnit page and use QUnit's module/test filter in the URL or UI.
- `npm run build` — `ui5 build` into `dist/`.
- `npm run deploy` / `deploy-test` / `undeploy` — build and deploy to the ABAP system per `ui5-deploy.yaml` (BSP app `ZLOGISTIC`, package `ZFIORIPACK`, transport `S4HK903379`). Deploy only when explicitly asked.

VS Code launch configs in `.vscode/launch.json` mirror the start / mock / local scripts.

## OData service — note the mismatch

`webapp/manifest.json` binds the default model to an **OData V2** service: `/sap/opu/odata/GLQ/CM_API_LOGISTIC/` (`sap.ui.model.odata.v2.ODataModel`). The mock config (`ui5-mock.yaml`, `ui5-local.yaml`) and `localService/mainService/metadata.xml` still describe the originally generated **V4** service (`/sap/opu/odata4/sap/zsrvimp_logistick_wrkbnch/...`), so the mock server only intercepts that unused V4 path. The app's V2 requests fall through to `fiori-tools-proxy`, which all configs still route to the real backend — i.e. "mock" and "local" modes effectively hit the live system too, and there is no offline mode.

Most reads use CDS parameterized entity sets, built as `oModel.createKey("/UniqDealCmdty", { p_FromDate, p_ToDate }) + "/Set"` (same for `DealQtyMot`, `PlanQtyMot`, `PosSmry`, etc.); dates are formatted by `_formatODataDate`. Other sets: `MatchConfirm`, `NomCreate`, `TicketCreate`, `PartnerInfo(p_role=...,p_roletype=...)/Set`, `VehicleInfo`, `UniqNomCmdty`, `UniqNomLoc`, `UniqNomStat`. Date helpers (`_parseDate`, `_toODataTimestamp`, V2 `/Date(ms)/`) are module-level functions at the top of `View1.controller.js`.

## Architecture

- Single route (`RouteView1`) → `view/View1.view.xml`, a `Page` with a header banner and an `IconTabBar` with three tabs, each an XML fragment in `webapp/fragments/`:
  - **Deals Overview** → `DealsOverview.fragment.xml`
  - **Logistics Planning** → `PositionManagement.fragment.xml` (position summary, monthly positions, match positions)
  - **Nominations** → `Nominations.fragment.xml` (nomination and ticket details)
  - Dialogs loaded lazily with `Fragment.load`: `CreateNominationsDialog.fragment.xml`, `CreateTicketDialog.fragment.xml`.
- Because tabs are inline fragments of View1, **all logic for every tab lives in one controller**: `controller/View1.controller.js` (~6300 lines). Fragment controls are addressed with `this.byId(...)` / view-prefixed IDs. Search by handler name rather than reading it top to bottom.
- Data pattern: OData results are read from the default model and copied into named view-level `JSONModel`s that the fragments bind to, using the convention model name `<Name>Data` with array property `/<Name>Set` (e.g. `DealDetailData>/DealDetailSet`, `PosSmryData>/PosSmrySet`, `NomDetailsData>/NomDetailsSet`). Dialog/value-help models: `nomMOTModel`, `CarrierVHDModel`, `ShipperVHDModel`, `VehicleVHDModel`, `ticketModel`, `matchedPositionsModel`; UI state in the `view` model.
- Filtering per tab uses separate state objects (`_oDealFilterState`, `_oPosFilterState`, `_oNomFilterState`). The date range is a server-side parameter (refetch via `_applyDealsFilters` / `_applyPositionFilters`); commodity and mode-of-transport filters are applied client-side to the results. Each refetch bumps a request counter (e.g. `_iDealsRequestId`) and discards stale responses, and tracks completion of parallel reads to clear `setBusy`. Default filters are initialised once in `onAfterRendering` (`_initializeDefaultDealsFilters`, `_initializeDefaultPlanningFilters`).
- Cross-app navigation (create/edit deal, create nomination, ticket) goes through `_navigateToIntent(semanticObject, action)` using `sap.ushell` `CrossApplicationNavigation`; it only works inside an FLP.
- Full-screen table toggles: `utils/LayoutHelper.js` (`toggleFullScreen`, `toggleLayout`) plus CSS classes `fullScreenSection`, `parentPanelFullScreen`, `fullScreenLock` in `css/style.css`. `BaseController.js` exists but View1 extends `sap/ui/core/mvc/Controller` directly.
- Styling is custom in `webapp/css/style.css` (brand classes like `headerBanner`, `brandIconTabBar`); theme is `sap_horizon`.

## Conventions

- Control IDs are explicit and prefixed per area (`MainPnl…` in View1, `DlPnl…` in Deals, `NomPnl…` in Nominations). Because tab fragments are embedded with their own fragment IDs, the controller reaches their controls as `this.byId("<fragmentId>--<controlId>")`, e.g. `MainPnlFra013--matchTbl` (Logistics Planning) or `MainPnlFra015--NomPnl2Tbl062` (Nominations). Keep IDs stable; renaming one breaks these lookups silently.
- Hungarian-notation variable names (`oModel`, `sPath`, `aRows`, `bFlag`), `sap.ui.define` AMD modules, `"use strict"`.
- The generated unit/OPA tests are scaffolding only (they instantiate the controller); they don't cover business logic.
