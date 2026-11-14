import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import {
  CypeConnector,
  CypeContributionItem,
  CypeIssue,
  PublishDeliverableSource,
  CYPE_PROXY_ENDPOINT,
  CYPE_USER_PROFILE_URL,
  CYPE_DEV_PORTAL_URL,
} from "../../bim-components/CypeConnector";
import {
  arrangeModelsInGrid,
  clearAllModels,
  fitAllModelsCamera,
  resetModelsOrigin,
} from "../../bim-components/setup/src/model-layout";

export interface CypeSectionState {
  components: OBC.Components;
  projectId?: string;
  activeTab?: "models" | "issues" | "auth";
  viewMode?: "table" | "cards";
  disciplineFilter?: "All" | CypeContributionItem["discipline"];
  searchQuery?: string;
  showUploadForm?: boolean;
  uploadName?: string;
  uploadDiscipline?: CypeContributionItem["discipline"];
  uploadSource?: PublishDeliverableSource;
  uploadModelId?: string;
  uploadFile?: File | null;
  alsoDownload?: boolean;
  issueStatusFilter?: "all" | CypeIssue["status"];
  newIssueTitle?: string;
  newIssueDiscipline?: CypeIssue["discipline"];
  newIssuePriority?: CypeIssue["priority"];
  showSecrets?: boolean;
}

const DISCIPLINE_ACCENT: Record<CypeContributionItem["discipline"], string> = {
  Architecture: "#38bdf8",
  Structure: "#f59e0b",
  MEP: "#10b981",
  Coordination: "#a855f7",
};

