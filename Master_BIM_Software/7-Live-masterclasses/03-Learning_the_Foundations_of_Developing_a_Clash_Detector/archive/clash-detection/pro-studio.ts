import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { BimProSuite } from "../../bim-components/BimProSuite";

export interface ProStudioSectionState {
  components: OBC.Components;
  activeTab?: "clash" | "editor";
  clashSeverityFilter?: "all" | "high" | "medium" | "low";
  clashClusterFilter?: string;
  fireRatingDraft?: string;
  phaseTagDraft?: string;
  costUsdDraft?: string;
  notesDraft?: string;
}

const DISCIPLINE_OPTIONS = [
  { label: "Structure (Columns / Beams / Footings)", value: "IFCCOLUMN|IFCBEAM|IFCMEMBER|IFCFOOTING" },
  { label: "Architecture (Walls / Slabs / Roofs)", value: "IFCWALL|IFCWALLSTANDARDCASE|IFCSLAB|IFCROOF" },
  { label: "Openings & Glazing (Doors / Windows)", value: "IFCDOOR|IFCWINDOW|IFCCURTAINWALL" },
  { label: "MEP & Fixtures (Pipes / Ducts / Furnish)", value: "IFCPIPE|IFCDUCT|IFCFLOW|IFCFURNISHING" },
];

/**
 * Advanced Pro BIM Studio Panel:
 * - Real-time 3D Bounding-Box Clash QA & Markers
 * - 4D Construction Phasing & CapEx S-Curve Simulator
 * - Live Element Property Override Editor & .FRAG Binary Snapshot Exporter
 */
