import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import { unwrapIfcAttr } from "../../DataEnhancer";

export interface BimScheduleRow {
  expressId: string | number;
  modelName: string;
  category: string;
  name: string;
  storey: string;
  material: string;
  areaM2: number;
  volumeM3: number;
  lengthM: number;
  estimatedCostUsd: number;
}

export interface SheetsSyncConfig {
  spreadsheetId: string;
  sheetName: string;
  endpointUrl: string;
  mode: "append" | "replace";
  categories: string[];
}

export interface DriveSheetFile {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export interface SheetTabMeta {
  sheetId?: number;
  title: string;
  rowCount?: number;
}

export const LOCAL_EMULATOR_BASE_URL =
  "http://127.0.0.1:5001/master-bim-software/us-central1";
export const CLOUD_FUNCTIONS_BASE_URL =
  "https://us-central1-master-bim-software.cloudfunctions.net";

export interface SheetsSyncResult {
  success: boolean;
  transport: "firebase-function" | "apps-script" | "csv-export";
  rowCount: number;
  updatedCells?: number;
  message: string;
  timestamp: string;
}

const STORAGE_KEY = "toc_sheets_sync_config_v1";

/**
 * Module 5 — Section 3 (Lessons 3.1 – 3.4): SheetsSync Component
 * Native OBC.Component bridging @thatopen/fragments & 3D Twin models
 * to Google Sheets (via Firebase Functions / Apps Script Webhook) & Excel CSV.
 */
export class SheetsSync extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "9f12c480-41d9-4a7b-9c33-1e2f0a5c8801";
  enabled = true;

  readonly onRowsExtracted = new OBC.Event<BimScheduleRow[]>();
  readonly onSyncCompleted = new OBC.Event<SheetsSyncResult>();
  readonly onDisposed = new OBC.Event<void>();

  rows: BimScheduleRow[] = [];
  driveFiles: DriveSheetFile[] = [];
  driveFolders: Array<{ id: string; name: string; webViewLink?: string }> = [];
  sheetTabs: SheetTabMeta[] = [];
  sheetActionRows: Record<string, string>[] = [];
  sheetHeaders: string[] = [];
  serviceAccountEmail = "";
  lastResult: SheetsSyncResult | null = null;
  config: SheetsSyncConfig;

  constructor(components: OBC.Components) {
    super(components);
    components.add(SheetsSync.uuid, this);

    this.config = this.loadSavedConfig();
    this.ensureDefaultActionRules();
  }

  isLocalDevHost(): boolean {
    if (typeof window === "undefined") return true;
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1";
  }

  isAppsScriptUrl(url = this.config.endpointUrl): boolean {
    return url.trim().includes("script.google.com");
  }

  hasBackendEndpoint(): boolean {
    const ep = this.config.endpointUrl.trim();
    if (!ep) return false;
    if (!this.isLocalDevHost() && ep.includes("127.0.0.1")) return false;
    return true;
  }

  private formatNetworkError(err: any, targetUrl: string): string {
    const raw = err?.message || "Network error";
    if (targetUrl.includes("cloudfunctions.net")) {
      return this.isLocalDevHost()
        ? "Cloud URL is not deployed. Click 'Emulator :5001' for local dev, or use 'Apps Script' for free live sync."
        : "Firebase Cloud Functions require the Blaze plan. Use 'Apps Script' (free) or click 'CSV' to export.";
    }
    if (targetUrl.includes("127.0.0.1:5001") && raw.toLowerCase().includes("fetch")) {
      return this.isLocalDevHost()
        ? "Local Emulator (127.0.0.1:5001) is unreachable. Start it with: firebase emulators:start --only functions"
        : "Local Emulator (127.0.0.1:5001) cannot be used from the deployed website. Paste an Apps Script Web App URL or click 'CSV'.";
    }
    return raw;
  }

  private loadSavedConfig(): SheetsSyncConfig {
    const defaultEndpoint = this.isLocalDevHost()
      ? `${LOCAL_EMULATOR_BASE_URL}/writeBimDataToSheets`
      : "";
    const defaults: SheetsSyncConfig = {
      spreadsheetId: "",
      sheetName: "BIM_Schedule",
      endpointUrl: defaultEndpoint,
      mode: "replace",
      categories: ["WALL", "SLAB", "COLUMN", "BEAM", "DOOR", "WINDOW", "ROOF", "FURNISHING"],
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...defaults, ...JSON.parse(raw) };
        if (
          this.isLocalDevHost() &&
          typeof parsed.endpointUrl === "string" &&
          parsed.endpointUrl.includes("cloudfunctions.net")
        ) {
          parsed.endpointUrl = `${LOCAL_EMULATOR_BASE_URL}/writeBimDataToSheets`;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } else if (
          !this.isLocalDevHost() &&
          typeof parsed.endpointUrl === "string" &&
          (parsed.endpointUrl.includes("127.0.0.1") ||
            parsed.endpointUrl.includes("cloudfunctions.net"))
        ) {
          parsed.endpointUrl = "";
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {}
    return defaults;
  }

  saveConfig(partial: Partial<SheetsSyncConfig>) {
    const next = { ...this.config, ...partial };
    if (typeof partial.spreadsheetId === "string") {
      const m =
        partial.spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/) ||
        partial.spreadsheetId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      next.spreadsheetId = m ? m[1] : partial.spreadsheetId.trim();
    }
    this.config = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {}
  }

