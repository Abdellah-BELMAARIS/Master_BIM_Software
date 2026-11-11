import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { McpAgent, MCP_BIM_TOOLS } from "../../bim-components/McpAgent";

export interface McpAgentSectionState {
  components: OBC.Components;
  promptDraft?: string;
  showClaudePanel?: boolean;
  copiedConfig?: boolean;
  isSending?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Get full model summary",
  "Color all the pool green",
  "Highlight walls in cyan",
  "Isolate structural columns and beams",
  "Calculate volume of slabs",
  "Cut floor plan section",
  "Fly GIS to Paris",
  "Reset viewer state",
];

const CLAUDE_CONFIG_SNIPPET = `{
  "mcpServers": {
    "that-open-bim": {
      "command": "node",
      "args": [
        "d:/Coding/MyLearning/ThatOpenCompany/Master_BIM_Software/5-Connecting_Workflows/mcp-bim-server/dist/index.js"
      ]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "d:/Coding/MyLearning/ThatOpenCompany/Master_BIM_Software/5-Connecting_Workflows/public/models",
        "d:/Coding/MyLearning/ThatOpenCompany/Master_BIM_Software/5-Connecting_Workflows"
      ]
    }
  }
}`;

/**
 * Module 5 — Section 4 (Lessons 4.1 – 4.3): Pro BIM AI Copilot Chatbot & Claude MCP Bridge
 */
