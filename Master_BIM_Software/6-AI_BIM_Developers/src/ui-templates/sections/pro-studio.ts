import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { BimProSuite } from "../../bim-components/BimProSuite";

export interface ProStudioSectionState {
  components: OBC.Components;
  activeTab?: "clash" | "4d" | "editor";
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
  const tab = state.activeTab || "clash";

  const total4dCost = pro.phases.reduce((s, p) => s + p.estCostUsd, 0) || 1;
  let runningCost = 0;
  const curvePoints: Array<{ x: number; y: number; pct: number; color: string }> = [
    { x: 10, y: 82, pct: 0, color: "#38bdf8" },
  ];
  for (const ph of pro.phases) {
    runningCost += ph.estCostUsd;
    curvePoints.push({
      x: 10 + (ph.endPct / 100) * 260,
      y: 82 - (runningCost / total4dCost) * 68,
      pct: ph.endPct,
      color: ph.color,
    });
  }
  const polylinePts = curvePoints.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

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
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(15, 23, 42, 0.94));
          border: 1px solid rgba(192, 132, 252, 0.4);
        "
      >
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.86rem; font-weight: 800; color: #f8fafc;">BIM Pro Studio</span>
            <span style="font-size: 0.60rem; padding: 1px 6px; border-radius: 4px; background: rgba(168, 85, 247, 0.25); color: #d8b4fe; font-weight: 700;">QA · 4D · FRAG</span>
          </div>
          <span style="font-size: 0.69rem; color: #94a3b8;">Clash Detection, 4D Timeline &amp; Live Property Overrides</span>
        </div>
      </div>

      <!-- Status Strip -->
      <div style="padding: 6px 10px; border-radius: 7px; background: rgba(30, 41, 59, 0.68); border: 1px solid rgba(148, 163, 184, 0.22); font-size: 0.70rem; color: #e2e8f0;">
        ${pro.statusMessage}
      </div>

      <!-- Tabs -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
        <button
          type="button"
          @click=${() => update({ activeTab: "clash" })}
          style="padding: 7px 6px; border-radius: 8px; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${tab === "clash" ? "rgba(239, 68, 68, 0.2)" : "rgba(30, 41, 59, 0.65)"}; border: 1px solid ${tab === "clash" ? "#ef4444" : "rgba(148, 163, 184, 0.22)"}; color: ${tab === "clash" ? "#fca5a5" : "#94a3b8"};"
        >
          Clash QA (${pro.clashes.length})
        </button>
        <button
          type="button"
          @click=${async () => {
      if (pro.phases.length === 0) await pro.buildConstructionPhases();
      update({ activeTab: "4d" });
    }}
          style="padding: 7px 6px; border-radius: 8px; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${tab === "4d" ? "rgba(56, 189, 248, 0.22)" : "rgba(30, 41, 59, 0.65)"}; border: 1px solid ${tab === "4d" ? "#38bdf8" : "rgba(148, 163, 184, 0.22)"}; color: ${tab === "4d" ? "#7dd3fc" : "#94a3b8"};"
        >
          4D Phasing
        </button>
        <button
          type="button"
          @click=${() => update({ activeTab: "editor" })}
          style="padding: 7px 6px; border-radius: 8px; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${tab === "editor" ? "rgba(168, 85, 247, 0.22)" : "rgba(30, 41, 59, 0.65)"}; border: 1px solid ${tab === "editor" ? "#c084fc" : "rgba(148, 163, 184, 0.22)"}; color: ${tab === "editor" ? "#e9d5ff" : "#94a3b8"};"
        >
          Edit &amp; .FRAG
        </button>
      </div>

      ${tab === "clash"
      ? BUI.html`
            <!-- 3D Clash Matrix Config -->
            <div style="display: flex; flex-direction: column; gap: 7px; padding: 10px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(239, 68, 68, 0.28);">
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                <span>Discipline A (Red Highlight)</span>
                <select
                  .value=${pro.disciplineA}
                  @change=${(e: Event) => { pro.disciplineA = (e.target as HTMLSelectElement).value; update(); }}
                  style="padding: 6px 8px; border-radius: 6px; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.71rem;"
                >
                  ${DISCIPLINE_OPTIONS.map((o) => BUI.html`<option value=${o.value} ?selected=${pro.disciplineA === o.value}>${o.label}</option>`)}
                </select>
              </label>
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #94a3b8;">
                <span>Discipline B (Cyan Highlight)</span>
                <select
                  .value=${pro.disciplineB}
                  @change=${(e: Event) => { pro.disciplineB = (e.target as HTMLSelectElement).value; update(); }}
                  style="padding: 6px 8px; border-radius: 6px; background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(148, 163, 184, 0.28); color: #f8fafc; font-size: 0.71rem;"
                >
                  ${DISCIPLINE_OPTIONS.map((o) => BUI.html`<option value=${o.value} ?selected=${pro.disciplineB === o.value}>${o.label}</option>`)}
                </select>
              </label>

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
                  style="padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(30, 41, 59, 0.85); color: #cbd5e1; font-size: 0.72rem; font-weight: 600; cursor: pointer;"
                >
                  Clear
                </button>
              </div>

              ${pro.clashes.length > 0
          ? BUI.html`
                    <div style="display: flex; gap: 6px;">
                      <button
                        type="button"
                        @click=${() => pro.onClashLogRequested.trigger(pro.clashes)}
                        style="flex: 1; padding: 6px 8px; border-radius: 7px; border: 1px solid rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.16); color: #fcd34d; font-size: 0.69rem; font-weight: 700; cursor: pointer;"
                      >
                        Log Clashes → Project Tasks
                      </button>
                      <button
                        type="button"
                        @click=${() => pro.exportClashesToGoogleSheet().catch((e) => { pro.statusMessage = e?.message || "Export failed"; update(); })}
                        style="flex: 1; padding: 6px 8px; border-radius: 7px; border: 1px solid rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.16); color: #34d399; font-size: 0.69rem; font-weight: 700; cursor: pointer;"
                      >
                        Export → Google Sheet
                      </button>
                    </div>
                  `
          : ""}
            </div>

            <!-- Clash Results Table -->
            <div style="flex: 1; overflow-y: auto; border-radius: 9px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(9, 13, 22, 0.85);">
              ${pro.clashes.length === 0
          ? BUI.html`<div style="padding: 24px; text-align: center; font-size: 0.72rem; color: #64748b;">Select two BIM disciplines above and click "Run 3D Clash Scan".</div>`
          : pro.clashes.map(
            (c) => BUI.html`
                      <button
                        type="button"
                        @click=${() => pro.focusClash(c)}
                        style="display: flex; flex-direction: column; gap: 3px; width: 100%; padding: 8px 10px; border: none; border-bottom: 1px solid rgba(148, 163, 184, 0.12); background: transparent; text-align: left; cursor: pointer;"
                      >
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                          <span style="font-size: 0.70rem; font-weight: 800; color: ${c.severity === "high" ? "#f87171" : "#fbbf24"};">
                            ${c.id} · ${c.severity.toUpperCase()} (${c.overlapVolumeM3} m³)
                          </span>
                          <span style="font-size: 0.65rem; color: #7dd3fc;">Inspect →</span>
                        </div>
                        <div style="font-size: 0.72rem; color: #f8fafc; font-weight: 600;">
                          ${c.aName} <span style="color: #94a3b8;">×</span> ${c.bName}
                        </div>
                        <div style="font-size: 0.64rem; color: #64748b;">
                          ${c.aCategory} vs ${c.bCategory}
                        </div>
                      </button>
                    `
          )}
            </div>
          `
      : tab === "4d"
        ? BUI.html`
            <!-- 4D Construction Phasing Controls -->
            <div style="display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.71rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Construction Timeline</span>
                <span style="font-size: 0.85rem; font-weight: 800; color: #38bdf8;">${pro.phaseProgress}% Built</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                .value=${String(pro.phaseProgress)}
                @input=${(e: Event) => pro.setPhaseProgress(Number((e.target as HTMLInputElement).value))}
                style="width: 100%; accent-color: #38bdf8; cursor: pointer;"
              />

              <div style="display: flex; gap: 6px;">
                <button
                  type="button"
                  @click=${() => pro.togglePlay4D()}
                  style="flex: 1.2; padding: 7px 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-size: 0.73rem; font-weight: 700; cursor: pointer;"
                >
                  ${pro.isPlaying4D ? "⏸ Pause 4D" : "▶ Play 4D Assembly"}
                </button>
                <button
                  type="button"
                  @click=${() => { pro.stopPlay4D(); pro.setPhaseProgress(100); }}
                  style="padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(30, 41, 59, 0.85); color: #cbd5e1; font-size: 0.72rem; font-weight: 600; cursor: pointer;"
                >
                  Reset 100%
                </button>
              </div>

              <!-- SVG CapEx S-Curve Chart -->
              <div style="padding: 8px; border-radius: 8px; background: rgba(9, 13, 22, 0.85); border: 1px solid rgba(148, 163, 184, 0.16);">
                <div style="font-size: 0.64rem; color: #94a3b8; font-weight: 700; margin-bottom: 4px;">CUMULATIVE CAPEX S-CURVE</div>
                <svg viewBox="0 0 280 92" style="width: 100%; height: 84px; display: block;">
                  <line x1="10" y1="82" x2="270" y2="82" stroke="rgba(148,163,184,0.25)" stroke-width="1" />
                  <line x1="${10 + (pro.phaseProgress / 100) * 260}" y1="10" x2="${10 + (pro.phaseProgress / 100) * 260}" y2="82" stroke="#38bdf8" stroke-dasharray="3 3" stroke-width="1.2" />
                  <polyline fill="none" stroke="#34d399" stroke-width="2.2" points=${polylinePts} />
                  ${curvePoints.map(
          (pt) => BUI.html`<circle cx=${pt.x} cy=${pt.y} r="3.5" fill=${pt.color} stroke="#0f172a" stroke-width="1" />`
        )}
                </svg>
              </div>
            </div>

            <!-- Phase Breakdown -->
            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto;">
              ${pro.phases.map((ph) => {
          const isDone = pro.phaseProgress >= ph.endPct;
          const isActive = pro.phaseProgress > ph.startPct && pro.phaseProgress < ph.endPct;
          return BUI.html`
                  <button
                    type="button"
                    @click=${() => pro.setPhaseProgress(ph.endPct)}
                    style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 8px; border: 1px solid ${isActive ? ph.color : "rgba(148, 163, 184, 0.2)"}; background: ${isDone || isActive ? "rgba(30, 41, 59, 0.82)" : "rgba(15, 23, 42, 0.55)"}; text-align: left; cursor: pointer;"
                  >
                    <div>
                      <div style="font-size: 0.73rem; font-weight: 700; color: #f8fafc;">${ph.label}</div>
                      <div style="font-size: 0.65rem; color: #94a3b8;">${ph.count} elements · Est. $${ph.estCostUsd.toLocaleString()}</div>
                    </div>
                    <span style="font-size: 0.68rem; font-weight: 700; color: ${ph.color};">${ph.endPct}%</span>
                  </button>
                `;
        })}
            </div>
          `
        : BUI.html`
            <!-- Live Property Override Editor & .FRAG Binary Exporter -->
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(192, 132, 252, 0.32);">
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
                    <div style="padding: 8px 10px; border-radius: 8px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(148, 163, 184, 0.2);">
                      <div style="font-size: 0.76rem; font-weight: 700; color: #f8fafc;">${target.name}</div>
                      <div style="font-size: 0.66rem; color: #7dd3fc;">${target.category} · LocalID #${target.localId}</div>
                    </div>

                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Fire Rating / Specification</span>
                      <input type="text" .value=${fireDraft} @input=${(e: Event) => { fireDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(30,41,59,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Construction Stage / Phase</span>
                      <input type="text" .value=${phaseDraft} @input=${(e: Event) => { phaseDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(30,41,59,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Unit Cost Override (USD)</span>
                      <input type="number" .value=${costDraft} @input=${(e: Event) => { costDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(30,41,59,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
                    </label>
                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                      <span>Engineer Notes</span>
                      <input type="text" .value=${notesDraft} @input=${(e: Event) => { notesDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(30,41,59,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
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
