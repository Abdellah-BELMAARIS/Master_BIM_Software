import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { GISLayers } from "../../GisLayers";
import { SheetsSync } from "../../SheetsSync";
import { unwrapIfcAttr } from "../../DataEnhancer";

export interface McpToolSpec {
  name: string;
  description: string;
  parameters: string[];
}

export interface McpExecutionLog {
  id: string;
  timestamp: string;
  source: "local-copilot" | "claude-mcp-ws";
  prompt?: string;
  tool: string;
  args: Record<string, any>;
  status: "success" | "error";
  summary: string;
  data?: any;
  durationMs: number;
}

export interface McpChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  tool?: string;
  status?: "success" | "error" | "info";
  durationMs?: number;
  quickActions?: { label: string; prompt: string }[];
}

export const MCP_BIM_TOOLS: McpToolSpec[] = [
  {
    name: "load_bim_model",
    description: "Stream a local .frag or .ifc file ArrayBuffer over WebSocket directly into the BIM viewer",
    parameters: ["filePath"],
  },
  {
    name: "get_model_id_map",
    description: "Query matching elements by IFC category/name and cache their ModelIdMap in MCP memory",
    parameters: ["category"],
  },
  {
    name: "highlight_by_model_id_map",
    description: "Highlight cached ModelIdMap elements with custom colorHex & removePrev flag",
    parameters: ["colorHex", "removePrev"],
  },
  {
    name: "get_model_summary",
    description: "Inspect loaded IFC/Fragment models, element counts, and scene metadata",
    parameters: [],
  },
  {
    name: "highlight_category",
    description: "Find and color-highlight IFC elements matching category regex",
    parameters: ["category", "colorHex"],
  },
  {
    name: "isolate_category",
    description: "Isolate BIM elements by IFC class or name pattern using OBC.Hider",
    parameters: ["category"],
  },
  {
    name: "hide_category",
    description: "Hide BIM elements matching an IFC class or element name pattern",
    parameters: ["category"],
  },
  {
    name: "calculate_quantity_takeoff",
    description: "Aggregate count, total area (m2), volume (m3), and cost by category",
    parameters: ["category"],
  },
  {
    name: "create_section_cut",
    description: "Slice building geometry along axis x, y, or z via OBC.Clipper",
    parameters: ["axis"],
  },
  {
    name: "sync_gis_location",
    description: "Fly 3D Cesium tiles & 2D radar to target geospatial coordinates",
    parameters: ["latitude", "longitude", "city"],
  },
  {
    name: "reset_viewer_state",
    description: "Clear highlights, restore hidden elements, delete cuts & fit camera",
    parameters: [],
  },
];

const COLOR_ALIASES: { regex: RegExp; hex: string; label: string }[] = [
  { regex: /\b(gree+n?|gren|grn|emerald|lime|mint)\b/i, hex: "#10b981", label: "Green" },
  { regex: /\b(blu+e?|azure|navy|cobalt)\b/i, hex: "#3b82f6", label: "Blue" },
  { regex: /\b(cya+n?|aqua|teal|turq)\b/i, hex: "#06b6d4", label: "Cyan" },
  { regex: /\b(re+d|crimson|scarlet|ruby)\b/i, hex: "#ef4444", label: "Red" },
  { regex: /\b(yel+o?w?|gold)\b/i, hex: "#eab308", label: "Yellow" },
  { regex: /\b(ora+n?g?e?|amber)\b/i, hex: "#f97316", label: "Orange" },
  { regex: /\b(purp+l?e?|violet|magenta)\b/i, hex: "#a855f7", label: "Purple" },
  { regex: /\b(pin+k?|rose)\b/i, hex: "#ec4899", label: "Pink" },
  { regex: /\b(whi+t?e?|silver|gray|grey)\b/i, hex: "#f8fafc", label: "White" },
];

const STOP_WORDS = new Set([
  "collor", "color", "colour", "paint", "tint", "highlight", "mark", "show", "find",
  "select", "locate", "zoom", "focus", "frame", "isolate", "only", "hide", "invisible",
  "remove", "all", "the", "with", "in", "into", "to", "of", "on", "for", "from", "by",
  "please", "can", "you", "me", "my", "a", "an", "and", "or", "element", "elements",
  "items", "item", "part", "parts", "object", "objects", "them", "these", "those", "it",
  "make", "turn", "set", "change", "get", "give", "list", "tell", "full", "model",
  "summary", "overview", "stats", "project", "this", "that", "about",
]);

const CITY_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  london: { lat: 51.5007, lon: -0.1246, label: "London Westminster" },
  paris: { lat: 48.8584, lon: 2.2945, label: "Paris Eiffel" },
  "new york": { lat: 40.7128, lon: -74.006, label: "New York Manhattan" },
  manhattan: { lat: 40.7128, lon: -74.006, label: "New York Manhattan" },
  dubai: { lat: 25.1972, lon: 55.2744, label: "Dubai Burj Khalifa" },
  tokyo: { lat: 35.6586, lon: 139.7454, label: "Tokyo Tower" },
};