export const mcpAgentTemplate: BUI.StatefullComponent<McpAgentSectionState> = (
  state: McpAgentSectionState,
  update
) => {
  const { components } = state;
  const mcp = components.get(McpAgent);

  let draft = state.promptDraft ?? "";

  const onSendMessage = async () => {
    const clean = draft.trim();
    if (!clean || state.isSending) return;
    update({ promptDraft: "", isSending: true });
    try {
      await mcp.runNaturalLanguagePrompt(clean);
    } finally {
      update({ promptDraft: "", isSending: false });
    }
  };

  const onRunSuggested = async (prompt: string) => {
    if (state.isSending) return;
    update({ isSending: true });
    try {
      await mcp.runNaturalLanguagePrompt(prompt);
    } finally {
      update({ isSending: false });
    }
  };

  const onToggleBridge = () => {
    if (mcp.bridgeStatus === "connected" || mcp.bridgeStatus === "connecting") {
      mcp.disconnectBridge();
    } else {
      mcp.connectBridge();
    }
    update();
  };

  const isConnected = mcp.bridgeStatus === "connected";
  const showSuggestions = mcp.chatMessages.length <= 2;
  const visibleSuggestions = SUGGESTED_PROMPTS.filter(
    (p) => mcp.isGisAllowed || !p.toLowerCase().includes("gis")
  );
  const visibleTools = MCP_BIM_TOOLS.filter(
    (t) => mcp.isGisAllowed || t.name !== "sync_gis_location"
  );

  requestAnimationFrame(() => {
    const el = document.getElementById("mcp-chat-scroll");
    if (el) el.scrollTop = el.scrollHeight;
  });

  return BUI.html`
    <div
      style="
        display: flex;
        flex-direction: column;
        gap: 9px;
        width: 100%;
        height: 100%;
        background: transparent;
        padding: 10px 12px;
        box-sizing: border-box;
        overflow-x: hidden;
      "
    >
      <!-- Calm Pro Copilot Header -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.14), rgba(15, 23, 42, 0.94));
          border: 1px solid rgba(168, 85, 247, 0.35);
          flex-shrink: 0;
        "
      >
        <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
          <span style="font-size: 0.84rem; font-weight: 800; color: #f8fafc; white-space: nowrap;">BIM Copilot</span>
          <button
            type="button"
            @click=${onToggleBridge}
            style="
              font-size: 0.60rem;
              padding: 2px 7px;
              border-radius: 999px;
              background: ${isConnected ? "rgba(16, 185, 129, 0.18)" : "rgba(148, 163, 184, 0.14)"};
              border: 1px solid ${isConnected ? "rgba(16, 185, 129, 0.45)" : "rgba(148, 163, 184, 0.28)"};
              color: ${isConnected ? "#34d399" : "#94a3b8"};
              font-weight: 700;
              cursor: pointer;
              white-space: nowrap;
            "
            title=${isConnected ? "Connected to ws://localhost:3001 (click to disconnect)" : "Disconnected (click to connect ws://localhost:3001)"}
          >
            ● ${isConnected ? "WS Live" : "Connect WS"}
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
          <button
            type="button"
            @click=${() => update({ showClaudePanel: !state.showClaudePanel })}
            style="
              padding: 4px 8px;
              border-radius: 7px;
              background: ${state.showClaudePanel ? "rgba(168, 85, 247, 0.28)" : "rgba(30, 41, 59, 0.85)"};
              border: 1px solid ${state.showClaudePanel ? "#a855f7" : "rgba(148, 163, 184, 0.25)"};
              color: #e9d5ff;
              font-size: 0.65rem;
              font-weight: 700;
              cursor: pointer;
            "
            title="Show MCP Tools & claude_desktop_config.json"
          >
            MCP Config
          </button>
          <button
            type="button"
            @click=${() => mcp.clearChat()}
            style="
              padding: 4px 8px;
              border-radius: 7px;
              background: rgba(30, 41, 59, 0.85);
              border: 1px solid rgba(148, 163, 184, 0.25);
              color: #94a3b8;
              font-size: 0.65rem;
              font-weight: 600;
              cursor: pointer;
            "
            title="Clear chat history"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Collapsible Claude MCP Tools & Config Panel -->
      ${state.showClaudePanel
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 7px; padding: 10px 11px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(168, 85, 247, 0.35); flex-shrink: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.68rem; color: #c084fc; font-weight: 700; text-transform: uppercase;">
                  Registered MCP Tools (${visibleTools.length})
                </span>
                <button
                  type="button"
                  @click=${() => mcp.clearChat()}
                  style="background: transparent; border: none; color: #94a3b8; font-size: 0.66rem; font-weight: 600; cursor: pointer; text-decoration: underline;"
                >
                  Clear Chat
                </button>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${visibleTools.map(
                  (t) => BUI.html`
                    <span
                      title="${t.description}"
                      style="padding: 2px 6px; border-radius: 5px; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(168, 85, 247, 0.25); color: #d8b4fe; font-family: monospace; font-size: 0.62rem;"
                    >${t.name}</span>
                  `
                )}
              </div>
              <div style="font-size: 0.63rem; color: #cbd5e1; line-height: 1.4;">
                Claude Desktop → <strong>Settings → Developer → Edit Config</strong> (<code>claude_desktop_config.json</code>):
              </div>
              <pre style="margin: 0; padding: 7px; border-radius: 6px; background: #020617; border: 1px solid rgba(168, 85, 247, 0.3); color: #e9d5ff; font-size: 0.60rem; overflow-x: auto;">${CLAUDE_CONFIG_SNIPPET}</pre>
              <div style="display: flex; gap: 6px;">
                <button
                  type="button"
                  @click=${async () => {
                    try {
                      await navigator.clipboard.writeText(CLAUDE_CONFIG_SNIPPET);
                      update({ copiedConfig: true });
                      setTimeout(() => update({ copiedConfig: false }), 2000);
                    } catch {}
                  }}
                  style="flex: 1; padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(168, 85, 247, 0.45); background: rgba(168, 85, 247, 0.2); color: #f3e8ff; font-size: 0.66rem; font-weight: 700; cursor: pointer;"
                >
                  ${state.copiedConfig ? "✓ Copied JSON!" : "Copy Config JSON"}
                </button>
                <button
                  type="button"
                  @click=${() => {
                    const blob = new Blob([CLAUDE_CONFIG_SNIPPET], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "claude_desktop_config.json";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                  }}
                  style="padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.16); color: #38bdf8; font-size: 0.66rem; font-weight: 700; cursor: pointer;"
                >
                  Download JSON
                </button>
              </div>
            </div>
          `
        : ""}

      <!-- Chatbot Conversation Thread -->
      <div
        id="mcp-chat-scroll"
        style="
          display: flex;
          flex-direction: column;
          gap: 9px;
          flex: 1;
          min-height: 250px;
          max-height: ${showSuggestions ? "330px" : "440px"};
          overflow-y: auto;
          overflow-x: hidden;
          padding: 10px;
          border-radius: 12px;
          background: rgba(9, 13, 22, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.16);
        "
      >
        ${mcp.chatMessages.map((msg) => {
          const isUser = msg.role === "user";
          if (isUser) {
            return BUI.html`
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px; max-width: 100%;">
                <div
                  style="
                    max-width: 85%;
                    padding: 8px 12px;
                    border-radius: 14px 14px 4px 14px;
                    background: linear-gradient(135deg, #7c3aed, #6366f1);
                    color: #ffffff;
                    font-size: 0.76rem;
                    line-height: 1.45;
                    word-break: break-word;
                    box-shadow: 0 3px 10px rgba(99, 102, 241, 0.25);
                  "
                >
                  ${msg.text}
                </div>
                <span style="font-size: 0.60rem; color: #64748b; padding-right: 4px;">You · ${msg.timestamp}</span>
              </div>
            `;
          }

          return BUI.html`
            <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; max-width: 100%;">
              <div
                style="
                  max-width: 92%;
                  padding: 9px 11px;
                  border-radius: 14px 14px 14px 4px;
                  background: rgba(15, 23, 42, 0.94);
                  border: 1px solid ${msg.status === "error" ? "rgba(239, 68, 68, 0.45)" : msg.status === "success" ? "rgba(56, 189, 248, 0.35)" : "rgba(168, 85, 247, 0.3)"};
                  color: #e2e8f0;
                  font-size: 0.75rem;
                  line-height: 1.48;
                  word-break: break-word;
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                "
              >
                <div>${msg.text}</div>

                ${msg.quickActions && msg.quickActions.length > 0
                  ? BUI.html`
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px;">
                        ${msg.quickActions.map(
                          (qa) => BUI.html`
                            <button
                              type="button"
                              @click=${() => onRunSuggested(qa.prompt)}
                              style="
                                padding: 3px 8px;
                                border-radius: 999px;
                                background: rgba(56, 189, 248, 0.14);
                                border: 1px solid rgba(56, 189, 248, 0.38);
                                color: #38bdf8;
                                font-size: 0.64rem;
                                font-weight: 700;
                                cursor: pointer;
                              "
                            >
                              ${qa.label}
                            </button>
                          `
                        )}
                      </div>
                    `
                  : ""}

                ${msg.tool
                  ? BUI.html`
                      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 0.60rem; color: #94a3b8; border-top: 1px solid rgba(148, 163, 184, 0.12); padding-top: 4px;">
                        <span style="font-family: monospace; color: #c084fc;">fn: ${msg.tool}</span>
                        <span>${msg.durationMs ?? 0}ms</span>
                      </div>
                    `
                  : ""}
              </div>
            </div>
          `;
        })}
      </div>

      <!-- Collapsible Quick Suggestions Strip -->
      ${showSuggestions
        ? BUI.html`
            <div style="display: flex; flex-wrap: wrap; gap: 5px; flex-shrink: 0;">
              ${visibleSuggestions.slice(0, 6).map(
                (p) => BUI.html`
                  <button
                    type="button"
                    @click=${() => onRunSuggested(p)}
                    style="
                      padding: 4px 8px;
                      border-radius: 999px;
                      background: rgba(30, 41, 59, 0.78);
                      border: 1px solid rgba(148, 163, 184, 0.25);
                      color: #cbd5e1;
                      font-size: 0.65rem;
                      cursor: pointer;
                    "
                  >
                    ✨ ${p}
                  </button>
                `
              )}
            </div>
          `
        : ""}

      <!-- Chat Message Composer -->
      <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
        <input
          type="text"
          .value=${draft}
          @input=${(e: Event) => { draft = (e.target as HTMLInputElement).value; }}
          @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") onSendMessage(); }}
          placeholder='Chat: "Color all the pool green" or "Isolate walls"...'
          style="
            flex: 1;
            min-width: 0;
            padding: 9px 11px;
            border-radius: 10px;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(168, 85, 247, 0.45);
            color: #f8fafc;
            font-size: 0.76rem;
            outline: none;
          "
        />
        <button
          type="button"
          @click=${onSendMessage}
          style="
            padding: 9px 14px;
            border-radius: 10px;
            border: none;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: #ffffff;
            font-size: 0.76rem;
            font-weight: 700;
            cursor: pointer;
            flex-shrink: 0;
          "
        >
          ${state.isSending ? "..." : "Send"}
        </button>
      </div>
    </div>
  `;
};
