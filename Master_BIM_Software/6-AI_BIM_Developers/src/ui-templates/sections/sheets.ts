import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import {
  SheetsSync,
  APPS_SCRIPT_TEMPLATE,
  BimScheduleRow,
  LOCAL_EMULATOR_BASE_URL,
  CLOUD_FUNCTIONS_BASE_URL,
} from "../../bim-components/SheetsSync";

export interface SheetsSectionState {
  components: OBC.Components;
  isBusy?: boolean;
  showScriptModal?: boolean;
  showAdvancedUrl?: boolean;
  driveError?: string;
  activeSubTab?: "export" | "actions";
  actionStatus?: string;
  searchQuery?: string;
  newRuleCategory?: string;
  newRuleAction?: string;
  newRuleColor?: string;
  copiedEmail?: boolean;
}

const ALL_CATEGORIES = [
  { key: "WALL", label: "Walls" },
  { key: "SLAB", label: "Slabs" },
  { key: "COLUMN", label: "Columns" },
  { key: "BEAM", label: "Beams" },
  { key: "DOOR", label: "Doors" },
  { key: "WINDOW", label: "Windows" },
  { key: "ROOF", label: "Roofs" },
  { key: "FURNISHING", label: "Fixtures" },
];

const IFC_RULE_PRESETS = [
  "IFCWALL",
  "IFCSLAB",
  "IFCCOLUMN",
  "IFCBEAM",
  "IFCDOOR",
  "IFCWINDOW",
  "IFCROOF",
  "IFCSTAIR",
  "IFCFURNISHINGELEMENT",
];

const ACTION_OPTIONS = [
  { value: "highlight", label: "Highlight" },
  { value: "isolate", label: "Isolate" },
  { value: "xray", label: "X-Ray Focus" },
  { value: "hide", label: "Hide" },
  { value: "zoom", label: "Zoom / Fit" },
  { value: "show", label: "Show All" },
];

const autoDriveDiscoverySet = new WeakSet<SheetsSync>();

/**
 * Module 5 — Section 3 (Lessons 3.1 – 3.4): Google Sheets & Quantity Takeoff Studio
 * Extracts live Fragment / 3D quantities, runs interactive bidirectional Sheet Action rules
 * on the 3D BIM scene, and syncs via Firebase Functions, Apps Script, or Excel CSV.
 */