export const proStudioTemplate: BUI.StatefullComponent<ProStudioSectionState> = (
  state: ProStudioSectionState,
  update
) => {
  const { components } = state;
  const pro = components.get(BimProSuite);
  const tab = state.activeTab === "editor" ? "editor" : "clash";

  const target = pro.selectedEditTarget;
  let fireDraft = state.fireRatingDraft ?? target?.fireRating ?? "";
  let phaseDraft = state.phaseTagDraft ?? target?.phaseTag ?? "";
  let costDraft = state.costUsdDraft ?? target?.costUsd ?? "";
  let notesDraft = state.notesDraft ?? target?.notes ?? "";

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 11px; width: 100%; height: 100%; padding: 14px 16px; box-sizing: border-box;">
      <!-- Pro Studio Header -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(19, 20, 24, 0.94));
          border: 1px solid rgba(192, 132, 252, 0.4);
        "
      >
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.86rem; font-weight: 800; color: #f8fafc;">BIM Pro Studio</span>
            <span style="font-size: 0.60rem; padding: 1px 6px; border-radius: 4px; background: rgba(168, 85, 247, 0.25); color: #d8b4fe; font-weight: 700;">CLASH QA · FRAG</span>
          </div>
          <span style="font-size: 0.69rem; color: #94a3b8;">4-Stage Clash Detection &amp; Live Property Overrides</span>
        </div>
      </div>

      <!-- Status Strip -->
      <div style="padding: 6px 10px; border-radius: 7px; background: rgba(32, 33, 38, 0.68); border: 1px solid rgba(148, 163, 184, 0.22); font-size: 0.70rem; color: #e2e8f0;">
        ${pro.statusMessage}
      </div>

      <!-- Tabs -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        <button
          type="button"
          @click=${() => update({ activeTab: "clash" })}
          style="padding: 7px 6px; border-radius: 8px; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${tab === "clash" ? "rgba(239, 68, 68, 0.2)" : "rgba(32, 33, 38, 0.65)"}; border: 1px solid ${tab === "clash" ? "#ef4444" : "rgba(148, 163, 184, 0.22)"}; color: ${tab === "clash" ? "#fca5a5" : "#94a3b8"};"
        >
          Clash QA (${pro.clashes.length})
        </button>
        <button
          type="button"
          @click=${() => update({ activeTab: "editor" })}
          style="padding: 7px 6px; border-radius: 8px; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${tab === "editor" ? "rgba(168, 85, 247, 0.22)" : "rgba(32, 33, 38, 0.65)"}; border: 1px solid ${tab === "editor" ? "#c084fc" : "rgba(148, 163, 184, 0.22)"}; color: ${tab === "editor" ? "#e9d5ff" : "#94a3b8"};"
        >
          Edit &amp; .FRAG
        </button>
      </div>

      ${tab === "clash"
      ? BUI.html`
            <!-- 3D Clash Matrix Config -->
            <div style="display: flex; flex-direction: column; gap: 7px; padding: 10px 12px; border-radius: 10px; background: rgba(19, 20, 24, 0.85); border: 1px solid rgba(239, 68, 68, 0.28);">
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                <span>Discipline A (Red Highlight)</span>
                <select
                  .value=${pro.disciplineA}
                  @change=${(e: Event) => { pro.disciplineA = (e.target as HTMLSelectElement).value; update(); }}
                  style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.71rem;"
                >
                  ${DISCIPLINE_OPTIONS.map((o) => BUI.html`<option value=${o.value} ?selected=${pro.disciplineA === o.value}>${o.label}</option>`)}
                </select>
              </label>
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                <span>Discipline B (Cyan Highlight)</span>
                <select
                  .value=${pro.disciplineB}
                  @change=${(e: Event) => { pro.disciplineB = (e.target as HTMLSelectElement).value; update(); }}
                  style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.71rem;"
                >
                  ${DISCIPLINE_OPTIONS.map((o) => BUI.html`<option value=${o.value} ?selected=${pro.disciplineB === o.value}>${o.label}</option>`)}
                </select>
              </label>

              <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 6px;">
                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                  <span>Detection Mode</span>
                  <select
                    .value=${pro.clashMode}
                    @change=${(e: Event) => {
                      pro.clashMode = (e.target as HTMLSelectElement).value as any;
                      if (pro.clashMode === "clearance" && pro.toleranceMeters <= 0) {
                        pro.toleranceMeters = 0.25;
                      } else if (pro.clashMode === "hard" && pro.toleranceMeters > 0) {
                        pro.toleranceMeters = -0.02;
                      }
                      update();
                    }}
                    style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.71rem;"
                  >
                    <option value="hard">Hard Clash (Intersection)</option>
                    <option value="clearance">Clearance (Soft Distance)</option>
                    <option value="containment">Full Containment</option>
                  </select>
                </label>
                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                  <span>${pro.clashMode === "clearance" ? "Clearance (m)" : "Tolerance (m)"}</span>
                  <input
                    type="number"
                    step="0.01"
                    .value=${String(pro.toleranceMeters)}
                    @input=${(e: Event) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (Number.isFinite(val)) pro.toleranceMeters = val;
                    }}
                    style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.71rem; box-sizing: border-box;"
                  />
                </label>
              </div>

              <div style="display: flex; gap: 6px; margin-top: 2px;">
                <button
                  type="button"
                  @click=${() => pro.runClashDetection()}
                  style="flex: 1.4; padding: 8px 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff; font-size: 0.73rem; font-weight: 700; cursor: pointer;"
                >
                  ${pro.isBusy ? "Scanning..." : "Run 3D Clash Scan"}
                </button>
                <button
                  type="button"
                  @click=${() => pro.clearClashMarkers()}
                  style="padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(32, 33, 38, 0.85); color: #cbd5e1; font-size: 0.72rem; font-weight: 600; cursor: pointer;"
                >
                  Clear
                </button>
              </div>

              ${pro.clashes.length > 0
          ? BUI.html`
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                      <button
                        type="button"
                        @click=${() => pro.onClashLogRequested.trigger(pro.clashes)}
                        style="flex: 1; min-width: 110px; padding: 6px 8px; border-radius: 7px; border: 1px solid rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.16); color: #fcd34d; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
                      >
                        Log → Tasks
                      </button>
                      <button
                        type="button"
                        ?disabled=${pro.isBusy}
                        @click=${() => void pro.publishClashesToCype()}
                        style="flex: 1; min-width: 110px; padding: 6px 8px; border-radius: 7px; border: 1px solid rgba(56, 189, 248, 0.45); background: rgba(56, 189, 248, 0.16); color: #7dd3fc; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
                      >
                        Publish → CYPE
                      </button>
                      <button
                        type="button"
                        @click=${() => pro.exportClashesToGoogleSheet().catch((e) => { pro.statusMessage = e?.message || "Export failed"; update(); })}
                        style="flex: 1; min-width: 110px; padding: 6px 8px; border-radius: 7px; border: 1px solid rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.16); color: #34d399; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
                      >
                        Export → Sheet
                      </button>
                    </div>
                  `
          : ""}
            </div>

            ${pro.clashMetrics
          ? BUI.html`
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding: 7px 9px; border-radius: 8px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.24); font-size: 0.63rem; text-align: center;">
                    <div>
                      <div style="color: #64748b; font-weight: 700;">1. AABB</div>
                      <div style="color: #f8fafc; font-weight: 800;">${pro.clashMetrics.elementsA}×${pro.clashMetrics.elementsB}</div>
                    </div>
                    <div>
                      <div style="color: #64748b; font-weight: 700;">2. Sweep 1D</div>
                      <div style="color: #7dd3fc; font-weight: 800;">${pro.clashMetrics.sweepPrunePairs}</div>
                    </div>
                    <div>
                      <div style="color: #64748b; font-weight: 700;">3. 3D Box</div>
                      <div style="color: #fbbf24; font-weight: 800;">${pro.clashMetrics.aabbCandidates}</div>
                    </div>
                    <div>
                      <div style="color: #64748b; font-weight: 700;">4. Verified</div>
                      <div style="color: #34d399; font-weight: 800;">${pro.clashMetrics.verifiedClashes} (${pro.clashMetrics.clusterCount}C)</div>
                    </div>
                    <div style="grid-column: 1 / -1; padding-top: 3px; border-top: 1px solid rgba(148, 163, 184, 0.14); color: #94a3b8; display: flex; justify-content: space-between;">
                      <span>Pruned: <strong style="color: #34d399;">${pro.clashMetrics.discardedPct}%</strong></span>
                      <span>Brute-force: ${pro.clashMetrics.bruteForcePairs}</span>
                      <span>Time: <strong style="color: #7dd3fc;">${pro.clashMetrics.durationMs}ms</strong></span>
                    </div>
                  </div>
                `
          : ""}

            ${pro.clashes.length > 0
          ? (() => {
              const sevFilter = state.clashSeverityFilter || "all";
              const clusterFilter = state.clashClusterFilter || "all";
              const clusters = Array.from(
                new Set(pro.clashes.map((c) => c.clusterId).filter(Boolean) as string[])
              );
              const filteredClashes = pro.clashes.filter((c) => {
                const okSev = sevFilter === "all" || c.severity === sevFilter;
                const okCluster = clusterFilter === "all" || c.clusterId === clusterFilter;
                return okSev && okCluster;
              });

              return BUI.html`
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap;">
                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${(["all", "high", "medium", "low"] as const).map((sev) => {
                      const active = sevFilter === sev;
                      return BUI.html`
                        <button
                          type="button"
                          @click=${() => update({ clashSeverityFilter: sev })}
                          style="padding: 3px 7px; border-radius: 999px; font-size: 0.62rem; font-weight: 700; cursor: pointer; background: ${active ? "rgba(239, 68, 68, 0.22)" : "rgba(30, 41, 59, 0.7)"}; border: 1px solid ${active ? "#ef4444" : "rgba(148, 163, 184, 0.2)"}; color: ${active ? "#fca5a5" : "#94a3b8"};"
                        >${sev.toUpperCase()}</button>
                      `;
                    })}
                  </div>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    ${clusters.length > 1
                      ? BUI.html`
                          <select
                            .value=${clusterFilter}
                            @change=${(e: Event) => update({ clashClusterFilter: (e.target as HTMLSelectElement).value })}
                            style="padding: 3px 6px; border-radius: 6px; background: #18191d; border: 1px solid rgba(255, 255, 255, 0.14); color: #cbd5e1; font-size: 0.63rem;"
                          >
                            <option value="all">All Clusters (${clusters.length})</option>
                            ${clusters.map((cid) => BUI.html`<option value=${cid}>Cluster ${cid}</option>`)}
                          </select>
                        `
                      : ""}
                    ${pro.isIsolated
                      ? BUI.html`
                          <button
                            type="button"
                            @click=${() => void pro.clearClashIsolation()}
                            style="padding: 3px 7px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.18); color: #34d399; font-size: 0.63rem; font-weight: 700; cursor: pointer;"
                          >Show All</button>
                        `
                      : ""}
                  </div>
                </div>

                <!-- Clash Results Table -->
                <div style="flex: 1; overflow-y: auto; border-radius: 9px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(9, 13, 22, 0.85);">
                  ${filteredClashes.map(
                    (c) => BUI.html`
                          <div style="display: flex; flex-direction: column; gap: 3px; width: 100%; padding: 8px 10px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); box-sizing: border-box;">
                            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; gap: 6px;">
                              <span style="font-size: 0.70rem; font-weight: 800; color: ${c.severity === "high" ? "#f87171" : "#fbbf24"};">
                                ${c.id} · ${c.severity.toUpperCase()} (${c.overlapVolumeM3} m³)
                              </span>
                              <span style="display: inline-flex; align-items: center; gap: 5px;">
                                ${c.clusterId ? BUI.html`<span style="font-size: 0.60rem; font-weight: 700; padding: 1px 5px; border-radius: 999px; background: rgba(56, 189, 248, 0.16); color: #7dd3fc;">${c.clusterId}</span>` : ""}
                                <button
                                  type="button"
                                  @click=${() => void pro.isolateClashPair(c)}
                                  style="padding: 2px 6px; border-radius: 5px; border: 1px solid rgba(168, 85, 247, 0.4); background: rgba(168, 85, 247, 0.14); color: #e9d5ff; font-size: 0.61rem; font-weight: 700; cursor: pointer;"
                                >Isolate</button>
                                <button
                                  type="button"
                                  @click=${() => void pro.focusClash(c)}
                                  style="padding: 2px 6px; border-radius: 5px; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.14); color: #7dd3fc; font-size: 0.61rem; font-weight: 700; cursor: pointer;"
                                >Inspect →</button>
                              </span>
                            </div>
                            <div style="font-size: 0.72rem; color: #f8fafc; font-weight: 600;">
                              ${c.aName} <span style="color: #94a3b8;">×</span> ${c.bName}
                            </div>
                            <div style="font-size: 0.64rem; color: #64748b;">
                              ${c.aCategory} vs ${c.bCategory}
                            </div>
                          </div>
                        `
                  )}
                </div>
              `;
            })()
          : BUI.html`
                <div style="flex: 1; overflow-y: auto; border-radius: 9px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(9, 13, 22, 0.85);">
                  <div style="padding: 24px; text-align: center; font-size: 0.72rem; color: #64748b;">Select two BIM disciplines above and click "Run 3D Clash Scan".</div>
                </div>
              `}
          `
        : BUI.html`
            <!-- Live Property Override Editor & .FRAG Binary Exporter -->
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 12px; border-radius: 10px; background: rgba(19, 20, 24, 0.85); border: 1px solid rgba(192, 132, 252, 0.32);">
              <div style="display: flex; gap: 6px;">
                <button
                  type="button"
                  @click=${() => pro.inspectSelectedForEdit()}
                  style="flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.5); background: rgba(168, 85, 247, 0.2); color: #e9d5ff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                >
                  Pick Selected Element
                </button>
                <button
                  type="button"
                  @click=${() => pro.exportFragBinary()}
                  style="flex: 1; padding: 8px 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                  title="Compile and download Fragment buffer (.frag)"
                >
                  Export .FRAG Binary
                </button>
              </div>

              ${target
            ? BUI.html`
                    <div style="padding: 8px 10px; border-radius: 8px; background: rgba(32, 33, 38, 0.7); border: 1px solid rgba(148, 163, 184, 0.2);">
                      <div style="font-size: 0.76rem; font-weight: 700; color: #f8fafc;">${target.name}</div>
                      <div style="font-size: 0.66rem; color: #7dd3fc;">${target.category} · LocalID #${target.localId}</div>
                    </div>

                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Fire Rating / Specification</span>
                      <input type="text" .value=${fireDraft} @input=${(e: Event) => { fireDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Construction Stage / Phase</span>
                      <input type="text" .value=${phaseDraft} @input=${(e: Event) => { phaseDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Unit Cost Override (USD)</span>
                      <input type="number" .value=${costDraft} @input=${(e: Event) => { costDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Engineer Notes</span>
                      <input type="text" .value=${notesDraft} @input=${(e: Event) => { notesDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
                    </label>
                    <button
                      type="button"
                      @click=${() => pro.saveSelectedEdits({ fireRating: fireDraft, phaseTag: phaseDraft, costUsd: costDraft, notes: notesDraft })}
                      style="padding: 8px 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; font-size: 0.74rem; font-weight: 700; cursor: pointer;"
                    >
                      Save Element Override
                    </button>
                  `
            : BUI.html`
                    <div style="padding: 18px; text-align: center; font-size: 0.72rem; color: #64748b;">
                      Click any BIM element in the 3D scene, then click "Pick Selected Element" to edit parameters and sync to DataEnhancer / Firestore.
                    </div>
                  `}
            </div>
          `}
    </div>
  `;
};