const PRIORITY_COLOR: Record<CypeIssue["priority"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

/**
 * Module 5 — Section 5: CYPE BIMserver.center OpenBIM Studio
 * Organized enterprise CDE workspace for BIMserver.center Projects, Contributions (.ifc),
 * Coordination Issues, and OAuth2 Session Management.
 */
export const cypeTemplate: BUI.StatefullComponent<CypeSectionState> = (
  state: CypeSectionState,
  update
) => {
  const { components } = state;
  const cype = components.get(CypeConnector);
  const tab = state.activeTab || "models";
  const disciplineFilter = state.disciplineFilter || "All";
  const issueStatusFilter = state.issueStatusFilter || "all";

  const activeProject = cype.projects.find((p) => p.id === cype.selectedProjectId) || cype.projects[0];
  const inferDiscipline = (doc: CypeContributionItem): CypeContributionItem["discipline"] => {
    const n = doc.name.toUpperCase();
    if (n.includes("CYPECAD") || n.includes("ARM") || n.includes("STR")) return "Structure";
    if (n.includes("LIGHT") || n.includes("MEP") || n.includes("HVAC") || n.includes("ELEC")) return "MEP";
    if (n.includes("COORD") || n.includes("FED")) return "Coordination";
    return doc.discipline;
  };
  const allDocs = cype.getActiveContributions().map((d) => ({
    ...d,
    discipline: inferDiscipline(d),
  }));
  const search = (state.searchQuery || "").trim().toLowerCase();
  const visibleDocs = allDocs.filter((d) => {
    const matchesDisc = disciplineFilter === "All" || d.discipline === disciplineFilter;
    const matchesSearch = !search || d.name.toLowerCase().includes(search);
    return matchesDisc && matchesSearch;
  });
  const loadedModelCount = components.get(OBC.FragmentsManager).list.size;

  const allIssues = cype.getActiveIssues();
  const visibleIssues =
    issueStatusFilter === "all"
      ? allIssues
      : allIssues.filter((i) => i.status === issueStatusFilter);

  const isLiveMode = cype.auth.mode === "live-cype";
  const hasSession = Boolean(cype.auth.sessionId.trim());
  const sessionHealthy = hasSession && cype.isSessionValid();
  const canFinishLogin = cype.hasPendingAuthorization();
  const isSameOriginProxy =
    typeof window !== "undefined" &&
    (cype.auth.proxyEndpoint || CYPE_PROXY_ENDPOINT).startsWith(window.location.origin);
  const isLocalDevOrigin =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  let newIssueDraft = state.newIssueTitle ?? "";
  const issueDisc = state.newIssueDiscipline || "Structure";
  const issuePri = state.newIssuePriority || "medium";

  const statusPillBg = (s: CypeIssue["status"]) =>
    s === "pending"
      ? "rgba(245, 158, 11, 0.18)"
      : s === "solved"
        ? "rgba(16, 185, 129, 0.18)"
        : "rgba(148, 163, 184, 0.18)";

  const statusPillColor = (s: CypeIssue["status"]) =>
    s === "pending" ? "#fbbf24" : s === "solved" ? "#34d399" : "#94a3b8";

  const inputStyle =
    "width: 100%; padding: 6px 9px; border-radius: 7px; background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.72rem; box-sizing: border-box;";

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 11px; width: 100%; height: 100%; padding: 14px 16px; box-sizing: border-box;">
      <!-- 1. Header Identity Card -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 13px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(15, 23, 42, 0.96) 100%);
          border: 1px solid rgba(56, 189, 248, 0.38);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        "
      >
        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${sessionHealthy ? "#10b981" : isLiveMode ? "#f59e0b" : "#38bdf8"}; box-shadow: 0 0 8px ${sessionHealthy ? "#10b981" : isLiveMode ? "#f59e0b" : "#38bdf8"}; flex-shrink: 0;"></span>
            <span style="font-size: 0.88rem; font-weight: 800; color: #f8fafc;">CYPE BIMserver.center</span>
            <span style="font-size: 0.60rem; padding: 1px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.22); color: #7dd3fc; font-weight: 700; letter-spacing: 0.04em;">OPENBIM CDE</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.70rem; color: #94a3b8; flex-wrap: wrap;">
            <span style="color: ${sessionHealthy ? "#34d399" : isLiveMode ? "#fbbf24" : "#7dd3fc"}; font-weight: 600;">
              ${sessionHealthy ? "Live Session Active" : isLiveMode ? "Live Mode (Auth Needed)" : "Sandbox Ecosystem"}
            </span>
            <span>·</span>
            <a
              href=${CYPE_USER_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style="color: #cbd5e1; text-decoration: none; font-weight: 600;"
              title="Open BIMserver.center Profile"
            >${cype.connectedUser} ↗</a>
          </div>
        </div>

        <button
          type="button"
          @click=${() => cype.syncLiveWorkspace()}
          style="padding: 7px 12px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.5); background: rgba(56, 189, 248, 0.16); color: #7dd3fc; font-size: 0.72rem; font-weight: 700; cursor: pointer; flex-shrink: 0;"
          title="Sync projects, contributions & issues from BIMserver.center"
        >
          ${cype.isBusy ? "Syncing..." : "↻ Sync"}
        </button>
      </div>

      <!-- Compact Activity Status Bar -->
      <div style="display: flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 8px; background: rgba(15, 23, 42, 0.78); border: 1px solid rgba(148, 163, 184, 0.18); font-size: 0.69rem; color: #bae6fd;">
        <span class="material-icons-round" style="font-size: 14px; color: #38bdf8;">info</span>
        <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cype.syncStatus}</span>
      </div>

      <!-- 2. Segmented Pill Navigation Rail -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border-radius: 10px; background: rgba(9, 14, 26, 0.9); border: 1px solid rgba(148, 163, 184, 0.2);">
        <button
          type="button"
          @click=${() => update({ activeTab: "models" })}
          style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 6px; border-radius: 7px; font-size: 0.72rem; font-weight: 700; cursor: pointer; border: 1px solid ${tab === "models" ? "rgba(56, 189, 248, 0.5)" : "transparent"}; background: ${tab === "models" ? "rgba(56, 189, 248, 0.18)" : "transparent"}; color: ${tab === "models" ? "#7dd3fc" : "#94a3b8"};"
        >
          <span class="material-icons-round" style="font-size: 15px;">view_in_ar</span>
          <span>Models (${allDocs.length})</span>
        </button>
        <button
          type="button"
          @click=${() => update({ activeTab: "issues" })}
          style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 6px; border-radius: 7px; font-size: 0.72rem; font-weight: 700; cursor: pointer; border: 1px solid ${tab === "issues" ? "rgba(245, 158, 11, 0.5)" : "transparent"}; background: ${tab === "issues" ? "rgba(245, 158, 11, 0.18)" : "transparent"}; color: ${tab === "issues" ? "#fbbf24" : "#94a3b8"};"
        >
          <span class="material-icons-round" style="font-size: 15px;">flag</span>
          <span>Issues (${allIssues.length})</span>
        </button>
        <button
          type="button"
          @click=${() => update({ activeTab: "auth" })}
          style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 6px; border-radius: 7px; font-size: 0.72rem; font-weight: 700; cursor: pointer; border: 1px solid ${tab === "auth" ? "rgba(16, 185, 129, 0.5)" : "transparent"}; background: ${tab === "auth" ? "rgba(16, 185, 129, 0.18)" : "transparent"}; color: ${tab === "auth" ? "#34d399" : "#94a3b8"};"
        >
          <span class="material-icons-round" style="font-size: 15px;">vpn_key</span>
          <span>CYPE Auth</span>
        </button>
      </div>

      ${tab === "models"
      ? BUI.html`
            <!-- Project Context Card -->
            <div style="display: flex; flex-direction: column; gap: 7px; padding: 10px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.82); border: 1px solid rgba(56, 189, 248, 0.24);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8;">Active BIMserver Project</span>
                <span style="font-size: 0.65rem; color: #64748b;">${activeProject?.updatedAt || ""}</span>
              </div>
              <select
                @change=${(e: Event) => cype.selectProject((e.target as HTMLSelectElement).value)}
                style="width: 100%; padding: 7px 9px; border-radius: 8px; background: rgba(30, 41, 59, 0.92); border: 1px solid rgba(56, 189, 248, 0.35); color: #f8fafc; font-size: 0.76rem; font-weight: 600;"
              >
                ${cype.projects.map(
        (p) => BUI.html`<option value=${p.id} ?selected=${p.id === cype.selectedProjectId}>${p.name}</option>`
      )}
              </select>
              ${activeProject
          ? BUI.html`<div style="font-size: 0.67rem; color: #94a3b8; line-height: 1.35;">${activeProject.description}</div>`
          : ""}
            </div>

            <!-- Discipline Filter Chips -->
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${(["All", "Architecture", "Structure", "MEP", "Coordination"] as const).map((disc) => {
            const active = disciplineFilter === disc;
            return BUI.html`
                  <button
                    type="button"
                    @click=${() => update({ disciplineFilter: disc })}
                    style="padding: 4px 9px; border-radius: 999px; font-size: 0.67rem; font-weight: 700; cursor: pointer; background: ${active ? "rgba(56, 189, 248, 0.22)" : "rgba(30, 41, 59, 0.65)"}; border: 1px solid ${active ? "#38bdf8" : "rgba(148, 163, 184, 0.2)"}; color: ${active ? "#7dd3fc" : "#94a3b8"};"
                  >
                    ${disc}
                  </button>
                `;
          })}
            </div>

            <!-- Search & Count Bar -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <input
                type="text"
                .value=${state.searchQuery || ""}
                @input=${(e: Event) => update({ searchQuery: (e.target as HTMLInputElement).value })}
                placeholder="Search models (e.g. VILLA_06, CYPECAD, ARCHI)..."
                style="flex: 1; padding: 6px 9px; border-radius: 7px; background: #18191d; border: 1px solid rgba(255, 255, 255, 0.12); color: #f8fafc; font-size: 0.71rem; box-sizing: border-box;"
              />
              <span style="font-size: 0.66rem; font-weight: 700; color: #94a3b8; padding: 4px 8px; border-radius: 6px; background: #18191d; border: 1px solid rgba(255, 255, 255, 0.08); white-space: nowrap;">
                ${visibleDocs.length} / ${allDocs.length}
              </span>
              ${visibleDocs.length > 0
          ? BUI.html`
                    <button
                      type="button"
                      ?disabled=${Boolean(cype.loadingDocId)}
                      @click=${async () => {
              for (const doc of visibleDocs) {
                await cype.loadContributionIfc(doc);
              }
            }}
                      title="Federate all currently filtered IFC models into the 3D viewer"
                      style="padding: 5px 9px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.12); color: #7dd3fc; font-size: 0.66rem; font-weight: 700; cursor: pointer; white-space: nowrap;"
                    >
                      Load All
                    </button>
                  `
          : ""}
              <button
                type="button"
                @click=${() => update({ viewMode: (state.viewMode || "table") === "table" ? "cards" : "table" })}
                title="Switch between Table and Card view"
                style="padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.12); background: #18191d; color: #e2e8f0; font-size: 0.66rem; font-weight: 700; cursor: pointer; white-space: nowrap;"
              >
                ${(state.viewMode || "table") === "table" ? "Cards" : "Table"}
              </button>
            </div>

            ${loadedModelCount > 0
          ? BUI.html`
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 9px; border-radius: 8px; background: rgba(15, 23, 42, 0.72); border: 1px solid rgba(56, 189, 248, 0.22); flex-wrap: wrap;">
                    <span style="font-size: 0.66rem; font-weight: 700; color: #7dd3fc;">
                      3D Scene (${loadedModelCount} loaded)
                    </span>
                    <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                      <button
                        type="button"
                        @click=${() => void arrangeModelsInGrid(components)}
                        title="Arrange loaded models in a clean non-overlapping grid"
                        style="padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.12); color: #7dd3fc; font-size: 0.64rem; font-weight: 700; cursor: pointer;"
                      >Arrange</button>
                      <button
                        type="button"
                        @click=${() => void resetModelsOrigin(components)}
                        title="Align all loaded models back to shared origin (0,0,0)"
                        style="padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.14); background: #18191d; color: #e2e8f0; font-size: 0.64rem; font-weight: 700; cursor: pointer;"
                      >Origin</button>
                      <button
                        type="button"
                        @click=${() => void fitAllModelsCamera(components)}
                        title="Frame all loaded models in the 3D viewport"
                        style="padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.14); background: #18191d; color: #e2e8f0; font-size: 0.64rem; font-weight: 700; cursor: pointer;"
                      >Fit</button>
                      <button
                        type="button"
                        @click=${async () => {
                await clearAllModels(components);
                update({});
              }}
                        title="Remove and dispose all loaded models from the 3D scene"
                        style="padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.16); color: #fca5a5; font-size: 0.64rem; font-weight: 700; cursor: pointer;"
                      >Clear 3D</button>
                    </div>
                  </div>
                `
          : ""}

            <!-- OpenBIM Contributions Cards -->
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; padding-right: 2px;">
              ${visibleDocs.length === 0
          ? BUI.html`
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 16px; text-align: center; border-radius: 10px; background: #121316; border: 1px dashed rgba(255, 255, 255, 0.14); font-size: 0.72rem; color: #94a3b8;">
                      <span class="material-icons-round" style="font-size: 22px; color: #64748b;">cloud_off</span>
                      <div>
                        ${isLiveMode && !sessionHealthy
              ? "Sign in to BIMserver.center to load your cloud projects and IFC models."
              : allDocs.length === 0
                ? "This project has no OpenBIM IFC contributions yet."
                : "No models match your current search or discipline filter."}
                      </div>
                      <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
                        ${isLiveMode && !sessionHealthy
              ? BUI.html`
                              <button
                                type="button"
                                @click=${() => update({ activeTab: "auth" })}
                                style="padding: 5px 10px; border-radius: 6px; border: none; background: #0284c7; color: #fff; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
                              >Go to CYPE Auth →</button>
                            `
              : allDocs.length === 0
                ? BUI.html`
                              <button
                                type="button"
                                @click=${() => void cype.syncLiveWorkspace()}
                                style="padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.14); background: #18191d; color: #e2e8f0; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
                              >↻ Sync Workspace</button>
                            `
                : BUI.html`
                              <button
                                type="button"
                                @click=${() => update({ disciplineFilter: "All", searchQuery: "" })}
                                style="padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.14); background: #18191d; color: #e2e8f0; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
                              >Clear Filters</button>
                            `}
                      </div>
                    </div>
                  `
          : (state.viewMode || "table") === "table"
            ? BUI.html`
                    <div style="border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); background: #121316; overflow: auto;">
                      <table style="width: 100%; border-collapse: collapse; font-size: 0.69rem; text-align: left;">
                        <thead>
                          <tr style="background: #18191d; color: #94a3b8; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                            <th style="padding: 7px 9px; font-weight: 700;">Model</th>
                            <th style="padding: 7px 6px; font-weight: 700;">Disc.</th>
                            <th style="padding: 7px 6px; font-weight: 700;">Rev</th>
                            <th style="padding: 7px 6px; font-weight: 700;">Updated</th>
                            <th style="padding: 7px 9px; font-weight: 700; text-align: right;">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${visibleDocs.map((doc) => {
              const isLoading = cype.loadingDocId === doc.id;
              const accent = DISCIPLINE_ACCENT[doc.discipline] || "#38bdf8";
              return BUI.html`
                              <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                <td style="padding: 7px 9px; color: #f8fafc; font-weight: 600; word-break: break-word;">${doc.name}</td>
                                <td style="padding: 7px 6px; color: ${accent}; font-weight: 700; white-space: nowrap;">${doc.discipline}</td>
                                <td style="padding: 7px 6px; color: #94a3b8; white-space: nowrap;">${doc.version}</td>
                                <td style="padding: 7px 6px; color: #64748b; white-space: nowrap;">${doc.modifiedAt}</td>
                                <td style="padding: 7px 9px; text-align: right; white-space: nowrap;">
                                  <button
                                    type="button"
                                    @click=${() => cype.loadContributionIfc(doc)}
                                    style="padding: 4px 8px; border-radius: 6px; border: none; background: #0284c7; color: #fff; font-size: 0.65rem; font-weight: 700; cursor: pointer;"
                                  >
                                    ${isLoading ? "Loading..." : "Load 3D"}
                                  </button>
                                </td>
                              </tr>
                            `;
            })}
                        </tbody>
                      </table>
                    </div>
                  `
            : visibleDocs.map((doc) => {
              const isLoading = cype.loadingDocId === doc.id;
              const accent = DISCIPLINE_ACCENT[doc.discipline] || "#38bdf8";
              return BUI.html`
                      <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(148, 163, 184, 0.2); border-left: 3px solid ${accent};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                          <div style="min-width: 0;">
                            <div style="font-size: 0.78rem; font-weight: 700; color: #f8fafc; word-break: break-word;">${doc.name}</div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 3px; font-size: 0.66rem; color: #94a3b8;">
                              <span style="color: ${accent}; font-weight: 700;">${doc.discipline}</span>
                              <span>·</span>
                              <span>${doc.appSource}</span>
                              <span>·</span>
                              <span>${doc.version}</span>
                              <span>·</span>
                              <span>${doc.sizeLabel}</span>
                            </div>
                          </div>
                          <span style="font-size: 0.61rem; font-weight: 700; padding: 2px 7px; border-radius: 5px; background: rgba(16, 185, 129, 0.16); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); flex-shrink: 0;">
                            IFC
                          </span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="font-size: 0.65rem; color: #64748b;">Updated ${doc.modifiedAt}</span>
                          <button
                            type="button"
                            @click=${() => cype.loadContributionIfc(doc)}
                            style="display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 7px; border: none; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                          >
                            <span class="material-icons-round" style="font-size: 14px;">3d_rotation</span>
                            <span>${isLoading ? "Loading IFC..." : "Load IFC → 3D"}</span>
                          </button>
                        </div>
                      </div>
                    `;
            })}
            </div>

            ${state.showUploadForm
          ? (() => {
              const loadedModels = cype.getLoadedModelIds();
              const uploadSource: PublishDeliverableSource =
                state.uploadSource || (loadedModels.length > 0 ? "glb" : "file");
              const selectedModelId = state.uploadModelId || "";
              const alsoDownload = Boolean(state.alsoDownload);

              return BUI.html`
                  <div style="display: flex; flex-direction: column; gap: 8px; padding: 11px 12px; border-radius: 10px; background: #121316; border: 1px solid rgba(16, 185, 129, 0.35);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 0.68rem; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 0.05em;">
                        Publish &amp; Export Studio
                      </span>
                      <button
                        type="button"
                        @click=${() => update({ showUploadForm: false })}
                        style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 0.72rem;"
                      >✕</button>
                    </div>

                    <input
                      type="text"
                      .value=${state.uploadName ?? `BIM Coordination Update (${new Date().toLocaleDateString()})`}
                      @input=${(e: Event) => update({ uploadName: (e.target as HTMLInputElement).value })}
                      placeholder="Contribution name..."
                      style="width: 100%; padding: 6px 9px; border-radius: 7px; background: #18191d; border: 1px solid rgba(255, 255, 255, 0.12); color: #f8fafc; font-size: 0.71rem; box-sizing: border-box;"
                    />

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                      <select
                        .value=${state.uploadDiscipline || "Coordination"}
                        @change=${(e: Event) =>
                  update({
                    uploadDiscipline: (e.target as HTMLSelectElement)
                      .value as CypeContributionItem["discipline"],
                  })}
                        style="padding: 6px 8px; border-radius: 7px; background: #18191d; border: 1px solid rgba(255, 255, 255, 0.12); color: #f8fafc; font-size: 0.71rem;"
                      >
                        <option value="Coordination">Coordination</option>
                        <option value="Architecture">Architecture</option>
                        <option value="Structure">Structure</option>
                        <option value="MEP">MEP</option>
                      </select>

                      <select
                        .value=${uploadSource}
                        @change=${(e: Event) =>
                  update({
                    uploadSource: (e.target as HTMLSelectElement)
                      .value as PublishDeliverableSource,
                  })}
                        style="padding: 6px 8px; border-radius: 7px; background: #18191d; border: 1px solid rgba(255, 255, 255, 0.12); color: #f8fafc; font-size: 0.71rem;"
                      >
                        <option value="glb">Edited 3D Model (.glb)</option>
                        <option value="frag">Edited Fragments (.frag)</option>
                        <option value="file">Local File (.ifc / .bcf / .glb)</option>
                        <option value="metadata">Metadata Entry Only</option>
                      </select>
                    </div>

                    ${uploadSource === "glb" || uploadSource === "frag"
                  ? BUI.html`
                        <select
                          .value=${selectedModelId}
                          @change=${(e: Event) =>
                      update({ uploadModelId: (e.target as HTMLSelectElement).value })}
                          style="width: 100%; padding: 6px 8px; border-radius: 7px; background: #18191d; border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1; font-size: 0.7rem;"
                        >
                          ${uploadSource === "glb"
                        ? BUI.html`<option value="">All Loaded Models (${loadedModels.length})</option>`
                        : BUI.html`<option value="">Active First Model (${loadedModels[0] || "none"})</option>`}
                          ${loadedModels.map(
                          (id) => BUI.html`<option value=${id}>${id}</option>`
                        )}
                        </select>
                      `
                  : uploadSource === "file"
                    ? BUI.html`
                          <label style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 9px; border-radius: 7px; background: #18191d; border: 1px dashed rgba(56, 189, 248, 0.4); color: #e2e8f0; font-size: 0.69rem; cursor: pointer;">
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              ${state.uploadFile
                          ? `${state.uploadFile.name} (${Math.max(1, Math.round(state.uploadFile.size / 1024))} KB)`
                          : "Choose .ifc, .glb, .gltf, .bcf, or .pdf..."}
                            </span>
                            <span style="color: #38bdf8; font-weight: 700; flex-shrink: 0;">Browse</span>
                            <input
                              type="file"
                              accept=".ifc,.glb,.gltf,.bcf,.bcfzip,.frag,.pdf"
                              style="display: none;"
                              @change=${(e: Event) => {
                          const file = (e.target as HTMLInputElement).files?.[0] || null;
                          update({
                            uploadFile: file,
                            uploadName:
                              state.uploadName ||
                              (file ? file.name.replace(/\.[^.]+$/, "") : undefined),
                          });
                        }}
                            />
                          </label>
                        `
                    : ""}

                    ${uploadSource === "glb" || uploadSource === "frag"
                  ? BUI.html`
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 0.66rem; color: #94a3b8; cursor: pointer;">
                          <input
                            type="checkbox"
                            .checked=${alsoDownload}
                            @change=${(e: Event) =>
                        update({ alsoDownload: (e.target as HTMLInputElement).checked })}
                          />
                          <span>Also save local .${uploadSource} backup copy</span>
                        </label>
                      `
                  : ""}

                    <div style="display: flex; gap: 6px;">
                      ${uploadSource === "glb" || uploadSource === "frag"
                  ? BUI.html`
                          <button
                            type="button"
                            ?disabled=${cype.isBusy || loadedModels.length === 0}
                            @click=${() => {
                        const title = (
                          state.uploadName ||
                          `BIM_Export_${new Date().toISOString().slice(0, 10)}`
                        ).trim();
                        void cype
                          .exportActiveModel(uploadSource, selectedModelId || undefined, title)
                          .catch(() => {});
                      }}
                            style="flex: 1; padding: 7px 10px; border-radius: 7px; border: 1px solid rgba(56, 189, 248, 0.45); background: rgba(56, 189, 248, 0.12); color: #7dd3fc; font-size: 0.7rem; font-weight: 700; cursor: pointer;"
                          >
                            Export .${uploadSource.toUpperCase()}
                          </button>
                        `
                  : ""}
                      <button
                        type="button"
                        ?disabled=${cype.isBusy}
                        @click=${() => {
                    const title = (
                      state.uploadName ||
                      `BIM Coordination Update (${new Date().toLocaleDateString()})`
                    ).trim();
                    const disc = state.uploadDiscipline || "Coordination";
                    void cype
                      .publishContribution({
                        name: title,
                        discipline: disc,
                        source: uploadSource,
                        modelId: selectedModelId || undefined,
                        file: state.uploadFile || null,
                        alsoDownload,
                      })
                      .then(() => {
                        update({ showUploadForm: false, uploadFile: null });
                      })
                      .catch(() => {});
                  }}
                        style="flex: 1; padding: 7px 12px; border-radius: 7px; border: none; background: #10b981; color: #052e16; font-size: 0.71rem; font-weight: 700; cursor: pointer;"
                      >
                        ${cype.isBusy ? "Publishing..." : "Publish Now"}
                      </button>
                    </div>
                  </div>
                `;
            })()
          : BUI.html`
                  <button
                    type="button"
                    @click=${() => update({ showUploadForm: true })}
                    style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.16); color: #34d399; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                    title="Publish a coordination deliverable back to BIMserver.center"
                  >
                    + Publish / Upload Contribution → BIMserver.center
                  </button>
                `}
          `
      : tab === "issues"
        ? BUI.html`
            <!-- Issue Composer Card -->
            <div style="display: flex; flex-direction: column; gap: 7px; padding: 10px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.3);">
              <input
                type="text"
                .value=${newIssueDraft}
                @input=${(e: Event) => { newIssueDraft = (e.target as HTMLInputElement).value; }}
                placeholder="Describe coordination clash or BCF note..."
                style=${inputStyle}
              />
              <div style="display: grid; grid-template-columns: 1fr 0.9fr auto; gap: 6px; align-items: center;">
                <select
                  .value=${issueDisc}
                  @change=${(e: Event) => update({ newIssueDiscipline: (e.target as HTMLSelectElement).value as CypeIssue["discipline"] })}
                  style="padding: 5px 7px; border-radius: 6px; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(148, 163, 184, 0.25); color: #cbd5e1; font-size: 0.70rem;"
                >
                  <option value="Structure">Structure</option>
                  <option value="Architecture">Architecture</option>
                  <option value="MEP">MEP</option>
                  <option value="Quantities">Quantities</option>
                </select>
                <select
                  .value=${issuePri}
                  @change=${(e: Event) => update({ newIssuePriority: (e.target as HTMLSelectElement).value as CypeIssue["priority"] })}
                  style="padding: 5px 7px; border-radius: 6px; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(148, 163, 184, 0.25); color: #cbd5e1; font-size: 0.70rem;"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button
                  type="button"
                  @click=${() => {
            if (newIssueDraft.trim()) {
              cype.createIssue(newIssueDraft.trim(), issueDisc, issuePri);
              update({ newIssueTitle: "" });
            }
          }}
                  style="padding: 6px 12px; border-radius: 7px; border: none; background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff; font-size: 0.71rem; font-weight: 700; cursor: pointer;"
                >
                  + Log Issue
                </button>
              </div>
            </div>

            <!-- Status Filter & Batch Sync Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
              <div style="display: flex; gap: 5px;">
                ${(["all", "pending", "solved"] as const).map((st) => {
            const active = issueStatusFilter === st;
            return BUI.html`
                    <button
                      type="button"
                      @click=${() => update({ issueStatusFilter: st })}
                      style="padding: 4px 9px; border-radius: 999px; font-size: 0.67rem; font-weight: 700; text-transform: capitalize; cursor: pointer; background: ${active ? "rgba(245, 158, 11, 0.22)" : "rgba(30, 41, 59, 0.65)"}; border: 1px solid ${active ? "#f59e0b" : "rgba(148, 163, 184, 0.2)"}; color: ${active ? "#fbbf24" : "#94a3b8"};"
                    >${st}</button>
                  `;
          })}
              </div>
              <button
                type="button"
                @click=${() => cype.importAllIssuesToProject()}
                style="padding: 4px 9px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.14); color: #7dd3fc; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
              >
                Sync All → Topics
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; padding-right: 2px;">
              ${visibleIssues.length === 0
            ? BUI.html`
                    <div style="padding: 24px 16px; text-align: center; border-radius: 10px; border: 1px dashed rgba(148, 163, 184, 0.25); font-size: 0.72rem; color: #64748b;">
                      No coordination issues match this status filter.
                    </div>
                  `
            : visibleIssues.map((iss) => {
              const imported = cype.importedIssueIds.has(iss.id);
              const pColor = PRIORITY_COLOR[iss.priority] || "#94a3b8";
              return BUI.html`
                      <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(148, 163, 184, 0.2); border-left: 3px solid ${pColor};">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                          <div style="display: flex; align-items: center; gap: 7px;">
                            <span style="font-size: 0.68rem; font-weight: 800; color: #38bdf8;">${iss.displayId}</span>
                            <span style="font-size: 0.62rem; font-weight: 700; color: ${pColor}; text-transform: uppercase;">● ${iss.priority}</span>
                            <span style="font-size: 0.62rem; color: #94a3b8;">${iss.discipline}</span>
                          </div>
                          <span style="font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 5px; background: ${statusPillBg(iss.status)}; color: ${statusPillColor(iss.status)}; text-transform: capitalize;">
                            ${iss.status}
                          </span>
                        </div>
                        <div style="font-size: 0.76rem; font-weight: 700; color: #f8fafc;">${iss.title}</div>
                        <div style="font-size: 0.68rem; color: #94a3b8; line-height: 1.35;">${iss.description}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                          <span style="font-size: 0.65rem; color: #64748b;">Due ${iss.dueDate} · ${iss.assignedTo}</span>
                          <button
                            type="button"
                            @click=${() => cype.importIssueToProject(iss)}
                            style="padding: 4px 10px; border-radius: 6px; border: 1px solid ${imported ? "#10b981" : "rgba(56, 189, 248, 0.45)"}; background: ${imported ? "rgba(16, 185, 129, 0.2)" : "rgba(56, 189, 248, 0.16)"}; color: ${imported ? "#34d399" : "#7dd3fc"}; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
                          >
                            ${imported ? "✓ Synced Topic" : "Load as Topic"}
                          </button>
                        </div>
                      </div>
                    `;
            })}
            </div>
          `
        : BUI.html`
            <!-- Card 1: Mode & Environment -->
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px 12px; border-radius: 10px; background: #121316; border: 1px solid rgba(255, 255, 255, 0.1);">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span style="font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8;">Secure Backend Proxy</span>
                <span style="font-size: 0.63rem; font-weight: 700; color: ${isSameOriginProxy ? "#34d399" : "#94a3b8"};">
                  ${isSameOriginProxy
            ? isLocalDevOrigin
              ? "● Built-in Web Proxy"
              : "● Direct BIMserver.center API"
            : "● External Proxy"
          }
                </span>
              </div>
              <code style="display: block; overflow-wrap: anywhere; color: #e2e8f0; background: #18191d; padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.06); font-size: 0.65rem;">${isSameOriginProxy && !isLocalDevOrigin ? "https://apis.bimserver.center/v1/BIMSERVER" : cype.auth.proxyEndpoint || CYPE_PROXY_ENDPOINT}</code>
              <p style="margin: 0; color: #94a3b8; font-size: 0.64rem; line-height: 1.4;">
                ${isSameOriginProxy
            ? isLocalDevOrigin
              ? "Handled directly by the built-in Vite web server proxy (/cypeProxy) on this origin."
              : "Connected directly to BIMserver.center REST API over HTTPS (100% free Firebase Spark Hosting)."
            : "Using external CYPE proxy URL configured via VITE_CYPE_FUNCTIONS_URL."
          }
              </p>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button
                  type="button"
                  @click=${() => {
            cype.saveAuth({ mode: "sandbox" });
            cype.syncLiveWorkspace();
          }}
                  style="padding: 7px; border-radius: 8px; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${!isLiveMode ? "rgba(16, 185, 129, 0.22)" : "rgba(30, 41, 59, 0.5)"}; border: 1px solid ${!isLiveMode ? "#10b981" : "rgba(148, 163, 184, 0.22)"}; color: ${!isLiveMode ? "#34d399" : "#94a3b8"};"
                >OpenBIM Sandbox</button>
                <button
                  type="button"
                  @click=${() => {
            cype.saveAuth({ mode: "live-cype" });
            if (cype.auth.sessionId.trim()) cype.syncLiveWorkspace();
          }}
                  style="padding: 7px; border-radius: 8px; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${isLiveMode ? "rgba(56, 189, 248, 0.22)" : "rgba(30, 41, 59, 0.5)"}; border: 1px solid ${isLiveMode ? "#38bdf8" : "rgba(148, 163, 184, 0.22)"}; color: ${isLiveMode ? "#7dd3fc" : "#94a3b8"};"
                >Live BIMserver.center</button>
              </div>
            </div>

            <!-- Card 2: OAuth Actions -->
            <div style="display: flex; flex-direction: column; gap: 8px; padding: 11px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.26);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8;">BIMserver OAuth2 Session</span>
                <span style="font-size: 0.63rem; color: ${sessionHealthy ? "#34d399" : "#fbbf24"}; font-weight: 700;">
                  ${sessionHealthy ? "● Token Loaded" : "● Not Signed In"}
                </span>
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button
                  type="button"
                  @click=${() => void cype.startAuthorization(state.projectId).catch(() => update())}
                  style="flex: 1; min-width: 145px; padding: 8px 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-size: 0.73rem; font-weight: 700; cursor: pointer;"
                >
                  Connect BIMserver.center →
                </button>
                <button
                  type="button"
                  ?disabled=${!canFinishLogin || cype.isBusy}
                  @click=${() => void cype.completeAuthorization().then(() => update())}
                  style="padding: 8px 10px; border-radius: 8px; border: 1px solid ${canFinishLogin ? "rgba(16, 185, 129, 0.5)" : "rgba(148, 163, 184, 0.22)"}; background: ${canFinishLogin ? "rgba(16, 185, 129, 0.16)" : "rgba(30, 41, 59, 0.5)"}; color: ${canFinishLogin ? "#34d399" : "#64748b"}; font-size: 0.71rem; font-weight: 700; cursor: ${canFinishLogin ? "pointer" : "not-allowed"}; opacity: ${canFinishLogin ? "1" : "0.6"};"
                >
                  Finish Login
                </button>
              </div>
              <div style="font-size: 0.64rem; color: #64748b;">
                Callback URI: <code style="color: #94a3b8;">${window.location.origin}/</code>
              </div>
            </div>

            <!-- Card 3: Advanced Developer App Credentials & Session Keys -->
            <details ?open=${!cype.hasBuiltInAppCredentials()} style="padding: 10px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.22);">
              <summary style="cursor: pointer; font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; user-select: none;">
                ${cype.hasBuiltInAppCredentials() ? "Advanced: Custom App Credentials & Token" : "App Credentials (Required for Login)"}
              </summary>
              <div style="display: flex; flex-direction: column; gap: 9px; margin-top: 9px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.64rem; color: #64748b;">
                  ${cype.hasBuiltInAppCredentials() ? "Built-in app login is active for all users." : "Configure VITE_CYPE_CLIENT_ID & VITE_CYPE_CLIENT_SECRET in .env.local so users can sign in with 1 click."}
                </span>
                <button
                  type="button"
                  @click=${() => update({ showSecrets: !state.showSecrets })}
                  style="display: inline-flex; align-items: center; gap: 4px; background: transparent; border: none; color: #38bdf8; font-size: 0.66rem; font-weight: 600; cursor: pointer; flex-shrink: 0;"
                >
                  <span class="material-icons-round" style="font-size: 14px;">${state.showSecrets ? "visibility_off" : "visibility"}</span>
                  <span>${state.showSecrets ? "Hide" : "Show"}</span>
                </button>
              </div>

              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                <span>Client ID</span>
                <input
                  type="text"
                  .value=${cype.auth.clientId}
                  @input=${(e: Event) => cype.saveAuth({ clientId: (e.target as HTMLInputElement).value })}
                  style=${inputStyle}
                />
              </label>

              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                <span>Client Secret (kept in memory only)</span>
                <input
                  type=${state.showSecrets ? "text" : "password"}
                  .value=${cype.auth.clientSecret}
                  @input=${(e: Event) => cype.saveAuth({ clientSecret: (e.target as HTMLInputElement).value })}
                  placeholder="Enter your CYPE app secret..."
                  style=${inputStyle}
                />
              </label>

              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                <span>Session ID / Bearer Token</span>
                <div style="display: flex; gap: 6px;">
                  <input
                    type=${state.showSecrets ? "text" : "password"}
                    .value=${cype.auth.sessionId}
                    @input=${(e: Event) => cype.saveAuth({ sessionId: (e.target as HTMLInputElement).value, expiresAt: Date.now() + 55 * 60_000 })}
                    placeholder="Auto-filled on login, or paste Bearer session_id..."
                    style=${inputStyle}
                  />
                  <button
                    type="button"
                    @click=${() => {
            cype.saveAuth({ mode: "live-cype" });
            cype.syncLiveWorkspace();
          }}
                    style="padding: 0 10px; border-radius: 7px; border: 1px solid rgba(56, 189, 248, 0.45); background: rgba(56, 189, 248, 0.16); color: #7dd3fc; font-size: 0.69rem; font-weight: 700; cursor: pointer; flex-shrink: 0;"
                  >
                    Sync Live
                  </button>
                </div>
              </label>

              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid rgba(148, 163, 184, 0.15); font-size: 0.67rem;">
                <a href=${CYPE_DEV_PORTAL_URL} target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none; font-weight: 600;">
                  BIMserver Developers Portal ↗
                </a>
                ${hasSession
            ? BUI.html`
                      <button
                        type="button"
                        @click=${() => cype.clearSession()}
                        style="background: transparent; border: none; color: #f87171; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
                      >Sign Out</button>
                    `
            : ""}
              </div>
              </div>
            </details>
            <p style="margin: 0; color: #64748b; font-size: 0.64rem; line-height: 1.4;">
              Client secrets and bearer tokens stay in memory and are cleared when the viewer closes. Use only a trusted HTTPS backend; credentials are never sent directly to BIMserver.center from this UI.
            </p>
          `}
    </div>
  `;
};