export const sheetsTemplate: BUI.StatefullComponent<SheetsSectionState> = (
  state: SheetsSectionState,
  update
) => {
  const { components } = state;
  const sheetsSync = components.get(SheetsSync);
  sheetsSync.ensureDefaultActionRules();

  if (!autoDriveDiscoverySet.has(sheetsSync)) {
    autoDriveDiscoverySet.add(sheetsSync);
    sheetsSync
      .listDriveSheets()
      .then(() => update())
      .catch(() => {});
  }

  const cfg = sheetsSync.config;
  const rows: BimScheduleRow[] = sheetsSync.rows;
  const lastResult = sheetsSync.lastResult;
  const subTab = state.activeSubTab || "export";
  const searchQuery = (state.searchQuery || "").trim().toLowerCase();

  const filteredRows = searchQuery
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery) ||
          r.category.toLowerCase().includes(searchQuery) ||
          String(r.expressId).toLowerCase().includes(searchQuery)
      )
    : rows;

  const totalArea = rows.reduce((s, r) => s + r.areaM2, 0);
  const totalVol = rows.reduce((s, r) => s + r.volumeM3, 0);
  const totalCost = rows.reduce((s, r) => s + r.estimatedCostUsd, 0);

  const ruleCategory = state.newRuleCategory || "IFCWALL";
  const ruleAction = state.newRuleAction || "highlight";
  const ruleColor = state.newRuleColor || "#38bdf8";

  const onToggleCategory = (catKey: string) => {
    const has = cfg.categories.includes(catKey);
    const next = has
      ? cfg.categories.filter((c) => c !== catKey)
      : [...cfg.categories, catKey];
    sheetsSync.saveConfig({ categories: next });
    update();
  };

  const onExtract = async () => {
    update({ isBusy: true });
    try {
      await sheetsSync.extractSchedule();
    } finally {
      update({ isBusy: false });
    }
  };

  const onPushToSheets = async () => {
    update({ isBusy: true });
    try {
      await sheetsSync.syncToGoogleSheets();
    } finally {
      update({ isBusy: false });
    }
  };

  const onDownloadCsv = async () => {
    update({ isBusy: true });
    try {
      if (sheetsSync.rows.length === 0) {
        await sheetsSync.extractSchedule();
      }
      sheetsSync.downloadCsv();
    } finally {
      update({ isBusy: false });
    }
  };

  const onCopyAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    } catch {}
    update({ showScriptModal: !state.showScriptModal });
  };

  const onCopyServiceEmail = async () => {
    if (!sheetsSync.serviceAccountEmail) return;
    try {
      await navigator.clipboard.writeText(sheetsSync.serviceAccountEmail);
      update({ copiedEmail: true });
      setTimeout(() => update({ copiedEmail: false }), 2000);
    } catch {}
  };

  const onBrowseDrive = async () => {
    update({ isBusy: true, driveError: "" });
    try {
      const files = await sheetsSync.listDriveSheets();
      const firstFolder = sheetsSync.driveFolders[0];
      update({
        isBusy: false,
        driveError:
          files.length === 0
            ? firstFolder
              ? `Connected to shared Drive folder "${firstFolder.name}" (it is empty). Open "${firstFolder.name}" in Google Drive -> click "+ New -> Google Sheets", then click "List Drive Sheets" again.`
              : 'Drive connected! Share a Google Sheet (Editor) with the Service Account email below, then click "List Drive Sheets" again.'
            : "",
      });
    } catch (err: any) {
      update({
        isBusy: false,
        driveError:
          err?.message ||
          "Start Firebase Functions Emulator & place your Service Account JSON key in resources/.",
      });
    }
  };

  const onCreateDriveSheet = async () => {
    update({ isBusy: true, driveError: "" });
    try {
      await sheetsSync.createDriveSheet(`BIM Schedule (${new Date().toLocaleDateString()})`);
      await sheetsSync.listDriveSheets();
      update({ isBusy: false, driveError: "" });
    } catch (err: any) {
      update({
        isBusy: false,
        driveError: err?.message || "Failed to create Google Sheet via Drive/Sheets API.",
      });
    }
  };

  const onSelectDriveSheet = async (spreadsheetId: string) => {
    sheetsSync.saveConfig({ spreadsheetId });
    try {
      await sheetsSync.loadSheetTabs(spreadsheetId);
    } catch {}
    update();
  };

  const onReadSheetActions = async () => {
    update({ isBusy: true, driveError: "", actionStatus: "Loading rows from Google Sheet..." });
    try {
      const parsed = await sheetsSync.readSheetData(cfg.spreadsheetId, cfg.sheetName);
      update({
        isBusy: false,
        driveError: "",
        actionStatus:
          parsed.length > 0
            ? `Loaded ${parsed.length} row(s) from Google Sheet.`
            : "Sheet connected, keeping built-in Pro Action rules (sheet had no data rows).",
      });
      if (parsed.length === 0) sheetsSync.ensureDefaultActionRules();
    } catch (err: any) {
      update({
        isBusy: false,
        actionStatus: err?.message || "Using built-in interactive Pro Action rules.",
      });
    }
  };

  const onRunRowAction = async (row: Record<string, string>) => {
    const category = row.Category || row.category || row.IFC || Object.values(row)[0] || "";
    const action = row.Action || row.action || row.Command || Object.values(row)[1] || "highlight";
    const colorHex = row.Color || row.color || "#38bdf8";
    const msg = await sheetsSync.executeSheetAction(category, action, colorHex);
    update({ actionStatus: msg });
  };

  const onRunAllActions = async () => {
    update({ isBusy: true });
    try {
      const msg = await sheetsSync.runAllSheetActions();
      update({ isBusy: false, actionStatus: msg });
    } catch (err: any) {
      update({ isBusy: false, actionStatus: err?.message || "Failed running action batch." });
    }
  };

  const onSyncActionsFromModel = async () => {
    update({ isBusy: true });
    try {
      if (sheetsSync.rows.length === 0) {
        await sheetsSync.extractSchedule();
      }
      const rebuilt = sheetsSync.syncActionRulesFromSchedule();
      update({
        isBusy: false,
        actionStatus: `Activated ${rebuilt.length} category action rule(s) from live model.`,
      });
    } finally {
      update({ isBusy: false });
    }
  };

  const onPushActionRules = async () => {
    update({ isBusy: true });
    try {
      const res = await sheetsSync.pushActionRulesToSheet("Sheet_Actions");
      update({ isBusy: false, actionStatus: res.message });
    } catch (err: any) {
      update({ isBusy: false, actionStatus: err?.message || "Failed pushing Sheet Actions." });
    }
  };

  const onWriteCategoryCounts = async () => {
    update({ isBusy: true });
    try {
      await sheetsSync.writeCategorySummaryToSheet(cfg.sheetName || "Category_Counts");
    } catch (err: any) {
      update({ driveError: err?.message || "Failed writing category counts." });
    } finally {
      update({ isBusy: false });
    }
  };

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; height: 100%; padding: 14px 16px; box-sizing: border-box;">
      <!-- Header Status Card -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(19, 20, 24, 0.94));
          border: 1px solid rgba(16, 185, 129, 0.4);
          flex-wrap: wrap;
        "
      >
        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.88rem; font-weight: 800; color: #f8fafc;">Google Sheets BIM Sync</span>
            <span style="font-size: 0.62rem; padding: 1px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.25); color: #34d399; font-weight: 700;">SEC 3 PRO</span>
          </div>
          <span style="font-size: 0.72rem; color: #94a3b8;">
            ${cfg.endpointUrl.includes("127.0.0.1")
              ? "Local Emulator (127.0.0.1:5001) Active"
              : cfg.endpointUrl
              ? "Cloud Webhook / Function Ready"
              : "Instant Extraction & CSV/Sheets Bridge"}
          </span>
        </div>

        <button
          type="button"
          @click=${onExtract}
          style="
            padding: 7px 13px;
            border-radius: 8px;
            background: rgba(56, 189, 248, 0.22);
            border: 1px solid rgba(56, 189, 248, 0.55);
            color: #7dd3fc;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
          "
        >
          ${state.isBusy ? "Scanning..." : "Scan Model"}
        </button>
      </div>

      <!-- Sub-Navigation Tabs -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        <button
          type="button"
          @click=${() => update({ activeSubTab: "export" })}
          style="padding: 7px 10px; border-radius: 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; background: ${subTab === "export" ? "rgba(16, 185, 129, 0.22)" : "rgba(32, 33, 38, 0.65)"}; border: 1px solid ${subTab === "export" ? "#10b981" : "rgba(148, 163, 184, 0.22)"}; color: ${subTab === "export" ? "#34d399" : "#94a3b8"};"
        >
          Export Takeoff (${rows.length})
        </button>
        <button
          type="button"
          @click=${() => update({ activeSubTab: "actions" })}
          style="padding: 7px 10px; border-radius: 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; background: ${subTab === "actions" ? "rgba(56, 189, 248, 0.22)" : "rgba(32, 33, 38, 0.65)"}; border: 1px solid ${subTab === "actions" ? "#38bdf8" : "rgba(148, 163, 184, 0.22)"}; color: ${subTab === "actions" ? "#38bdf8" : "#94a3b8"};"
        >
          Sheet Actions (${sheetsSync.sheetActionRows.length})
        </button>
      </div>

      ${subTab === "export"
        ? BUI.html`
            <!-- KPI Summary Strip -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 7px;">
              <div style="padding: 8px 10px; border-radius: 9px; background: rgba(32, 33, 38, 0.72); border: 1px solid rgba(148, 163, 184, 0.2);">
                <div style="font-size: 0.63rem; color: #94a3b8; text-transform: uppercase;">Elements</div>
                <div style="font-size: 0.96rem; font-weight: 800; color: #f8fafc;">${rows.length}</div>
              </div>
              <div style="padding: 8px 10px; border-radius: 9px; background: rgba(32, 33, 38, 0.72); border: 1px solid rgba(148, 163, 184, 0.2);">
                <div style="font-size: 0.63rem; color: #94a3b8; text-transform: uppercase;">Area</div>
                <div style="font-size: 0.94rem; font-weight: 800; color: #a78bfa; white-space: nowrap;">${totalArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</div>
              </div>
              <div style="padding: 8px 10px; border-radius: 9px; background: rgba(32, 33, 38, 0.72); border: 1px solid rgba(148, 163, 184, 0.2);">
                <div style="font-size: 0.63rem; color: #94a3b8; text-transform: uppercase;">Volume</div>
                <div style="font-size: 0.94rem; font-weight: 800; color: #38bdf8; white-space: nowrap;">${totalVol.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³</div>
              </div>
              <div style="padding: 8px 10px; border-radius: 9px; background: rgba(32, 33, 38, 0.72); border: 1px solid rgba(148, 163, 184, 0.2);">
                <div style="font-size: 0.63rem; color: #94a3b8; text-transform: uppercase;">Est. Cost</div>
                <div style="font-size: 0.94rem; font-weight: 800; color: #34d399; white-space: nowrap;">$${totalCost.toLocaleString()}</div>
              </div>
            </div>

            <!-- Category Filter Chips -->
            <div style="display: flex; flex-direction: column; gap: 5px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.70rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                  IFC Classes Included
                </span>
                <div style="display: flex; gap: 8px;">
                  <button
                    type="button"
                    @click=${() => { sheetsSync.saveConfig({ categories: ALL_CATEGORIES.map((c) => c.key) }); update(); }}
                    style="background: transparent; border: none; color: #38bdf8; font-size: 0.66rem; font-weight: 600; cursor: pointer;"
                  >All</button>
                  <button
                    type="button"
                    @click=${() => { sheetsSync.saveConfig({ categories: [] }); update(); }}
                    style="background: transparent; border: none; color: #94a3b8; font-size: 0.66rem; font-weight: 600; cursor: pointer;"
                  >Clear</button>
                </div>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                ${ALL_CATEGORIES.map((c) => {
                  const active = cfg.categories.includes(c.key);
                  return BUI.html`
                    <button
                      type="button"
                      @click=${() => onToggleCategory(c.key)}
                      style="
                        padding: 4px 9px;
                        border-radius: 6px;
                        font-size: 0.71rem;
                        font-weight: 600;
                        cursor: pointer;
                        background: ${active ? "rgba(56, 189, 248, 0.22)" : "rgba(32, 33, 38, 0.6)"};
                        border: 1px solid ${active ? "#38bdf8" : "rgba(148, 163, 184, 0.22)"};
                        color: ${active ? "#7dd3fc" : "#94a3b8"};
                      "
                    >
                      ${c.label}
                    </button>
                  `;
                })}
              </div>
            </div>
          `
        : BUI.html`
            <!-- Pro Interactive BIM Sheet Actions Studio -->
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px 12px; border-radius: 10px; background: rgba(19, 20, 24, 0.85); border: 1px solid rgba(255, 255, 255, 0.12);">
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                <button
                  type="button"
                  @click=${onRunAllActions}
                  style="flex: 1.2; min-width: 110px; padding: 7px 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-size: 0.73rem; font-weight: 700; cursor: pointer;"
                >
                  Run All Rules
                </button>
                <button
                  type="button"
                  @click=${onSyncActionsFromModel}
                  style="flex: 1; min-width: 110px; padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(56, 189, 248, 0.18); color: #7dd3fc; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                >
                  Sync From Model
                </button>
                <button
                  type="button"
                  @click=${async () => {
                    const msg = await sheetsSync.executeSheetAction("", "show");
                    update({ actionStatus: msg });
                  }}
                  style="padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(32, 33, 38, 0.85); color: #cbd5e1; font-size: 0.72rem; font-weight: 600; cursor: pointer;"
                >
                  Show All
                </button>
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button
                  type="button"
                  @click=${onReadSheetActions}
                  style="flex: 1; padding: 6px 9px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(32, 33, 38, 0.75); color: #38bdf8; font-size: 0.70rem; font-weight: 700; cursor: pointer;"
                >
                  Pull Sheet Rules
                </button>
                <button
                  type="button"
                  @click=${onPushActionRules}
                  style="flex: 1; padding: 6px 9px; border-radius: 7px; border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.14); color: #34d399; font-size: 0.70rem; font-weight: 700; cursor: pointer;"
                >
                  Push Rules → Sheet
                </button>
              </div>

              <!-- Add Custom Action Rule Builder -->
              <div style="display: grid; grid-template-columns: 1.2fr 1fr auto auto; gap: 5px; align-items: center; padding-top: 6px; border-top: 1px solid rgba(148, 163, 184, 0.16);">
                <select
                  .value=${ruleCategory}
                  @change=${(e: Event) => update({ newRuleCategory: (e.target as HTMLSelectElement).value })}
                  style="padding: 5px 6px; border-radius: 6px; background: rgba(32, 33, 38, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.70rem;"
                >
                  ${IFC_RULE_PRESETS.map((c) => BUI.html`<option value=${c}>${c}</option>`)}
                </select>
                <select
                  .value=${ruleAction}
                  @change=${(e: Event) => update({ newRuleAction: (e.target as HTMLSelectElement).value })}
                  style="padding: 5px 6px; border-radius: 6px; background: rgba(32, 33, 38, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.70rem;"
                >
                  ${ACTION_OPTIONS.map((opt) => BUI.html`<option value=${opt.value}>${opt.label}</option>`)}
                </select>
                <input
                  type="color"
                  .value=${ruleColor}
                  @input=${(e: Event) => update({ newRuleColor: (e.target as HTMLInputElement).value })}
                  style="width: 28px; height: 26px; padding: 0; border: 1px solid rgba(148,163,184,0.3); border-radius: 6px; background: transparent; cursor: pointer;"
                />
                <button
                  type="button"
                  @click=${() => {
                    sheetsSync.addSheetActionRule(ruleCategory, ruleAction, ruleColor);
                    update({ actionStatus: `Added rule: ${ruleCategory} → ${ruleAction}` });
                  }}
                  style="padding: 5px 9px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.5); background: rgba(56,189,248,0.2); color: #7dd3fc; font-size: 0.70rem; font-weight: 700; cursor: pointer;"
                >
                  + Add
                </button>
              </div>

              ${state.actionStatus
                ? BUI.html`<div style="font-size: 0.71rem; color: #7dd3fc; background: rgba(56, 189, 248, 0.1); padding: 5px 8px; border-radius: 6px;">${state.actionStatus}</div>`
                : ""}

              <div style="overflow: auto; max-height: clamp(190px, 30vh, 360px); border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.22); background: rgba(9, 13, 22, 0.88);">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.70rem; color: #cbd5e1; text-align: left;">
                  <thead>
                    <tr style="background: rgba(32, 33, 38, 0.95); color: #94a3b8; position: sticky; top: 0;">
                      <th style="padding: 6px 8px;">Color</th>
                      <th style="padding: 6px 8px;">IFC Category</th>
                      <th style="padding: 6px 8px;">Qty</th>
                      <th style="padding: 6px 8px;">Action</th>
                      <th style="padding: 6px 8px; text-align: right;">Execute</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sheetsSync.sheetActionRows.map((row, idx) => {
                      const cat = row.Category || row.category || Object.values(row)[0] || "-";
                      const act = (row.Action || row.action || "highlight").toLowerCase();
                      const col = row.Color || row.color || "#38bdf8";
                      const qty = row.Elements || "-";
                      return BUI.html`
                        <tr style="border-top: 1px solid rgba(148, 163, 184, 0.12);">
                          <td style="padding: 5px 8px;">
                            <input
                              type="color"
                              .value=${col}
                              @input=${(e: Event) => {
                                sheetsSync.updateSheetActionRule(idx, { Color: (e.target as HTMLInputElement).value });
                                update();
                              }}
                              style="width: 22px; height: 22px; padding: 0; border: none; border-radius: 5px; background: transparent; cursor: pointer;"
                            />
                          </td>
                          <td style="padding: 5px 8px; font-weight: 700; color: #f8fafc;">${cat}</td>
                          <td style="padding: 5px 8px; color: #94a3b8;">${qty}</td>
                          <td style="padding: 5px 8px;">
                            <select
                              .value=${act}
                              @change=${(e: Event) => {
                                sheetsSync.updateSheetActionRule(idx, { Action: (e.target as HTMLSelectElement).value });
                                update();
                              }}
                              style="padding: 3px 5px; border-radius: 5px; background: rgba(32, 33, 38, 0.85); border: 1px solid rgba(148, 163, 184, 0.22); color: #7dd3fc; font-size: 0.68rem;"
                            >
                              ${ACTION_OPTIONS.map((opt) => BUI.html`<option value=${opt.value} ?selected=${act === opt.value}>${opt.label}</option>`)}
                            </select>
                          </td>
                          <td style="padding: 5px 8px; text-align: right; white-space: nowrap;">
                            <button
                              type="button"
                              @click=${() => onRunRowAction(row)}
                              style="padding: 3px 8px; border-radius: 5px; border: 1px solid rgba(56, 189, 248, 0.5); background: rgba(56, 189, 248, 0.22); color: #7dd3fc; font-size: 0.67rem; font-weight: 700; cursor: pointer; margin-right: 4px;"
                            >
                              Run
                            </button>
                            <button
                              type="button"
                              @click=${() => {
                                sheetsSync.removeSheetActionRule(idx);
                                update();
                              }}
                              style="padding: 3px 6px; border-radius: 5px; border: 1px solid rgba(248, 113, 113, 0.35); background: rgba(239, 68, 68, 0.14); color: #fca5a5; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
                              title="Delete Rule"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          `}

      <!-- Google Drive + Firebase Backend Explorer (Lesson 3.1 - 3.3) -->
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 10px; background: rgba(19, 20, 24, 0.8); border: 1px solid rgba(255, 255, 255, 0.12);">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span style="font-size: 0.70rem; color: #38bdf8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
            Drive &amp; Sheets
          </span>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button
              type="button"
              @click=${() => {
                sheetsSync.saveConfig({ endpointUrl: `${LOCAL_EMULATOR_BASE_URL}/writeBimDataToSheets` });
                update({ driveError: "" });
              }}
              style="
                padding: 3px 7px; border-radius: 5px; font-size: 0.64rem; font-weight: 700; cursor: pointer;
                background: ${cfg.endpointUrl.includes("127.0.0.1") ? "rgba(56, 189, 248, 0.25)" : "rgba(32, 33, 38, 0.8)"};
                border: 1px solid ${cfg.endpointUrl.includes("127.0.0.1") ? "#38bdf8" : "rgba(148, 163, 184, 0.25)"};
                color: ${cfg.endpointUrl.includes("127.0.0.1") ? "#38bdf8" : "#94a3b8"};
              "
            >Emulator :5001</button>
            <button
              type="button"
              @click=${() => {
                sheetsSync.saveConfig({ endpointUrl: `${CLOUD_FUNCTIONS_BASE_URL}/writeBimDataToSheets` });
                update();
              }}
              style="
                padding: 3px 7px; border-radius: 5px; font-size: 0.64rem; font-weight: 700; cursor: pointer;
                background: ${cfg.endpointUrl.includes("cloudfunctions.net") ? "rgba(56, 189, 248, 0.25)" : "rgba(32, 33, 38, 0.8)"};
                border: 1px solid ${cfg.endpointUrl.includes("cloudfunctions.net") ? "#38bdf8" : "rgba(148, 163, 184, 0.25)"};
                color: ${cfg.endpointUrl.includes("cloudfunctions.net") ? "#38bdf8" : "#94a3b8"};
              "
            >Cloud URL</button>
            <button
              type="button"
              @click=${() => update({ showAdvancedUrl: !state.showAdvancedUrl })}
              style="background: transparent; border: none; color: #94a3b8; font-size: 0.64rem; font-weight: 600; cursor: pointer; text-decoration: underline;"
            >${state.showAdvancedUrl ? "Hide URL" : "Custom URL"}</button>
          </div>
        </div>

        ${state.showAdvancedUrl
          ? BUI.html`
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                <span>Firebase Function / Apps Script URL</span>
                <input
                  type="text"
                  .value=${cfg.endpointUrl}
                  @input=${(e: Event) => sheetsSync.saveConfig({ endpointUrl: (e.target as HTMLInputElement).value })}
                  placeholder="${LOCAL_EMULATOR_BASE_URL}/writeBimDataToSheets"
                  style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.85); border: 1px solid rgba(148, 163, 184, 0.3); color: #f8fafc; font-size: 0.71rem;"
                />
              </label>
            `
          : ""}

        <div style="display: flex; gap: 6px;">
          <button
            type="button"
            @click=${onBrowseDrive}
            style="flex: 1; padding: 6px 9px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(56, 189, 248, 0.14); color: #38bdf8; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
          >
            📁 List Drive Sheets
          </button>
          <button
            type="button"
            @click=${onCreateDriveSheet}
            style="padding: 6px 10px; border-radius: 7px; border: 1px solid rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
          >
            + New Sheet
          </button>
        </div>

        ${sheetsSync.serviceAccountEmail
          ? BUI.html`
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 8px; border-radius: 7px; background: rgba(32, 33, 38, 0.72); border: 1px solid rgba(148, 163, 184, 0.2);">
                <div style="display: flex; flex-direction: column; min-width: 0;">
                  <span style="font-size: 0.62rem; color: #94a3b8;">Share Sheet (Editor) with Service Account:</span>
                  <span style="font-size: 0.67rem; color: #7dd3fc; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sheetsSync.serviceAccountEmail}</span>
                </div>
                <button
                  type="button"
                  @click=${onCopyServiceEmail}
                  style="padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(56, 189, 248, 0.16); color: #7dd3fc; font-size: 0.66rem; font-weight: 700; cursor: pointer; flex-shrink: 0;"
                >
                  ${state.copiedEmail ? "Copied!" : "Copy"}
                </button>
              </div>
            `
          : ""}

        ${sheetsSync.driveFolders.length > 0
          ? BUI.html`
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${sheetsSync.driveFolders.map(
                  (fld) => BUI.html`
                    <a
                      href=${fld.webViewLink || `https://drive.google.com/drive/folders/${fld.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 7px; background: rgba(16, 185, 129, 0.14); border: 1px solid rgba(16, 185, 129, 0.38); color: #34d399; font-size: 0.68rem; font-weight: 700; text-decoration: none;"
                      title="Open shared folder in Google Drive to add a Google Sheet"
                    >
                      <span>📂 Open "${fld.name}" in Drive ↗</span>
                    </a>
                  `
                )}
                ${cfg.spreadsheetId &&
                !sheetsSync.driveFolders.some((f) => f.id === cfg.spreadsheetId)
                  ? BUI.html`
                      <a
                        href=${`https://docs.google.com/spreadsheets/d/${encodeURIComponent(cfg.spreadsheetId)}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 7px; background: rgba(56, 189, 248, 0.16); border: 1px solid rgba(255, 255, 255, 0.12); color: #7dd3fc; font-size: 0.68rem; font-weight: 700; text-decoration: none;"
                        title="Open active BIM Google Sheet in new tab"
                      >
                        <span>📊 Open Active Sheet ↗</span>
                      </a>
                    `
                  : ""}
              </div>
            `
          : ""}

        ${state.driveError
          ? BUI.html`
              <div style="display: flex; flex-direction: column; gap: 5px; padding: 7px 9px; border-radius: 6px; background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.35); color: #fcd34d; font-size: 0.68rem; line-height: 1.4;">
                <span>${state.driveError}</span>
              </div>
            `
          : ""}

        ${sheetsSync.driveFiles.length > 0
          ? BUI.html`
              <div style="display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto;">
                ${sheetsSync.driveFiles.map(
                  (f) => BUI.html`
                    <button
                      type="button"
                      @click=${() => onSelectDriveSheet(f.id)}
                      style="
                        display: flex; justify-content: space-between; align-items: center;
                        padding: 5px 8px; border-radius: 6px; text-align: left; cursor: pointer;
                        background: ${cfg.spreadsheetId === f.id ? "rgba(16, 185, 129, 0.2)" : "rgba(32, 33, 38, 0.7)"};
                        border: 1px solid ${cfg.spreadsheetId === f.id ? "#10b981" : "rgba(148, 163, 184, 0.2)"};
                        color: #f8fafc; font-size: 0.70rem;
                      "
                    >
                      <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📊 ${f.name}</span>
                      <span style="font-size: 0.62rem; color: #34d399; flex-shrink: 0;">${cfg.spreadsheetId === f.id ? "Selected" : "Pick"}</span>
                    </button>
                  `
                )}
              </div>
            `
          : ""}

        <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; width: 100%;">
          <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8; min-width: 0;">
            <span>Spreadsheet ID</span>
            <input
              type="text"
              .value=${cfg.spreadsheetId}
              @input=${(e: Event) => sheetsSync.saveConfig({ spreadsheetId: (e.target as HTMLInputElement).value })}
              placeholder="Paste Google Sheet ID..."
              style="width: 100%; padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.85); border: 1px solid rgba(148, 163, 184, 0.3); color: #f8fafc; font-size: 0.73rem;"
            />
          </label>
          <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8; min-width: 0;">
            <span>Sheet Tab Name</span>
            ${sheetsSync.sheetTabs.length > 0
              ? BUI.html`
                  <select
                    @change=${(e: Event) => { sheetsSync.saveConfig({ sheetName: (e.target as HTMLSelectElement).value }); update(); }}
                    style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.85); border: 1px solid rgba(148, 163, 184, 0.3); color: #f8fafc; font-size: 0.73rem;"
                  >
                    ${sheetsSync.sheetTabs.map(
                      (t) => BUI.html`<option value=${t.title} ?selected=${t.title === cfg.sheetName}>${t.title}</option>`
                    )}
                  </select>
                `
              : BUI.html`
                  <input
                    type="text"
                    .value=${cfg.sheetName}
                    @input=${(e: Event) => sheetsSync.saveConfig({ sheetName: (e.target as HTMLInputElement).value })}
                    placeholder="BIM_Schedule"
                    style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.85); border: 1px solid rgba(148, 163, 184, 0.3); color: #f8fafc; font-size: 0.73rem;"
                  />
                `}
          </label>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px;">
          <div style="display: flex; gap: 4px;">
            <button
              type="button"
              @click=${() => { sheetsSync.saveConfig({ mode: "replace" }); update(); }}
              style="
                padding: 4px 8px; border-radius: 6px; font-size: 0.68rem; font-weight: 700; cursor: pointer;
                background: ${cfg.mode === "replace" ? "rgba(16, 185, 129, 0.25)" : "transparent"};
                border: 1px solid ${cfg.mode === "replace" ? "#10b981" : "rgba(148, 163, 184, 0.25)"};
                color: ${cfg.mode === "replace" ? "#34d399" : "#94a3b8"};
              "
            >Replace Sheet</button>
            <button
              type="button"
              @click=${() => { sheetsSync.saveConfig({ mode: "append" }); update(); }}
              style="
                padding: 4px 8px; border-radius: 6px; font-size: 0.68rem; font-weight: 700; cursor: pointer;
                background: ${cfg.mode === "append" ? "rgba(16, 185, 129, 0.25)" : "transparent"};
                border: 1px solid ${cfg.mode === "append" ? "#10b981" : "rgba(148, 163, 184, 0.25)"};
                color: ${cfg.mode === "append" ? "#34d399" : "#94a3b8"};
              "
            >Append Rows</button>
          </div>
          <button
            type="button"
            @click=${onCopyAppsScript}
            style="background: transparent; border: none; color: #38bdf8; font-size: 0.68rem; font-weight: 600; cursor: pointer; text-decoration: underline;"
          >
            ${state.showScriptModal ? "Hide Script" : "Apps Script Code"}
          </button>
        </div>

        ${state.showScriptModal
          ? BUI.html`
              <pre style="margin: 4px 0 0; padding: 8px; border-radius: 6px; background: #020617; border: 1px solid rgba(255, 255, 255, 0.12); color: #a5f3fc; font-size: 0.64rem; overflow-x: auto; max-height: 120px;">${APPS_SCRIPT_TEMPLATE}</pre>
            `
          : ""}
      </div>

      <!-- Primary Sync Action Buttons -->
      <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px;">
        <button
          type="button"
          @click=${onPushToSheets}
          style="
            padding: 8px 8px;
            border-radius: 9px;
            border: none;
            background: linear-gradient(135deg, #059669, #10b981);
            color: #ffffff;
            font-size: 0.72rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
          "
          title="Write full quantity takeoff with =SUM() totals to Google Sheet"
        >
          Write Takeoff
        </button>

        <button
          type="button"
          @click=${async () => {
            update({ isBusy: true });
            try {
              await sheetsSync.syncAllTabsToWorkbook();
            } catch (err: any) {
              update({ driveError: err?.message || "Failed full workbook sync." });
            } finally {
              update({ isBusy: false });
            }
          }}
          style="
            padding: 8px 8px;
            border-radius: 9px;
            border: 1px solid rgba(16, 185, 129, 0.45);
            background: rgba(16, 185, 129, 0.16);
            color: #6ee7b7;
            font-size: 0.71rem;
            font-weight: 700;
            cursor: pointer;
          "
          title="Sync BIM_Schedule, Category_Counts, and Sheet_Actions tabs at once"
        >
          Full Workbook
        </button>

        <button
          type="button"
          @click=${onWriteCategoryCounts}
          style="
            padding: 8px 8px;
            border-radius: 9px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(56, 189, 248, 0.16);
            color: #38bdf8;
            font-size: 0.71rem;
            font-weight: 700;
            cursor: pointer;
          "
        >
          Write Counts
        </button>

        <button
          type="button"
          @click=${onDownloadCsv}
          style="
            padding: 8px 8px;
            border-radius: 9px;
            border: 1px solid rgba(148, 163, 184, 0.35);
            background: rgba(32, 33, 38, 0.85);
            color: #f8fafc;
            font-size: 0.71rem;
            font-weight: 600;
            cursor: pointer;
          "
        >
          CSV
        </button>
      </div>

      ${lastResult
        ? BUI.html`
            <div style="padding: 8px 10px; border-radius: 8px; font-size: 0.72rem; background: ${lastResult.success ? "rgba(16, 185, 129, 0.14)" : "rgba(245, 158, 11, 0.14)"}; border: 1px solid ${lastResult.success ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}; color: ${lastResult.success ? "#6ee7b7" : "#fcd34d"};">
              <strong>[${lastResult.timestamp}]</strong> ${lastResult.message}
            </div>
          `
        : ""}

      <!-- Interactive Quantity Preview Table -->
      <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; min-height: 180px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 0.70rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">
            Extracted Schedule (${filteredRows.length}) — Click row to focus 3D
          </span>
          <input
            type="text"
            .value=${state.searchQuery || ""}
            @input=${(e: Event) => update({ searchQuery: (e.target as HTMLInputElement).value })}
            placeholder="Filter element / class..."
            style="padding: 4px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.8); border: 1px solid rgba(148, 163, 184, 0.25); color: #f8fafc; font-size: 0.69rem; min-width: 140px;"
          />
        </div>
        <div style="overflow: auto; flex: 1; min-height: 180px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.22); background: rgba(9, 13, 22, 0.85);">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.70rem; color: #cbd5e1; text-align: left;">
            <thead>
              <tr style="background: rgba(32, 33, 38, 0.95); color: #94a3b8; position: sticky; top: 0;">
                <th style="padding: 7px 9px;">Name</th>
                <th style="padding: 7px 9px;">Class</th>
                <th style="padding: 7px 9px;">Area</th>
                <th style="padding: 7px 9px;">Vol</th>
                <th style="padding: 7px 9px;">Cost</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRows.length === 0
                ? BUI.html`<tr><td colspan="5" style="padding: 18px; text-align: center; color: #64748b;">Click "Scan Model" above to extract live BIM quantities.</td></tr>`
                : filteredRows.slice(0, 120).map(
                    (r) => BUI.html`
                      <tr
                        @click=${async () => {
                          await sheetsSync.focusElementById(r.expressId);
                        }}
                        style="border-top: 1px solid rgba(148, 163, 184, 0.1); cursor: pointer;"
                        title="Click to select & focus ${r.name} in 3D viewer"
                      >
                        <td style="padding: 6px 9px; color: #f8fafc; font-weight: 500;">${r.name}</td>
                        <td style="padding: 6px 9px; color: #38bdf8;">${r.category.replace(/^Ifc/i, "")}</td>
                        <td style="padding: 6px 9px;">${r.areaM2} m²</td>
                        <td style="padding: 6px 9px;">${r.volumeM3} m³</td>
                        <td style="padding: 6px 9px; color: #34d399; font-weight: 600;">$${r.estimatedCostUsd}</td>
                      </tr>
                    `
                  )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
};