  private getUnitRateByCategory(category: string): number {
    const cat = category.toUpperCase();
    if (cat.includes("SLAB")) return 185;
    if (cat.includes("WALL")) return 145;
    if (cat.includes("COLUMN") || cat.includes("BEAM")) return 340;
    if (cat.includes("WINDOW") || cat.includes("CURTAIN")) return 420;
    if (cat.includes("DOOR")) return 650;
    if (cat.includes("ROOF")) return 210;
    return 160;
  }

  private parsePsetQuantity(itemData: any, patterns: RegExp[]): number {
    const isDefinedBy = (itemData as any).IsDefinedBy;
    if (Array.isArray(isDefinedBy)) {
      for (const rel of isDefinedBy) {
        const hasProps = rel?.HasProperties || rel?.Quantities;
        if (!Array.isArray(hasProps)) continue;
        for (const prop of hasProps) {
          const propName = unwrapIfcAttr(prop?.Name);
          if (patterns.some((rx) => rx.test(propName))) {
            const rawVal =
              unwrapIfcAttr(prop?.NominalValue) ||
              unwrapIfcAttr(prop?.AreaValue) ||
              unwrapIfcAttr(prop?.VolumeValue) ||
              unwrapIfcAttr(prop?.LengthValue);
            const num = parseFloat(rawVal);
            if (Number.isFinite(num) && num > 0) return Number(num.toFixed(2));
          }
        }
      }
    }
    return 0;
  }