/**
 * Module 5 — Section 4 (Lessons 4.1 – 4.3): McpAgent Component
 * Native OBC.Component bridging MCP JSON-RPC tool calls and Natural Language
 * BIM commands directly to That Open Engine (ItemsFinder, Highlighter, Hider,
 * Clipper, SheetsSync, and Cesium GISLayers).
 */
export class McpAgent extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "b4a8c321-7d5e-4e92-a311-5c9b04a1f022";
  enabled = true;

  readonly onLogAdded = new OBC.Event<McpExecutionLog>();
  readonly onChatUpdated = new OBC.Event<void>();
  readonly onModelLoaded = new OBC.Event<string>();
  readonly onBridgeStatusChanged = new OBC.Event<"disconnected" | "connecting" | "connected">();
  readonly onDisposed = new OBC.Event<void>();

  logs: McpExecutionLog[] = [];
  chatMessages: McpChatMessage[] = [
    {
      id: "welcome-1",
      role: "assistant",
      timestamp: new Date().toLocaleTimeString(),
      status: "info",
      text: "Hi! I'm your BIM AI Copilot. Ask me naturally to color, find, isolate, hide, section, or quantify any elements — e.g. \"Color all the pool green\", \"Isolate Villa 01\", or \"Volume of slabs\".",
      quickActions: [
        { label: "Model Summary", prompt: "Get full model summary" },
        { label: "Highlight Walls", prompt: "Highlight walls in cyan" },
        { label: "Section Plan", prompt: "Cut floor plan section" },
      ],
    },
  ];
  bridgeStatus: "disconnected" | "connecting" | "connected" = "disconnected";
  wsUrl = "ws://localhost:3001";
  isGisAllowed = true;
  private lastMatchedMap: OBC.ModelIdMap = {};
  private lastTargetLabel = "";
  private _ws: WebSocket | null = null;

  constructor(components: OBC.Components) {
    super(components);
    components.add(McpAgent.uuid, this);
  }

  private getFirstWorld(): OBC.World | null {
    const worlds = this.components.get(OBC.Worlds);
    return [...worlds.list.values()][0] || null;
  }

  private async loadBinaryModelBuffer(bytes: Uint8Array, fileName: string): Promise<string> {
    const fragments = this.components.get(OBC.FragmentsManager);
    if (!fragments.initialized) {
      try {
        const workerUrl = await OBC.FragmentsManager.getWorker();
        fragments.init(workerUrl);
      } catch {
        fragments.init("");
      }
    }
    const world = this.getFirstWorld();
    const header = new TextDecoder("latin1")
      .decode(bytes.subarray(0, Math.min(bytes.length, 256)))
      .trimStart()
      .toLowerCase();
    const modelId = fileName.replace(/\.(frag|ifc)$/i, "") || `mcp-model-${Date.now()}`;

    let loadedModel: any = null;
    if (header.includes("iso-10303-21")) {
      const ifcLoader = this.components.get(OBC.IfcLoader);
      await ifcLoader.setup({ autoSetWasm: false });
      ifcLoader.settings.wasm = { path: "/", absolute: true };
      loadedModel = await ifcLoader.load(bytes, true, modelId);
    } else {
      loadedModel = await fragments.core.load(bytes, {
        modelId,
        camera: (world?.camera?.three as any) ?? undefined,
      });
    }

    if (loadedModel?.object && world) {
      if (typeof loadedModel.useCamera === "function" && world.camera?.three) {
        loadedModel.useCamera(world.camera.three as any);
      }
      if (loadedModel.object.parent !== world.scene.three) {
        world.scene.three.add(loadedModel.object);
      }
      fragments.core.update(true);
      if (world.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems();
      }
    }
    this.onModelLoaded.trigger(fileName);
    return `Streamed & loaded "${fileName}" (${(bytes.byteLength / 1024).toFixed(1)} KB) into 3D BIM World.`;
  }

  connectBridge(url = this.wsUrl) {
    this.wsUrl = url;
    this.disconnectBridge();
    this.bridgeStatus = "connecting";
    this.onBridgeStatusChanged.trigger("connecting");

    try {
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      this._ws = ws;

      ws.onopen = () => {
        this.bridgeStatus = "connected";
        this.onBridgeStatusChanged.trigger("connected");
      };

      ws.onmessage = async (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            const loadedMsg = await this.loadBinaryModelBuffer(
              new Uint8Array(event.data),
              `claude-model-${Date.now()}`
            );
            this.pushChatMessage({
              id: `ws-bin-${Date.now()}`,
              role: "assistant",
              text: loadedMsg,
              timestamp: new Date().toLocaleTimeString(),
              tool: "load_bim_model",
              status: "success",
            });
            return;
          }

          const msg = JSON.parse(event.data);
          if (msg.tool) {
            const log = await this.executeTool(
              msg.tool,
              msg.args || {},
              "claude-mcp-ws"
            );
            this.pushChatMessage({
              id: `ws-tool-${Date.now()}`,
              role: "assistant",
              text: `[Claude MCP] ${log.summary}`,
              timestamp: log.timestamp,
              tool: log.tool,
              status: log.status,
              durationMs: log.durationMs,
            });
            ws.send(
              JSON.stringify({
                requestId: msg.requestId,
                result: log.status === "success" ? log.data || log.summary : undefined,
                error: log.status === "error" ? log.summary : undefined,
              })
            );
          }
        } catch {}
      };

      ws.onerror = () => {
        this.bridgeStatus = "disconnected";
        this.onBridgeStatusChanged.trigger("disconnected");
      };

      ws.onclose = () => {
        if (this._ws === ws) {
          this.bridgeStatus = "disconnected";
          this.onBridgeStatusChanged.trigger("disconnected");
          this._ws = null;
        }
      };
    } catch {
      this.bridgeStatus = "disconnected";
      this.onBridgeStatusChanged.trigger("disconnected");
    }
  }

  disconnectBridge() {
    if (this._ws) {
      try {
        this._ws.close();
      } catch {}
      this._ws = null;
    }
    this.bridgeStatus = "disconnected";
    this.onBridgeStatusChanged.trigger("disconnected");
  }

  private async findByCategory(categoryPattern: string): Promise<OBC.ModelIdMap> {
    const clean = (categoryPattern || ".+").trim();
    const fragments = this.components.get(OBC.FragmentsManager);
    const finder = this.components.get(OBC.ItemsFinder);

    // 1. Try IFC category match first
    const key = "__mcp_query_temp";
    if (finder.list.has(key)) finder.list.delete(key);
    const catRx = new RegExp(clean, "i");
    const q = finder.create(key, [{ categories: [catRx] }]);
    const catResult = await q.test();
    finder.list.delete(key);

    if (this.countMapItems(catResult) > 0) {
      return catResult;
    }

    // 2. Fallback: Semantic Name / ObjectType / Tag search across all Fragment items
    // Supports queries like "pool", "solar", "pergola", "tree", "villa 01", "boulevard"
    if (fragments.initialized && fragments.list.size > 0 && clean !== ".+") {
      const allKey = "__mcp_all_scan";
      if (finder.list.has(allKey)) finder.list.delete(allKey);
      const allQuery = finder.create(allKey, [{ categories: [/.+/] }]);
      const allMap = await allQuery.test();
      finder.list.delete(allKey);

      if (!OBC.ModelIdMapUtils.isEmpty(allMap)) {
        const cappedMap: OBC.ModelIdMap = {};
        for (const [mId, ids] of Object.entries(allMap)) {
          cappedMap[mId] = new Set([...ids].slice(0, 1500));
        }

        const rawByModel = await fragments.getData(cappedMap, {
          attributesDefault: true,
        });

        // Singularize simple plurals & handle OR tokens cleanly
        const tokens = clean
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
        const nameRx = new RegExp(tokens.join("|") || clean, "i");

        const matchedMap: OBC.ModelIdMap = {};
        for (const [modelId, itemsData] of Object.entries(rawByModel)) {
          const hitSet = new Set<number>();
          for (const item of itemsData) {
            const localId = Number(unwrapIfcAttr((item as any)._localId));
            if (!Number.isFinite(localId)) continue;
            const hay = [
              unwrapIfcAttr((item as any).Name),
              unwrapIfcAttr((item as any).ObjectType),
              unwrapIfcAttr((item as any).Tag),
              unwrapIfcAttr((item as any)._category),
            ]
              .filter(Boolean)
              .join(" ");
            if (nameRx.test(hay)) {
              hitSet.add(localId);
            }
          }
          if (hitSet.size > 0) {
            matchedMap[modelId] = hitSet;
          }
        }
        if (this.countMapItems(matchedMap) > 0) {
          return matchedMap;
        }
      }
    }

    return catResult;
  }

  private countMapItems(map: OBC.ModelIdMap): number {
    let total = 0;
    for (const ids of Object.values(map)) {
      total += ids.size;
    }
    return total;
  }

  clearChat() {
    this.chatMessages = [
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        timestamp: new Date().toLocaleTimeString(),
        status: "info",
        text: "Chat cleared. Ask me to color, isolate, hide, cut sections, or inspect quantities across your BIM model.",
        quickActions: [
          { label: "Model Summary", prompt: "Get full model summary" },
          { label: "Highlight Walls", prompt: "Highlight walls in cyan" },
        ],
      },
    ];
    this.onChatUpdated.trigger();
  }

  /**
   * Executes a single structured MCP Tool against the live BIM engine
   */
  async executeTool(
    tool: string,
    args: Record<string, any> = {},
    source: "local-copilot" | "claude-mcp-ws" = "local-copilot",
    prompt?: string
  ): Promise<McpExecutionLog> {
    const t0 = performance.now();
    let status: "success" | "error" = "success";
    let summary = "";
    let data: any = null;

    try {
      const fragments = this.components.get(OBC.FragmentsManager);
      const highlighter = this.components.get(OBCF.Highlighter);
      const hider = this.components.get(OBC.Hider);
      const world = this.getFirstWorld();

      switch (tool) {
        case "load_binary_model_base64": {
          const b64 = String(args.base64 || "");
          const fileName = String(args.fileName || `claude-streamed-${Date.now()}.frag`);
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          summary = await this.loadBinaryModelBuffer(bytes, fileName);
          data = { fileName, byteLength: bytes.byteLength };
          break;
        }

        case "get_model_id_map": {
          const category = String(args.category || "WALL");
          const map = await this.findByCategory(category);
          this.lastMatchedMap = map;
          this.lastTargetLabel = category;
          const serializable: Record<string, number[]> = {};
          let count = 0;
          for (const [mId, idSet] of Object.entries(map)) {
            serializable[mId] = [...idSet];
            count += idSet.size;
          }
          data = { category, count, modelIdMap: serializable };
          summary = `Built ModelIdMap for "${category}": ${count} element(s) across ${Object.keys(serializable).length} model(s).`;
          break;
        }

        case "highlight_by_model_id_map": {
          const colorHex = String(args.colorHex || "#38bdf8");
          const removePrev = Boolean(args.removePrev ?? false);
          const rawMap = args.modelIdMap as Record<string, number[] | Set<number>> | undefined;
          let targetMap: OBC.ModelIdMap = this.lastMatchedMap;
          if (rawMap && typeof rawMap === "object") {
            targetMap = {};
            for (const [mId, ids] of Object.entries(rawMap)) {
              targetMap[mId] = ids instanceof Set ? ids : new Set(ids);
            }
          }
          if (removePrev) {
            await highlighter.clear();
          }
          const count = this.countMapItems(targetMap);
          if (count > 0) {
            const styleName = `mcp-${colorHex}`;
            if (!highlighter.styles.has(styleName)) {
              highlighter.styles.set(styleName, {
                color: new THREE.Color(colorHex),
                opacity: 1,
                transparent: false,
                renderedFaces: 0,
              });
            }
            await highlighter.highlightByID(styleName, targetMap, false, false);
            fragments.core.update(true);
            data = { highlightedCount: count, colorHex, removePrev };
            summary = `Highlighted ${count} element(s) in ${colorHex} (removePrev=${removePrev}).`;
          } else {
            summary = "No items in cached ModelIdMap. Run get_model_id_map first.";
          }
          break;
        }

        case "get_model_summary": {
          const models: { id: string; name: string }[] = [];
          if (fragments.initialized) {
            for (const [id, m] of fragments.list) {
              models.push({ id, name: (m as any)?.name || id });
            }
          }
          const finder = this.components.get(OBC.ItemsFinder);
          const categoryBreakdown: Record<string, number> = {};
          for (const [qName, q] of finder.list) {
            try {
              const res = await q.test();
              const cnt = this.countMapItems(res);
              if (cnt > 0) categoryBreakdown[qName] = cnt;
            } catch {}
          }
          const sheets = this.components.get(SheetsSync);
          if (sheets.rows.length === 0) {
            await sheets.extractSchedule();
          }
          data = {
            fragmentModelsCount: models.length,
            models,
            categoryBreakdown,
            extractedScheduleCount: sheets.rows.length,
          };
          summary = `Found ${models.length} Fragment model(s) and ${sheets.rows.length} cataloged BIM elements across ${Object.keys(categoryBreakdown).length} discipline queries.`;
          break;
        }

        case "highlight_category": {
          const category = String(args.category || "WALL");
          const colorHex = String(args.colorHex || "#38bdf8");
          const colorLabel = String(args.colorLabel || colorHex);
          const map = await this.findByCategory(category);
          const count = this.countMapItems(map);

          if (count > 0) {
            this.lastMatchedMap = map;
            this.lastTargetLabel = category;
            const styleName = `mcp-${colorHex}`;
            if (!highlighter.styles.has(styleName)) {
              highlighter.styles.set(styleName, {
                color: new THREE.Color(colorHex),
                opacity: 1,
                transparent: false,
                renderedFaces: 0,
              });
            }
            await highlighter.highlightByID(styleName, map, false, false);
            if (world?.camera instanceof OBC.SimpleCamera) {
              await world.camera.fitToItems(map);
            }
            data = { category, colorHex, matchedCount: count };
            summary = `Highlighted ${count} "${category}" element(s) in ${colorLabel} and framed camera.`;
          } else {
            // Also check Three.js meshes in parametric mode
            let meshMatches = 0;
            const tokens = category
              .toLowerCase()
              .split("|")
              .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
            if (world?.scene?.three) {
              world.scene.three.traverse((obj) => {
                if (obj instanceof THREE.Mesh && !obj.name.includes("grid")) {
                  const lowName = obj.name.toLowerCase();
                  if (category === ".+" || tokens.some((t) => t && lowName.includes(t))) {
                    const mat = obj.material as THREE.MeshStandardMaterial;
                    if (mat?.color) {
                      mat.emissive?.set(colorHex);
                      mat.emissiveIntensity = 0.5;
                      meshMatches++;
                    }
                  }
                }
              });
            }
            data = { category, colorHex, matchedCount: meshMatches };
            summary =
              meshMatches > 0
                ? `Highlighted ${meshMatches} 3D twin component(s) matching "${category}" in ${colorLabel}.`
                : `I couldn't find any BIM elements matching "${category}". Try terms like "wall", "slab", "pool", "roof", "column", or "door".`;
          }
          break;
        }

        case "isolate_category": {
          const category = String(args.category || "WALL");
          const usePrevious = category === "__LAST__" && this.countMapItems(this.lastMatchedMap) > 0;
          const map = usePrevious ? this.lastMatchedMap : await this.findByCategory(category);
          const label = usePrevious ? this.lastTargetLabel : category;
          const count = this.countMapItems(map);

          if (count > 0) {
            this.lastMatchedMap = map;
            this.lastTargetLabel = label;
            await hider.isolate(map);
            if (world?.camera instanceof OBC.SimpleCamera) {
              await world.camera.fitToItems(map);
            }
            data = { category: label, isolatedCount: count };
            summary = `Isolated ${count} "${label}" element(s) and hid everything else.`;
          } else {
            summary = `No BIM items matched "${label}" for isolation.`;
          }
          break;
        }

        case "hide_category": {
          const category = String(args.category || "WALL");
          const usePrevious = category === "__LAST__" && this.countMapItems(this.lastMatchedMap) > 0;
          const map = usePrevious ? this.lastMatchedMap : await this.findByCategory(category);
          const label = usePrevious ? this.lastTargetLabel : category;
          const count = this.countMapItems(map);

          if (count > 0) {
            this.lastMatchedMap = map;
            this.lastTargetLabel = label;
            await hider.set(false, map);
            data = { category: label, hiddenCount: count };
            summary = `Hid ${count} "${label}" element(s) from the viewport.`;
          } else {
            summary = `No BIM items matched "${label}" to hide.`;
          }
          break;
        }

        case "calculate_quantity_takeoff": {
          const category = String(args.category || "");
          const sheets = this.components.get(SheetsSync);
          const rows = await sheets.extractSchedule(category ? [category] : undefined);
          const totalArea = rows.reduce((acc, r) => acc + r.areaM2, 0);
          const totalVol = rows.reduce((acc, r) => acc + r.volumeM3, 0);
          const totalCost = rows.reduce((acc, r) => acc + r.estimatedCostUsd, 0);
          data = {
            category: category || "ALL",
            count: rows.length,
            totalAreaM2: Number(totalArea.toFixed(2)),
            totalVolumeM3: Number(totalVol.toFixed(2)),
            totalEstimatedCostUsd: totalCost,
          };
          summary = `Takeoff (${category || "All"}): ${rows.length} items · Area: ${totalArea.toFixed(1)} m² · Volume: ${totalVol.toFixed(1)} m³ · Est. Cost: $${totalCost.toLocaleString()}`;
          break;
        }

        case "create_section_cut": {
          const axis = (args.axis as "x" | "y" | "z") || "z";
          const clipper = this.components.get(OBC.Clipper);
          clipper.enabled = true;
          if (world) {
            const normal =
              axis === "z"
                ? new THREE.Vector3(0, -1, 0)
                : axis === "x"
                ? new THREE.Vector3(-1, 0, 0)
                : new THREE.Vector3(0, 0, -1);
            const point = new THREE.Vector3(0, axis === "z" ? 2.5 : 0, 0);
            clipper.createFromNormalAndCoplanarPoint(world, normal, point);
          }
          data = { axis, activePlanes: clipper.list.size };
          summary = `Created ${axis.toUpperCase()}-axis architectural section cut (Total planes: ${clipper.list.size}).`;
          break;
        }

        case "sync_gis_location": {
          if (!this.isGisAllowed) {
            status = "error";
            summary =
              "GIS is disabled in projects that already have an IFC or 3D model. Open an Empty Project to use 2D/3D GIS.";
            break;
          }
          const gis = this.components.get(GISLayers);
          const lat = Number(args.latitude ?? 51.5007);
          const lon = Number(args.longitude ?? -0.1246);
          gis.layer3d.enabled = true;
          gis.setLocation(lat, lon, 0);
          gis.layer3d.focusTerrain("iso");
          data = { latitude: lat, longitude: lon, city: args.city || "Custom" };
          summary = `Activated Cesium 3D Tiles & synced 2D/3D GIS environment to ${lat.toFixed(4)}°, ${lon.toFixed(4)}°.`;
          break;
        }

        case "reset_viewer_state": {
          await hider.set(true);
          await highlighter.clear();
          const clipper = this.components.get(OBC.Clipper);
          clipper.deleteAll();
          if (world?.scene?.three) {
            world.scene.three.traverse((obj) => {
              if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
                obj.material.emissiveIntensity = 0;
              }
            });
          }
          data = { reset: true };
          summary = "Restored full model visibility, cleared all AI highlights & section cuts.";
          break;
        }

        default:
          status = "error";
          summary = `Unknown MCP tool "${tool}".`;
      }
    } catch (err: any) {
      status = "error";
      summary = err?.message || `Error executing MCP tool "${tool}"`;
    }

    const log: McpExecutionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      source,
      prompt,
      tool,
      args,
      status,
      summary,
      data,
      durationMs: Math.round(performance.now() - t0),
    };

    this.logs = [log, ...this.logs].slice(0, 40);
    this.onLogAdded.trigger(log);
    return log;
  }

  /**
   * Resolves a human color mention (including typos like "gree", "blu", "cya")
   */
  private detectColorFromPrompt(promptLower: string): { hex: string; label: string } {
    for (const alias of COLOR_ALIASES) {
      if (alias.regex.test(promptLower)) {
        return { hex: alias.hex, label: alias.label };
      }
    }
    return { hex: "#38bdf8", label: "Cyan" };
  }

  /**
   * Extracts target element / category pattern from free-form text (categories + element names like "pool", "solar", "pergola")
   */
  private extractTargetFromPrompt(promptLower: string): string {
    const categoryKeywords: [RegExp, string][] = [
      [/\bwalls?\b/, "WALL"],
      [/\b(slabs?|floors?|decks?)\b/, "SLAB"],
      [/\bcolumns?\b/, "COLUMN"],
      [/\bbeams?\b/, "BEAM"],
      [/\bstruct(ural|ure)?\b/, "COLUMN|BEAM|FOOTING"],
      [/\b(windows?|glaz(ing|ed)?|curtain)\b/, "WINDOW|CURTAINWALL"],
      [/\bdoors?\b/, "DOOR"],
      [/\broofs?\b/, "ROOF"],
      [/\b(stairs?|ramps?)\b/, "STAIR|RAMP"],
      [/\b(furniture|chairs?|tables?|desks?|beds?|sofas?)\b/, "FURNISHING|PROXY"],
    ];

    let matchedCat = "";
    for (const [rx, cat] of categoryKeywords) {
      if (rx.test(promptLower)) {
        matchedCat = matchedCat ? `${matchedCat}|${cat}` : cat;
      }
    }
    if (matchedCat) return matchedCat;

    // Semantic noun extraction (strip stop words & color tokens so "collor all the pool with gree" -> "pool")
    const cleaned = promptLower
      .replace(/[^a-z0-9\s_-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .filter((w) => !STOP_WORDS.has(w))
      .filter((w) => !COLOR_ALIASES.some((c) => c.regex.test(w)));

    return cleaned.join("|");
  }

  private pushChatMessage(msg: McpChatMessage) {
    this.chatMessages = [...this.chatMessages, msg].slice(-60);
    this.onChatUpdated.trigger();
  }

  /**
   * Conversational BIM Chatbot Engine -> Parses natural language (with typos),
   * invokes live MCP tools on That Open Engine, and replies in chat bubbles.
   */
  async runNaturalLanguagePrompt(promptText: string): Promise<McpExecutionLog> {
    const cleanText = promptText.trim();
    const q = cleanText.toLowerCase();

    this.pushChatMessage({
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      role: "user",
      text: cleanText,
      timestamp: new Date().toLocaleTimeString(),
    });

    const finalizeChat = (log: McpExecutionLog, customText?: string, quickActions?: { label: string; prompt: string }[]) => {
      this.pushChatMessage({
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        role: "assistant",
        text: customText || log.summary,
        timestamp: log.timestamp,
        tool: log.tool,
        status: log.status,
        durationMs: log.durationMs,
        quickActions,
      });
      return log;
    };

    const replyChatOnly = (toolTag: string, replyText: string, quickActions?: { label: string; prompt: string }[]) => {
      const log: McpExecutionLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: "local-copilot",
        prompt: cleanText,
        tool: toolTag,
        args: {},
        status: "success",
        summary: replyText,
        durationMs: 1,
      };
      return finalizeChat(log, replyText, quickActions);
    };

    // 1. Greetings & Small Talk ("hi", "hi how are you", "good morning", etc.)
    if (
      /^(hi+|hello+|hey+|helo|salam|bonjour|hola)\b/i.test(q) ||
      /\bhow\s+(are|r)\s+(you|u|ya)\b/i.test(q) ||
      /\bhow('?s|\s+is)\s+it\s+going\b/i.test(q) ||
      /\b(good\s+(morning|afternoon|evening)|what'?s\s+up|sup)\b/i.test(q)
    ) {
      return replyChatOnly(
        "copilot_chat",
        "Hello! I'm your AI BIM Copilot, and I'm doing great and ready to assist. How can I help with your 3D BIM model today — highlight elements, cut a section, or calculate quantities?",
        [
          { label: "Model Summary", prompt: "Get full model summary" },
          { label: "Color Pools Green", prompt: "Color all the pool green" },
          { label: "Cut Section", prompt: "Cut floor plan section" },
        ]
      );
    }

    // 2. Gratitude / Goodbye
    if (/^(thanks?|thank\s+you|thx|merci|bye|goodbye|see\s+you)\b/i.test(q)) {
      return replyChatOnly(
        "copilot_chat",
        "You're welcome! I'm always here inside your BIM workspace whenever you want to inspect, highlight, section, or quantify elements."
      );
    }

    // 3. Identity, Age, Role & Capabilities ("what is your age", "who are you", "help")
    if (
      /\b(your\s+age|how\s+old|who\s+are\s+you|what\s+are\s+you|your\s+name|are\s+you\s+(human|ai|real|a\s+bot|a\s+robot)|what\s+can\s+you\s+do|help)\b/i.test(q) ||
      q === "?"
    ) {
      return replyChatOnly(
        "copilot_identity",
        "I'm an AI BIM Copilot powered by Model Context Protocol (MCP) and That Open Engine. Because I'm an AI software assistant, I don't have a personal age — I'm built to help you inspect OpenBIM/IFC models, color or isolate elements, slice sections, and calculate takeoffs.",
        [
          { label: "Model Summary", prompt: "Get full model summary" },
          { label: "Highlight Walls", prompt: "Highlight walls in cyan" },
          { label: "Qty Takeoff", prompt: "Calculate volume of slabs" },
        ]
      );
    }

    // 4. Time, Date, Weather & General Off-Topic Questions
    if (
      /\b(what\s+time|current\s+time|time\s+is\s+it|what\s+day|what\s+date|today'?s\s+date|weather|forecast|tell\s+me\s+a\s+joke)\b/i.test(q)
    ) {
      const nowStr = `${new Date().toLocaleTimeString()} · ${new Date().toLocaleDateString()}`;
      return replyChatOnly(
        "copilot_identity",
        `I'm an AI BIM Copilot specialized in 3D architecture and OpenBIM workflows (your workstation clock reads ${nowStr}). Whenever you're ready, ask me to summarize the model, color elements, or compute volumes!`,
        [{ label: "Model Summary", prompt: "Get full model summary" }]
      );
    }

    if (q.includes("reset") || q.includes("show all") || q.includes("clear") || q.includes("unhide") || q.includes("undo")) {
      const log = await this.executeTool("reset_viewer_state", {}, "local-copilot", cleanText);
      return finalizeChat(log);
    }

    // Model Summary / Overview queries (must run before target noun extraction)
    if (/\b(summary|summarize|overview|stats|inspect\s+model|about\s+(the\s+)?model|full\s+model)\b/i.test(q)) {
      const log = await this.executeTool("get_model_summary", {}, "local-copilot", cleanText);
      return finalizeChat(log, log.summary, [
        { label: "Highlight Walls", prompt: "Highlight walls in cyan" },
        { label: "Qty Takeoff", prompt: "Calculate volume of slabs" },
      ]);
    }

    // GIS / Location queries
    if (q.includes("gis") || q.includes("fly") || q.includes("map") || q.includes("london") || q.includes("paris") || q.includes("new york") || q.includes("dubai") || q.includes("tokyo")) {
      for (const [cityKey, coords] of Object.entries(CITY_COORDS)) {
        if (q.includes(cityKey)) {
          const log = await this.executeTool(
            "sync_gis_location",
            { latitude: coords.lat, longitude: coords.lon, city: coords.label },
            "local-copilot",
            cleanText
          );
          return finalizeChat(log);
        }
      }
      const log = await this.executeTool(
        "sync_gis_location",
        { latitude: 51.5007, longitude: -0.1246, city: "London Westminster" },
        "local-copilot",
        cleanText
      );
      return finalizeChat(log);
    }

    // Section / Cut queries
    if (q.includes("section") || q.includes("cut") || q.includes("slice") || q.includes("clip")) {
      const axis = q.includes("cross") || q.includes(" x") ? "x" : q.includes("long") || q.includes(" y") ? "y" : "z";
      const log = await this.executeTool("create_section_cut", { axis }, "local-copilot", cleanText);
      return finalizeChat(log, log.summary, [{ label: "Reset Section", prompt: "Reset viewer state" }]);
    }

    const target = this.extractTargetFromPrompt(q);
    const hasPreviousPronoun = /\b(them|these|those|it|selection)\b/.test(q) && this.countMapItems(this.lastMatchedMap) > 0;
    const hasBimVerb = /\b(highlight|collor|color|colour|paint|tint|find|show|select|locate|zoom|focus|isolate|only|hide|volume|area|cost|quantity|takeoff|calculate|count)\b/.test(q);
    const looksLikeGeneralQuestion = /^(what|who|why|when|where|how|can\s+you|do\s+you|are\s+you|is\s+it|tell\s+me)\b/i.test(q) || q.endsWith("?");

    if (!hasBimVerb && looksLikeGeneralQuestion) {
      return replyChatOnly(
        "copilot_identity",
        "I'm an AI BIM Copilot focused on your 3D OpenBIM / IFC model. I can't answer general non-BIM trivia, but you can ask me things like \"How many slabs?\", \"Color all the pool green\", \"Isolate Villa 01\", or \"Cut floor plan section\"!",
        [
          { label: "Model Summary", prompt: "Get full model summary" },
          { label: "Color Pools Green", prompt: "Color all the pool green" },
        ]
      );
    }

    // Quantity takeoff / volume / area / cost / count / how many
    if (q.includes("volume") || q.includes("area") || q.includes("cost") || q.includes("quantity") || q.includes("takeoff") || q.includes("calculate") || q.includes("how many") || q.includes("count")) {
      const log = await this.executeTool(
        "calculate_quantity_takeoff",
        { category: target },
        "local-copilot",
        cleanText
      );
      return finalizeChat(log, log.summary, [{ label: "Full Summary", prompt: "Get full model summary" }]);
    }

    // Hide action
    if (/\bhide\b|\binvisible\b/.test(q)) {
      const log = await this.executeTool(
        "hide_category",
        { category: hasPreviousPronoun ? "__LAST__" : target || "WALL" },
        "local-copilot",
        cleanText
      );
      return finalizeChat(log, log.summary, [{ label: "Show All", prompt: "Reset viewer state" }]);
    }

    // Isolate action
    if (/\bisolate\b|\bonly\b/.test(q)) {
      const log = await this.executeTool(
        "isolate_category",
        { category: hasPreviousPronoun ? "__LAST__" : target || "WALL|SLAB" },
        "local-copilot",
        cleanText
      );
      return finalizeChat(log, log.summary, [{ label: "Show All", prompt: "Reset viewer state" }]);
    }

    // Highlight / Color / Find / Show (including typos like "collor", "gree")
    const hasVisualVerb = /\b(highlight|collor|color|colour|paint|tint|find|show|select|locate|zoom|focus)\b/i.test(q);
    const hasKnownBimNoun = /\b(walls?|slabs?|floors?|decks?|columns?|beams?|doors?|windows?|roofs?|pools?|villas?|trees?|solar|pergola|stairs?|lights?|beds?|sofas?|desks?|glaz\w*|curtain|footing)\b/i.test(q);
    if (hasVisualVerb || (target.length > 0 && hasKnownBimNoun)) {
      const { hex, label } = this.detectColorFromPrompt(q);
      const log = await this.executeTool(
        "highlight_category",
        { category: target || "WALL", colorHex: hex, colorLabel: label },
        "local-copilot",
        cleanText
      );
      const matched = (log.data?.matchedCount ?? 0) > 0;
      return finalizeChat(
        log,
        log.summary,
        matched
          ? [
              { label: "Isolate Match", prompt: "Isolate them" },
              { label: "Hide Match", prompt: "Hide them" },
              { label: "Clear Color", prompt: "Reset viewer state" },
            ]
          : undefined
      );
    }

    return replyChatOnly(
      "copilot_chat",
      "I'm an AI BIM Copilot ready for your model commands. Try \"Get full model summary\", \"Color all the pool green\", \"Isolate Villa 01\", \"Calculate volume of slabs\", or \"Cut floor plan section\".",
      [
        { label: "Model Summary", prompt: "Get full model summary" },
        { label: "Color Pools Green", prompt: "Color all the pool green" },
      ]
    );
  }

  dispose() {
    this.disconnectBridge();
    this.logs = [];
    this.chatMessages = [];
    this.onLogAdded.reset();
    this.onChatUpdated.reset();
    this.onModelLoaded.reset();
    this.onBridgeStatusChanged.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}

