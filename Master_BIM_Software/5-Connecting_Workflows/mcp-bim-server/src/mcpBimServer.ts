import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer, WebSocket } from "ws";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Module 5 — Section 4 (Lessons 4.1 – 4.3):
 * MCP-LLM Framework Server for That Open Engine BIM Platform.
 *
 * Supports:
 * 1. Stdio MCP Transport -> Connects to Claude Desktop, Cursor, or Antigravity
 * 2. Local WebSocket Bridge (ws://localhost:3001) -> Streams live tool invocations
 *    directly into the running That Open Engine React BIM Viewer.
 * 3. `--bridge-only` daemon mode -> Keeps ws://localhost:3001 listening for the Browser
 *    Viewer and relays requests from any Stdio MCP process (no EADDRINUSE conflicts).
 */

const WS_PORT = Number(process.env.BIM_MCP_WS_PORT || 3001);
const IS_BRIDGE_ONLY = process.argv.includes("--bridge-only");

let activeViewer: WebSocket | null = null;
const mcpRelayClients = new Set<WebSocket>();
let relayClientWs: WebSocket | null = null;

const pendingRequests = new Map<
  string,
  {
    resolve: (val: any) => void;
    reject: (err: any) => void;
    originMcpWs?: WebSocket;
    originRequestId?: string;
  }
>();

function handleIncomingMessage(ws: WebSocket, role: "viewer" | "mcp", raw: string) {
  try {
    const msg = JSON.parse(raw);

    if (role === "mcp" && msg.tool && msg.requestId) {
      if (!activeViewer || activeViewer.readyState !== WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            requestId: msg.requestId,
            error:
              "No That Open Engine BIM Viewer tab is connected on ws://localhost:" +
              WS_PORT +
              ". Open the project viewer and click Connect WS.",
          })
        );
        return;
      }

      const fwdId = `relay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timer = setTimeout(() => {
        pendingRequests.delete(fwdId);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              requestId: msg.requestId,
              error: `Timeout waiting for BIM Viewer execution of '${msg.tool}'`,
            })
          );
        }
      }, 10000);

      pendingRequests.set(fwdId, {
        resolve: (val) => {
          clearTimeout(timer);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ requestId: msg.requestId, result: val }));
          }
        },
        reject: (err) => {
          clearTimeout(timer);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                requestId: msg.requestId,
                error: err?.message || "Viewer execution error",
              })
            );
          }
        },
      });

      activeViewer.send(JSON.stringify({ requestId: fwdId, tool: msg.tool, args: msg.args || {} }));
      return;
    }

    if (msg.requestId && pendingRequests.has(msg.requestId)) {
      const handler = pendingRequests.get(msg.requestId)!;
      pendingRequests.delete(msg.requestId);
      if (msg.error) handler.reject(new Error(msg.error));
      else handler.resolve(msg.result);
    }
  } catch {}
}

function attachRelayClient(): Promise<WebSocket> {
  if (relayClientWs && relayClientWs.readyState === WebSocket.OPEN) {
    return Promise.resolve(relayClientWs);
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}/?role=mcp`);
    ws.on("open", () => {
      relayClientWs = ws;
      resolve(ws);
    });
    ws.on("message", (raw) => {
      handleIncomingMessage(ws, "viewer", raw.toString());
    });
    ws.on("close", () => {
      if (relayClientWs === ws) relayClientWs = null;
    });
    ws.on("error", (err) => {
      reject(err);
    });
  });
}

function startWebSocketHub(): Promise<"hub" | "relay"> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port: WS_PORT });

    wss.once("listening", () => {
      console.error("[MCP-BIM Bridge] Listening on ws://localhost:" + WS_PORT);
      resolve("hub");
    });

    wss.on("error", (err: any) => {
      if (err?.code === "EADDRINUSE" && !IS_BRIDGE_ONLY) {
        console.error(
          `[MCP-BIM Bridge] Port ${WS_PORT} already hosted; switching Stdio MCP process to WS relay client.`
        );
        resolve("relay");
      } else {
        console.error("[MCP-BIM Bridge] Server error:", err);
        if (IS_BRIDGE_ONLY) process.exit(1);
        resolve("relay");
      }
    });

    wss.on("connection", (ws, req) => {
      const reqUrl = req?.url || "/";
      const role: "viewer" | "mcp" = reqUrl.includes("role=mcp") ? "mcp" : "viewer";

      if (role === "mcp") {
        mcpRelayClients.add(ws);
        console.error("[MCP-BIM Bridge] Claude Stdio MCP relay attached.");
      } else {
        activeViewer = ws;
        console.error("[MCP-BIM Bridge] Browser BIM Viewer connected on ws://localhost:" + WS_PORT);
      }

      ws.on("message", (raw) => handleIncomingMessage(ws, role, raw.toString()));

      ws.on("close", () => {
        if (role === "mcp") {
          mcpRelayClients.delete(ws);
        } else if (activeViewer === ws) {
          activeViewer = null;
        }
      });
    });
  });
}