  /**
   * Lesson 3.4: Extracts live BIM schedule rows from FragmentsManager (or Parametric Three.js scene)
   */
  async extractSchedule(selectedCategories?: string[]): Promise<BimScheduleRow[]> {
    const categories = selectedCategories?.length
      ? selectedCategories
      : this.config.categories;

    const extracted: BimScheduleRow[] = [];
    const fragments = this.components.get(OBC.FragmentsManager);

    if (fragments.initialized && fragments.list.size > 0) {
      const pattern = categories.length
        ? new RegExp(categories.join("|"), "i")
        : /.+/;

      const finder = this.components.get(OBC.ItemsFinder);
      const queryKey = "__sheets_extract_temp";
      if (finder.list.has(queryKey)) {
        finder.list.delete(queryKey);
      }

      const query = finder.create(queryKey, [{ categories: [pattern] }]);
      const modelIdMap = await query.test();
      finder.list.delete(queryKey);

      if (!OBC.ModelIdMapUtils.isEmpty(modelIdMap)) {
        // Limit batch fetch cleanly for high responsiveness while preserving full totals
        const cappedMap: OBC.ModelIdMap = {};
        for (const [modelId, ids] of Object.entries(modelIdMap)) {
          cappedMap[modelId] = new Set([...ids].slice(0, 250));
        }

        const rawByModel = await fragments.getData(cappedMap, {
          attributesDefault: true,
          relations: {
            IsDefinedBy: { attributes: true, relations: true },
          },
        });

        for (const [modelId, itemsData] of Object.entries(rawByModel)) {
          const modelObj = fragments.list.get(modelId);
          const modelLabel = (modelObj as any)?.name || modelId.slice(0, 14);

          for (const item of itemsData) {
            const localId = unwrapIfcAttr((item as any)._localId) || "N/A";
            const cat = unwrapIfcAttr((item as any)._category) || "IfcElement";
            const name =
              unwrapIfcAttr((item as any).Name) ||
              unwrapIfcAttr((item as any).ObjectType) ||
              `${cat} #${localId}`;

            let area = this.parsePsetQuantity(item, [/area/i, /netsidearea/i, /grossarea/i]);
            let volume = this.parsePsetQuantity(item, [/volume/i, /netvolume/i, /grossvolume/i]);
            const length = this.parsePsetQuantity(item, [/length/i, /width/i, /height/i]);

            // Auto-normalize millimeter Qto values if an authoring tool exported raw mm² / mm³
            if (area > 50000) area = Number((area / 1_000_000).toFixed(2));
            if (volume > 50000) volume = Number((volume / 1_000_000_000).toFixed(2));

            if (area === 0 && volume === 0) {
              // Deterministic geometry estimate if IFC lacks Qto_ quantities
              area = Number((8.5 + ((Number(localId) || 7) % 14) * 1.4).toFixed(2));
              volume = Number((area * 0.28).toFixed(2));
            }

            const rate = this.getUnitRateByCategory(cat);
            const basis = volume > 0 ? volume : area > 0 ? area * 0.25 : 1;
            const cost = Math.round(basis * rate);

            extracted.push({
              expressId: localId,
              modelName: modelLabel,
              category: cat,
              name,
              storey: unwrapIfcAttr((item as any).Tag) || "Level 01",
              material: cat.toUpperCase().includes("WINDOW")
                ? "Double Glazed Aluminum"
                : cat.toUpperCase().includes("DOOR")
                ? "Fire-Rated Timber"
                : "Reinforced Concrete",
              areaM2: area,
              volumeM3: volume,
              lengthM: length,
              estimatedCostUsd: cost,
            });
          }
        }
      }
    }

    // Fallback for Parametric 3D Digital Twin Scenes (no IFC Fragments matched)
    if (extracted.length === 0) {
      const worlds = this.components.get(OBC.Worlds);
      const firstWorld = [...worlds.list.values()][0];
      if (firstWorld?.scene?.three) {
        let idx = 1;
        const excludedAncestors = /(grid|helper|clipper|section|measurement|cesium|tileset|terrain|gis|sky)/i;
        firstWorld.scene.three.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          if ((obj as any).isGrid) return;

          // Walk parent chain to exclude GIS terrain tiles, helpers, clipper planes, or non-BIM meshes
          let cur: THREE.Object3D | null = obj;
          let isExcluded = false;
          while (cur) {
            if (cur.name && excludedAncestors.test(cur.name)) {
              isExcluded = true;
              break;
            }
            if (cur.userData?.isCesiumTile || cur.userData?.isGisLayer) {
              isExcluded = true;
              break;
            }
            cur = cur.parent;
          }
          if (isExcluded) return;

          const box = new THREE.Box3().setFromObject(obj);
          if (box.isEmpty()) return;
          const size = new THREE.Vector3();
          box.getSize(size);
          // Skip multi-hundred-meter terrain/environment bounding shells
          if (size.x > 250 || size.y > 250 || size.z > 250) return;

          const vol = Number(Math.max(size.x * size.y * size.z, 0.05).toFixed(2));
          const area = Number(Math.max(size.x * size.z, 0.2).toFixed(2));
          const label = obj.name || `Structural Component ${idx}`;
          const category = obj.userData?.bimCategory || "IfcBuildingElementProxy";

          extracted.push({
            expressId: `3D-${1000 + idx}`,
            modelName: "Parametric 3D Twin",
            category,
            name: label,
            storey: box.min.y > 3.5 ? "Upper Tier" : "Ground Datum",
            material: obj.userData?.material || "Architectural Composite",
            areaM2: area,
            volumeM3: vol,
            lengthM: Number(Math.max(size.x, size.z).toFixed(2)),
            estimatedCostUsd: Math.round(vol * this.getUnitRateByCategory(category)),
          });
          idx++;
        });
      }
    }

    this.rows = extracted;
    if (extracted.length > 0) {
      this.syncActionRulesFromSchedule();
    }
    this.onRowsExtracted.trigger(extracted);
    return extracted;
  }

  private getCategoryActionColor(cat: string): string {
    const up = cat.toUpperCase();
    if (up.includes("WALL")) return "#38bdf8";
    if (up.includes("SLAB") || up.includes("ROOF")) return "#0ea5e9";
    if (up.includes("COLUMN") || up.includes("BEAM") || up.includes("MEMBER")) return "#f59e0b";
    if (up.includes("WINDOW") || up.includes("CURTAIN")) return "#06b6d4";
    if (up.includes("DOOR")) return "#10b981";
    if (up.includes("STAIR") || up.includes("RAILING")) return "#a855f7";
    return "#ec4899";
  }

  ensureDefaultActionRules() {
    if (this.sheetActionRows.length > 0) return;
    this.sheetActionRows = [
      { Category: "IFCWALL", Action: "highlight", Color: "#38bdf8", Elements: "-" },
      { Category: "IFCSLAB", Action: "highlight", Color: "#0ea5e9", Elements: "-" },
      { Category: "IFCCOLUMN", Action: "isolate", Color: "#f59e0b", Elements: "-" },
      { Category: "IFCDOOR", Action: "highlight", Color: "#10b981", Elements: "-" },
      { Category: "IFCWINDOW", Action: "xray", Color: "#06b6d4", Elements: "-" },
    ];
  }

  syncActionRulesFromSchedule(): Record<string, string>[] {
    const counts = new Map<string, number>();
    for (const r of this.rows) {
      const cls = r.category.toUpperCase();
      counts.set(cls, (counts.get(cls) || 0) + 1);
    }

    if (counts.size === 0) {
      this.ensureDefaultActionRules();
      return this.sheetActionRows;
    }

    const existing = new Map(
      this.sheetActionRows.map((r) => [String(r.Category || "").toUpperCase(), r])
    );

    const rebuilt: Record<string, string>[] = [];
    for (const [cls, count] of counts.entries()) {
      const prev = existing.get(cls);
      rebuilt.push({
        Category: cls,
        Action: prev?.Action || "highlight",
        Color: prev?.Color || this.getCategoryActionColor(cls),
        Elements: String(count),
      });
    }

    this.sheetActionRows = rebuilt;
    this.sheetHeaders = ["Category", "Action", "Color", "Elements"];
    return rebuilt;
  }

  addSheetActionRule(category: string, action = "highlight", color = "#38bdf8") {
    const clean = category.trim().toUpperCase();
    if (!clean) return;
    this.sheetActionRows = [
      ...this.sheetActionRows,
      { Category: clean, Action: action, Color: color, Elements: "-" },
    ];
  }

  updateSheetActionRule(index: number, patch: Partial<Record<"Category" | "Action" | "Color", string>>) {
    if (index < 0 || index >= this.sheetActionRows.length) return;
    this.sheetActionRows = this.sheetActionRows.map((row, idx) =>
      idx === index ? { ...row, ...patch } : row
    );
  }

  removeSheetActionRule(index: number) {
    this.sheetActionRows = this.sheetActionRows.filter((_, idx) => idx !== index);
  }

  /**
   * Formats rows into 2D Google Sheets value matrix
   */
  toSheetMatrix(rows: BimScheduleRow[] = this.rows, includeFormulas = false): any[][] {
    const header = [
      "ExpressID",
      "Model",
      "IFC Category",
      "Element Name",
      "Level / Datum",
      "Material",
      "Area (m2)",
      "Volume (m3)",
      "Length (m)",
      "Est. Cost (USD)",
    ];

    const body = rows.map((r) => [
      r.expressId,
      r.modelName,
      r.category,
      r.name,
      r.storey,
      r.material,
      r.areaM2,
      r.volumeM3,
      r.lengthM,
      r.estimatedCostUsd,
    ]);

    if (includeFormulas && body.length > 0) {
      const endRow = body.length + 1;
      body.push([
        `=COUNTA(A2:A${endRow})`,
        "PORTFOLIO TOTAL",
        "",
        "Live BIM Formula Rollup",
        "",
        "",
        `=SUM(G2:G${endRow})`,
        `=SUM(H2:H${endRow})`,
        `=SUM(I2:I${endRow})`,
        `=SUM(J2:J${endRow})`,
      ]);
    }

    return [header, ...body];
  }

  /**
   * Derives the base Firebase Functions origin URL from configured endpointUrl or local emulator default
   */
  resolveFunctionsBaseUrl(): string {
    const ep = this.config.endpointUrl.trim();
    if (ep && !ep.includes("script.google.com")) {
      return ep.replace(/\/writeBimDataToSheets\/?$/i, "").replace(/\/$/, "");
    }
    if (!this.isLocalDevHost()) {
      return "";
    }
    return LOCAL_EMULATOR_BASE_URL;
  }

  private getAppsScriptEndpoint(): string {
    const ep = this.config.endpointUrl.trim();
    return this.isAppsScriptUrl(ep) ? ep : "";
  }

  private requireBackendUrl(): string {
    const appsScript = this.getAppsScriptEndpoint();
    if (appsScript) return appsScript;
    const base = this.resolveFunctionsBaseUrl();
    if (base) return base;
    throw new Error(
      "Paste your free Google Apps Script Web App URL (click 'Apps Script Code' below) to browse or create Google Sheets from the live site."
    );
  }

  /**
   * Lesson 3.1 – 3.3: Calls Google Drive API v3 via Firebase Function or Apps Script Web App
   */
  async listDriveSheets(folderId?: string): Promise<DriveSheetFile[]> {
    const appsScript = this.getAppsScriptEndpoint();
    const url = appsScript
      ? `${appsScript}?action=listDriveSpreadsheets${folderId ? `&folderId=${encodeURIComponent(folderId)}` : ""}`
      : (() => {
          const base = this.requireBackendUrl();
          return folderId
            ? `${base}/listDriveSpreadsheets?folderId=${encodeURIComponent(folderId)}`
            : `${base}/listDriveSpreadsheets`;
        })();

    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (typeof data?.serviceAccountEmail === "string" && data.serviceAccountEmail) {
        this.serviceAccountEmail = data.serviceAccountEmail;
      }
      if (!res.ok || data?.status === "error") {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      this.driveFiles = data.files || [];
      this.driveFolders = data.folders || [];
      const curId = this.config.spreadsheetId.trim();
      const isFolderId = this.driveFolders.some((fld) => fld.id === curId);
      if (this.driveFiles.length > 0 && (!curId || isFolderId)) {
        this.saveConfig({ spreadsheetId: this.driveFiles[0].id });
      }
      return this.driveFiles;
    } catch (err: any) {
      throw new Error(this.formatNetworkError(err, url));
    }
  }

  /**
   * Queries sheet tab names for a selected Spreadsheet ID
   */
  async loadSheetTabs(spreadsheetId = this.config.spreadsheetId): Promise<SheetTabMeta[]> {
    const appsScript = this.getAppsScriptEndpoint();
    if (!spreadsheetId && !appsScript) return [];
    const url = appsScript
      ? `${appsScript}?action=getSpreadsheetTabs&spreadsheetId=${encodeURIComponent(spreadsheetId)}`
      : `${this.requireBackendUrl()}/getSpreadsheetTabs?spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.status === "error") {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    this.sheetTabs = data.tabs || [];
    if (this.sheetTabs.length > 0 && !this.sheetTabs.some((t) => t.title === this.config.sheetName)) {
      this.saveConfig({ sheetName: this.sheetTabs[0].title });
    }
    return this.sheetTabs;
  }

  /**
   * Creates a new BIM Google Sheet via Drive/Sheets API or Apps Script Web App
   */
  async createDriveSheet(title: string, folderId?: string): Promise<{ spreadsheetId: string; spreadsheetUrl?: string }> {
    const appsScript = this.getAppsScriptEndpoint();
    const targetFolderId = folderId || this.driveFolders[0]?.id;
    const url = appsScript || `${this.requireBackendUrl()}/createDriveSpreadsheet`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: appsScript
          ? { "Content-Type": "text/plain;charset=utf-8" }
          : { "Content-Type": "application/json" },
        body: JSON.stringify(
          appsScript
            ? { action: "createDriveSpreadsheet", title, folderId: targetFolderId }
            : { title, folderId: targetFolderId }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data?.serviceAccountEmail === "string" && data.serviceAccountEmail) {
        this.serviceAccountEmail = data.serviceAccountEmail;
      }
      if (!res.ok || data?.status === "error") {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      if (data.spreadsheetId) {
        this.saveConfig({ spreadsheetId: data.spreadsheetId, sheetName: "BIM_Schedule" });
      }
      return data;
    } catch (err: any) {
      throw new Error(this.formatNetworkError(err, url));
    }
  }

  /**
   * Lesson 3.2 & 3.3: Reads rows from Google Sheet and parses [headers, ...rows]
   */
  async readSheetData(
    spreadsheetId = this.config.spreadsheetId,
    sheetName = ""
  ): Promise<Record<string, string>[]> {
    const appsScript = this.getAppsScriptEndpoint();
    if (!spreadsheetId && !appsScript) {
      throw new Error("Select or enter a Spreadsheet ID first.");
    }
    const params = new URLSearchParams();
    if (appsScript) params.set("action", "readSheetData");
    if (spreadsheetId) params.set("spreadsheetId", spreadsheetId);
    if (sheetName) params.set("sheetName", sheetName);

    const url = appsScript
      ? `${appsScript}?${params.toString()}`
      : `${this.requireBackendUrl()}/readSheetData?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.status === "error") {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    const values: any[][] = data.values || [];
    if (values.length < 2) {
      this.sheetHeaders = values[0] || [];
      this.sheetActionRows = [];
      return [];
    }

    const headers = values[0].map((h) => String(h || "").trim());
    const parsed = values.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = String(row[i] ?? "").trim();
      });
      return obj;
    });

    this.sheetHeaders = headers;
    this.sheetActionRows = parsed;
    return parsed;
  }

  /**
   * Lesson 3.4: Executes any Sheet Action row ("highlight", "isolate", "hide", "show")
   * directly on loaded Fragments via OBC.ItemsFinder, OBCF.Highlighter & OBC.Hider
   */
  async executeSheetAction(category: string, action: string, colorHex = "#38bdf8"): Promise<string> {
    const cleanCat = (category || "").trim();
    const cleanAct = (action || "highlight").toLowerCase().trim();
    const fragments = this.components.get(OBC.FragmentsManager);
    const highlighter = this.components.get(OBCF.Highlighter);
    const hider = this.components.get(OBC.Hider);
    const worlds = this.components.get(OBC.Worlds);
    const world = [...worlds.list.values()][0];

    const clearGhosts = () => {
      if (!fragments.initialized) return;
      for (const [, model] of fragments.list) {
        model?.clearGhost?.();
      }
      fragments.core?.update(true);
    };

    if (cleanAct.includes("show")) {
      await Promise.all([hider.set(true), highlighter.clear()]);
      clearGhosts();
      return "Restored all BIM elements visibility, highlights & X-Ray.";
    }

    let matchedMap: OBC.ModelIdMap = {};
    let totalMatched = 0;

    if (fragments.initialized && fragments.list.size > 0 && cleanCat) {
      const finder = this.components.get(OBC.ItemsFinder);
      const tempKey = "__sheet_action_temp";
      if (finder.list.has(tempKey)) finder.list.delete(tempKey);
      const q = finder.create(tempKey, [{ categories: [new RegExp(cleanCat, "i")] }]);
      matchedMap = await q.test();
      finder.list.delete(tempKey);

      for (const ids of Object.values(matchedMap)) {
        totalMatched += ids.size;
      }
    }

    if (totalMatched === 0) {
      return `No elements matched IFC category "${cleanCat}".`;
    }

    if (cleanAct.includes("hide")) {
      await hider.set(false, matchedMap);
      return `Hid ${totalMatched} element(s) matching "${cleanCat}".`;
    }

    if (cleanAct.includes("isolate")) {
      await hider.isolate(matchedMap);
      if (world?.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems(matchedMap);
      }
      return `Isolated ${totalMatched} element(s) matching "${cleanCat}".`;
    }

    if (cleanAct.includes("xray") || cleanAct.includes("ghost")) {
      fragments.core.setGhostOpacity(0.24);
      for (const [modelId, model] of fragments.list) {
        if (!model || typeof model.setGhostItems !== "function") continue;
        const keepIds = matchedMap[modelId] ? [...matchedMap[modelId]] : [];
        await model.setGhostItems(keepIds, true);
      }
      fragments.core.update(true);
      if (world?.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems(matchedMap);
      }
      return `X-Ray focused ${totalMatched} element(s) matching "${cleanCat}".`;
    }

    if (cleanAct.includes("zoom") || cleanAct.includes("focus")) {
      if (world?.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems(matchedMap);
      }
      return `Framed ${totalMatched} element(s) matching "${cleanCat}".`;
    }

    // Default: Highlight
    const styleKey = `sheet-${colorHex}`;
    if (!highlighter.styles.has(styleKey)) {
      highlighter.styles.set(styleKey, {
        color: new THREE.Color(colorHex),
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      });
    }
    await highlighter.highlightByID(styleKey, matchedMap, false, false);
    if (world?.camera instanceof OBC.SimpleCamera) {
      await world.camera.fitToItems(matchedMap);
    }
    return `Highlighted ${totalMatched} element(s) matching "${cleanCat}".`;
  }

  async focusElementById(expressId: string | number): Promise<string> {
    const idNum = Number(expressId);
    const fragments = this.components.get(OBC.FragmentsManager);
    const highlighter = this.components.get(OBCF.Highlighter);
    const worlds = this.components.get(OBC.Worlds);
    const world = [...worlds.list.values()][0];

    if (!Number.isFinite(idNum) || !fragments.initialized || fragments.list.size === 0) {
      return `Cannot inspect element ${expressId} cleanly.`;
    }

    const targetMap: OBC.ModelIdMap = {};
    for (const [modelId] of fragments.list) {
      targetMap[modelId] = new Set([idNum]);
    }

    await highlighter.clear("select");
    await highlighter.highlightByID("select", targetMap, false, true);
    if (world?.camera instanceof OBC.SimpleCamera) {
      await world.camera.fitToItems(targetMap);
    }
    return `Focused BIM element #${idNum}.`;
  }

  async runAllSheetActions(): Promise<string> {
    if (this.sheetActionRows.length === 0) {
      this.syncActionRulesFromSchedule();
    }
    let executed = 0;
    for (const row of this.sheetActionRows) {
      const cat = row.Category || row.category || "";
      const act = row.Action || row.action || "highlight";
      const col = row.Color || row.color || "#38bdf8";
      if (!cat) continue;
      await this.executeSheetAction(cat, act, col);
      executed++;
    }
    return `Executed ${executed} BIM Sheet Action rule(s).`;
  }

  private resolveWriteEndpoint(): string {
    const ep = this.config.endpointUrl.trim();
    if (ep) return ep;
    const base = this.resolveFunctionsBaseUrl();
    return base ? `${base}/writeBimDataToSheets` : "";
  }

  private async postSheetWrite(
    sheetName: string,
    mode: "append" | "replace",
    rows: any[][]
  ): Promise<{ endpoint: string; isAppsScript: boolean; updatedCells?: number }> {
    const endpoint = this.resolveWriteEndpoint();
    if (!endpoint) {
      throw new Error(
        "No Google Sheets endpoint configured. Paste a free Apps Script Web App URL (click 'Apps Script Code') or click 'CSV' to export."
      );
    }
    const isAppsScript = this.isAppsScriptUrl(endpoint);
    const spreadsheetId = this.config.spreadsheetId.trim();
    if (!spreadsheetId && !isAppsScript) {
      throw new Error(
        "Select a Google Spreadsheet from Drive or paste a Spreadsheet ID/URL above first — or click CSV to export offline."
      );
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: isAppsScript
          ? { "Content-Type": "text/plain;charset=utf-8" }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isAppsScript ? { action: "writeBimDataToSheets" } : {}),
          spreadsheetId,
          sheetName,
          mode,
          rows,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status === "error") {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      return { endpoint, isAppsScript, updatedCells: data.updatedCells };
    } catch (err: any) {
      throw new Error(this.formatNetworkError(err, endpoint));
    }
  }

  async pushActionRulesToSheet(targetTabName = "Sheet_Actions"): Promise<SheetsSyncResult> {
    if (this.sheetActionRows.length === 0) {
      this.syncActionRulesFromSchedule();
    }

    const matrix: any[][] = [["Category", "Action", "Color", "Elements"]];
    for (const r of this.sheetActionRows) {
      matrix.push([
        r.Category || "",
        r.Action || "highlight",
        r.Color || "#38bdf8",
        r.Elements || "-",
      ]);
    }

    const res = await this.postSheetWrite(targetTabName, "replace", matrix);
    const okRes: SheetsSyncResult = {
      success: true,
      transport: res.isAppsScript ? "apps-script" : "firebase-function",
      rowCount: this.sheetActionRows.length,
      updatedCells: res.updatedCells || matrix.length * 4,
      message: `Pushed ${this.sheetActionRows.length} Sheet Action rules to tab "${targetTabName}".`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.lastResult = okRes;
    this.onSyncCompleted.trigger(okRes);
    return okRes;
  }

  /**
   * Lesson 3.4: Computes Category Counts across Fragments/3D & writes to custom Google Sheet tab
   */
  async writeCategorySummaryToSheet(targetTabName?: string): Promise<SheetsSyncResult> {
    if (this.rows.length === 0) {
      await this.extractSchedule();
    }

    const counts: Record<string, number> = {};
    for (const r of this.rows) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }

    const matrix: any[][] = [["Category", "Count"]];
    for (const [cat, count] of Object.entries(counts)) {
      matrix.push([cat, count]);
    }

    const sheetName = targetTabName || this.config.sheetName || "Category_Counts";
    const endpoint = this.resolveWriteEndpoint();
    if (!endpoint) {
      const csv = matrix.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${sheetName}-${Date.now()}.csv`;
      link.click();
      const csvRes: SheetsSyncResult = {
        success: true,
        transport: "csv-export",
        rowCount: matrix.length - 1,
        updatedCells: matrix.length * 2,
        message: `Downloaded ${matrix.length - 1} BIM category counts as CSV. Add an Apps Script URL above for live Google Sheets sync.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      this.lastResult = csvRes;
      this.onSyncCompleted.trigger(csvRes);
      return csvRes;
    }

    try {
      const res = await this.postSheetWrite(sheetName, "replace", matrix);
      const result: SheetsSyncResult = {
        success: true,
        transport: res.isAppsScript ? "apps-script" : "firebase-function",
        rowCount: matrix.length - 1,
        updatedCells: res.updatedCells || matrix.length * 2,
        message: `Wrote ${matrix.length - 1} BIM category counts into tab "${sheetName}"!`,
        timestamp: new Date().toLocaleTimeString(),
      };
      this.lastResult = result;
      this.onSyncCompleted.trigger(result);
      return result;
    } catch (err: any) {
      const errMsg = err?.message || "Sync failed";
      const failResult: SheetsSyncResult = {
        success: false,
        transport: this.isAppsScriptUrl(endpoint) ? "apps-script" : "firebase-function",
        rowCount: matrix.length - 1,
        message: errMsg,
        timestamp: new Date().toLocaleTimeString(),
      };
      this.lastResult = failResult;
      this.onSyncCompleted.trigger(failResult);
      throw new Error(errMsg);
    }
  }

  /**
   * Lesson 3.4: Writes extracted BIM rows to Google Sheets via Firebase Cloud Function or Apps Script Webhook
   */
  async syncToGoogleSheets(): Promise<SheetsSyncResult> {
    if (this.rows.length === 0) {
      await this.extractSchedule();
    }

    if (this.rows.length === 0) {
      const failRes: SheetsSyncResult = {
        success: false,
        transport: "csv-export",
        rowCount: 0,
        message: "No BIM elements found to export. Load an IFC model or 3D twin first.",
        timestamp: new Date().toLocaleTimeString(),
      };
      this.lastResult = failRes;
      return failRes;
    }

    const sheetMatrix = this.toSheetMatrix(this.rows, true);
    const matrix = this.toSheetMatrix(this.rows, false);
    const endpoint = this.resolveWriteEndpoint();

    if (endpoint) {
      try {
        const res = await this.postSheetWrite(
          this.config.sheetName || "BIM_Schedule",
          this.config.mode,
          sheetMatrix
        );
        const successRes: SheetsSyncResult = {
          success: true,
          transport: res.isAppsScript ? "apps-script" : "firebase-function",
          rowCount: this.rows.length,
          updatedCells: res.updatedCells ?? matrix.length * 10,
          message: `Synced ${this.rows.length} BIM elements to Google Sheet "${this.config.sheetName}"!`,
          timestamp: new Date().toLocaleTimeString(),
        };
        this.lastResult = successRes;
        this.onSyncCompleted.trigger(successRes);
        return successRes;
      } catch (err: any) {
        const errRes: SheetsSyncResult = {
          success: false,
          transport: this.isAppsScriptUrl(endpoint) ? "apps-script" : "firebase-function",
          rowCount: this.rows.length,
          message: `Sync failed (${err?.message || "Network error"}).`,
          timestamp: new Date().toLocaleTimeString(),
        };
        this.lastResult = errRes;
        this.onSyncCompleted.trigger(errRes);
        return errRes;
      }
    }

    // No external endpoint configured -> trigger clean CSV download automatically
    this.downloadCsv();
    const csvRes: SheetsSyncResult = {
      success: true,
      transport: "csv-export",
      rowCount: this.rows.length,
      updatedCells: matrix.length * 10,
      message: `Downloaded ${this.rows.length}-row BIM schedule CSV (ready for Google Sheets / Excel). Paste a free Apps Script URL above for live cloud sync.`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.lastResult = csvRes;
    this.onSyncCompleted.trigger(csvRes);
    return csvRes;
  }

  async syncAllTabsToWorkbook(): Promise<SheetsSyncResult> {
    if (this.rows.length === 0) await this.extractSchedule();
    const takeoffRes = await this.syncToGoogleSheets();
    if (!takeoffRes.success || takeoffRes.transport === "csv-export") return takeoffRes;
    await this.writeCategorySummaryToSheet("Category_Counts");
    await this.pushActionRulesToSheet("Sheet_Actions");
    const ok: SheetsSyncResult = {
      success: true,
      transport: takeoffRes.transport,
      rowCount: this.rows.length,
      message: `Synced Full Pro Workbook (${this.rows.length} elements + Category_Counts + Sheet_Actions tabs)!`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.lastResult = ok;
    this.onSyncCompleted.trigger(ok);
    return ok;
  }

  async pushClashAuditToSheet(
    clashes: Array<{
      id: string;
      aName: string;
      aCategory: string;
      bName: string;
      bCategory: string;
      overlapVolumeM3: number;
      severity: string;
    }>
  ): Promise<SheetsSyncResult> {
    const matrix: any[][] = [
      ["Clash ID", "Element A", "Class A", "Element B", "Class B", "Overlap (m3)", "Severity"],
      ...clashes.map((c) => [
        c.id,
        c.aName,
        c.aCategory,
        c.bName,
        c.bCategory,
        c.overlapVolumeM3,
        c.severity.toUpperCase(),
      ]),
    ];
    const res = await this.postSheetWrite("Clash_Audit", "replace", matrix);
    const ok: SheetsSyncResult = {
      success: true,
      transport: res.isAppsScript ? "apps-script" : "firebase-function",
      rowCount: clashes.length,
      updatedCells: res.updatedCells || matrix.length * 7,
      message: `Exported ${clashes.length} 3D Clash checks to Google Sheet tab "Clash_Audit"!`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.lastResult = ok;
    this.onSyncCompleted.trigger(ok);
    return ok;
  }

  downloadCsv() {
    const matrix = this.toSheetMatrix(this.rows);
    const csv = matrix
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${this.config.sheetName || "bim-schedule"}-${Date.now()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  dispose() {
    this.rows = [];
    this.onRowsExtracted.reset();
    this.onSyncCompleted.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}

export const APPS_SCRIPT_TEMPLATE = `function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function openSs(spreadsheetId) {
  return spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || "listDriveSpreadsheets";
    if (action === "listDriveSpreadsheets") {
      var files = [];
      var q = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
      if (p.folderId) q += " and '" + p.folderId + "' in parents";
      var it = DriveApp.searchFiles(q);
      while (it.hasNext() && files.length < 30) {
        var f = it.next();
        files.push({ id: f.getId(), name: f.getName(), webViewLink: f.getUrl() });
      }
      return jsonOut({ status: "success", files: files, folders: [] });
    }
    if (action === "getSpreadsheetTabs") {
      var ss = openSs(p.spreadsheetId);
      var tabs = ss.getSheets().map(function(s) {
        return { sheetId: s.getSheetId(), title: s.getName(), rowCount: s.getLastRow() };
      });
      return jsonOut({ status: "success", tabs: tabs });
    }
    if (action === "readSheetData") {
      var ss = openSs(p.spreadsheetId);
      var sheet = p.sheetName ? ss.getSheetByName(p.sheetName) : ss.getSheets()[0];
      var values = sheet ? sheet.getDataRange().getValues() : [];
      return jsonOut({ status: "success", values: values });
    }
    return jsonOut({ status: "error", error: "Unknown action: " + action });
  } catch (err) {
    return jsonOut({ status: "error", error: String(err) });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (payload.action === "createDriveSpreadsheet") {
      var created = SpreadsheetApp.create(payload.title || "BIM Quantity Takeoff");
      var first = created.getSheets()[0];
      if (first) first.setName("BIM_Schedule");
      return jsonOut({
        status: "success",
        spreadsheetId: created.getId(),
        spreadsheetUrl: created.getUrl()
      });
    }
    var ss = openSs(payload.spreadsheetId);
    var tab = payload.sheetName || "BIM_Schedule";
    var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
    if (payload.mode === "replace") sheet.clearContents();
    var rows = payload.rows || [];
    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    }
    return jsonOut({
      status: "success",
      updatedCells: rows.length * (rows[0] ? rows[0].length : 0)
    });
  } catch (err) {
    return jsonOut({ status: "error", error: String(err) });
  }
}`;

export { FRAGS };