async function dispatchToViewer(
  mode: "hub" | "relay",
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  const targetWs =
    mode === "relay" ? await attachRelayClient().catch(() => null) : activeViewer;

  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
    throw new Error(
      "No That Open Engine BIM Viewer tab is connected on ws://localhost:" +
        WS_PORT +
        ". Open the project viewer and click Connect WS."
    );
  }

  const requestId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Timeout waiting for BIM Viewer execution of '${toolName}'`));
    }, 10000);

    pendingRequests.set(requestId, {
      resolve: (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });

    targetWs.send(JSON.stringify({ requestId, tool: toolName, args }));
  });
}

const server = new Server(
  {
    name: "that-open-bim-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let cachedModelIdMap: Record<string, number[]> | null = null;
const MODELS_ROOT = path.resolve(
  "d:/Coding/MyLearning/ThatOpenCompany/Master_BIM_Software/5-Connecting_Workflows/public/models"
);

function resolveModelFilePath(input: string): string | null {
  const clean = (input || "").trim();
  if (!clean) return null;
  if (fs.existsSync(clean) && fs.statSync(clean).isFile()) return clean;
  const candidates = [
    path.join(MODELS_ROOT, "frag", clean),
    path.join(MODELS_ROOT, "ifc", clean),
    path.join(MODELS_ROOT, clean),
    path.join(MODELS_ROOT, "frag", clean.replace(/\.ifc$/i, ".frag")),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "load_bim_model",
        description: "Reads a local .frag or .ifc BIM file from disk and streams its binary ArrayBuffer over WebSocket directly into the running 3D BIM Viewer.",
        inputSchema: {
          type: "object",
          properties: {
            filePath: { type: "string", description: "Absolute file path or model filename (e.g. aurora_ten_villa_estate_ifc4.frag)" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "get_model_id_map",
        description: "Finds matching BIM items across the loaded model by IFC category or name and stores the resulting modelIdMap in MCP memory.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "IFC category regex or element name pattern (e.g. WALL, SLAB, pool)" },
          },
          required: ["category"],
        },
      },
      {
        name: "highlight_by_model_id_map",
        description: "Highlights elements using the cached modelIdMap (or provided modelIdMap) with a custom hex color and removePrevious toggle.",
        inputSchema: {
          type: "object",
          properties: {
            colorHex: { type: "string", description: "Highlight hex color, e.g. #10b981" },
            removePrev: { type: "boolean", description: "Whether to clear previous highlights before applying" },
          },
        },
      },
      {
        name: "get_model_summary",
        description: "Returns loaded IFC/Fragment models, element counts by IFC category, and active GIS coordinates.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "highlight_category",
        description: "Finds and color-highlights BIM elements matching an IFC category regex (e.g. WALL, SLAB, DOOR, WINDOW, COLUMN, BEAM).",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "IFC class filter pattern, e.g. WALL or SLAB" },
            colorHex: { type: "string", description: "Hex color code, e.g. #38bdf8" },
          },
          required: ["category"],
        },
      },
      {
        name: "isolate_category",
        description: "Isolates BIM elements matching an IFC category or element name pattern using OBC.Hider.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "IFC class or element name pattern, e.g. COLUMN|BEAM or pool" },
          },
          required: ["category"],
        },
      },
      {
        name: "hide_category",
        description: "Hides BIM elements matching an IFC category or element name pattern using OBC.Hider.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "IFC class or element name pattern, e.g. WALL or tree" },
          },
          required: ["category"],
        },
      },
      {
        name: "calculate_quantity_takeoff",
        description: "Computes element count, total nominal area (m²), and total volume (m³) for a given IFC category.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string", description: "IFC class filter pattern, e.g. WALL or SLAB" },
          },
          required: ["category"],
        },
      },
      {
        name: "create_section_cut",
        description: "Creates an architectural clipping plane along axis x, y, or z via OBC.Clipper.",
        inputSchema: {
          type: "object",
          properties: {
            axis: { type: "string", enum: ["x", "y", "z"], description: "Cutting axis (z=Floor Plan, x=Cross, y=Longitudinal)" },
          },
          required: ["axis"],
        },
      },
      {
        name: "sync_gis_location",
        description: "Flies the 3D Cesium GIS layer and 2D radar map to target latitude/longitude coordinates.",
        inputSchema: {
          type: "object",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" },
            rotation: { type: "number" },
          },
          required: ["latitude", "longitude"],
        },
      },
      {
        name: "reset_viewer_state",
        description: "Restores all hidden elements, clears highlighter color styles, deletes clipping planes, and fits camera extents.",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };
});

let transportMode: "hub" | "relay" = "hub";

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    if (name === "load_bim_model") {
      const target = resolveModelFilePath(String((args as any)?.filePath || (args as any)?.fileName || ""));
      if (!target) {
        throw new Error(`Model file not found: "${(args as any)?.filePath || ""}"`);
      }
      const bytes = fs.readFileSync(target);
      const result = await dispatchToViewer(transportMode, "load_binary_model_base64", {
        fileName: path.basename(target),
        base64: bytes.toString("base64"),
        byteLength: bytes.byteLength,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === "get_model_id_map") {
      const result = await dispatchToViewer(transportMode, name, args as Record<string, any>);
      if (result?.modelIdMap) {
        cachedModelIdMap = result.modelIdMap;
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === "highlight_by_model_id_map") {
      const payload = {
        ...(args as Record<string, any>),
        modelIdMap: (args as any)?.modelIdMap || cachedModelIdMap,
      };
      const result = await dispatchToViewer(transportMode, name, payload);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    const result = await dispatchToViewer(transportMode, name, args as Record<string, any>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error?.message || "MCP execution failed" }],
    };
  }
});

async function main() {
  transportMode = await startWebSocketHub();
  if (IS_BRIDGE_ONLY) {
    console.error("[MCP-BIM Bridge] Standalone WebSocket daemon active on ws://localhost:" + WS_PORT);
    return;
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[MCP-BIM Server] Running on stdio + WS (${transportMode}) port ${WS_PORT}`);
}

main().catch((err) => {
  console.error("Fatal MCP Server Error:", err);
  process.exit(1);
});

