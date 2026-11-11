import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { Modeler, ModelerMode, RebarPattern } from "../../bim-components/Modeler";

export interface ModelerSectionState {
  components: OBC.Components;
}

const TABLE_FINISH_PRESETS = [
  { label: "Walnut", hex: "#8b5a2b", roughness: 0.45, metalness: 0.12 },
  { label: "Nordic Oak", hex: "#c89b6e", roughness: 0.55, metalness: 0.08 },
  { label: "Graphite", hex: "#27272a", roughness: 0.35, metalness: 0.45 },
  { label: "Concrete", hex: "#71717a", roughness: 0.8, metalness: 0.05 },
  { label: "Brushed Steel", hex: "#94a3b8", roughness: 0.25, metalness: 0.85 },
];

const REBAR_FINISH_PRESETS = [
  { label: "Epoxy Blue", hex: "#38bdf8" },
  { label: "Black Steel", hex: "#64748b" },
  { label: "Galvanized", hex: "#cbd5e1" },
  { label: "Stainless", hex: "#e4e4e7" },
  { label: "Hazard Amber", hex: "#f59e0b" },
];

/**
 * Module 6 (Lessons 2.5 – 2.7 + Rebar Assignment): Pro Parametric Modeler UI Section.
 * Reactive WebIFC GeometryEngine configurator for Table Assemblies & Structural Rebar Cages.
 */
export const modelerTemplate: BUI.StatefullComponent<ModelerSectionState> = (state) => {
  const { components } = state;
  const modeler = components.get(Modeler);
  const { mode, tableConfig: tc, rebarConfig: rc, takeoff } = modeler;

  const cardBg = "rgba(25, 26, 30, 0.94)";
  const subCardBg = "rgba(34, 35, 41, 0.9)";
  const inputBg = "#121316";
  const borderCol = "rgba(255, 255, 255, 0.12)";

  const renderNumberControl = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (val: number) => void
  ) => BUI.html`
    <div style="display: flex; flex-direction: column; gap: 3px;">
      <div style="display: flex; justify-content: space-between; font-size: 0.66rem; color: #a1a1aa; font-weight: 600;">
        <span>${label}</span>
        <span style="color: #e4e4e7; font-variant-numeric: tabular-nums;">${Number(value.toFixed(3))}</span>
      </div>
      <input
        type="range"
        min=${min}
        max=${max}
        step=${step}
        .value=${String(value)}
        @input=${(e: Event) => onChange(Number((e.target as HTMLInputElement).value))}
        style="width: 100%; accent-color: #38bdf8; cursor: pointer;"
      />
    </div>
  `;

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 10px; padding: 2px; color: #f4f4f5;">
      <!-- Engine Status & Primary Actions -->
      <div
        style="
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 9px 11px; border-radius: 9px;
          background: ${cardBg}; border: 1px solid ${borderCol};
        "
      >
        <div style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 0.76rem; font-weight: 700; color: #f4f4f5;">
            WASM GeometryEngine Studio
          </span>
          <span style="font-size: 0.66rem; color: #a1a1aa;">
            ${modeler.isEngineReady ? "WebIFC Engine Ready" : "Ready on Generate"} · ${modeler.hasGenerated ? `${takeoff?.partCount ?? 0} Parts` : "Idle"}
          </span>
        </div>
        <div style="display: inline-flex; gap: 4px; flex-shrink: 0;">
          <button
            type="button"
            ?disabled=${modeler.isBusy || !modeler.hasGenerated}
            @click=${() => modeler.focusPreview()}
            style="padding: 5px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #e4e4e7; font-size: 0.68rem; font-weight: 600; cursor: pointer;"
          >
            Focus
          </button>
          <button
            type="button"
            ?disabled=${modeler.isBusy}
            @click=${() => modeler.rebuildActiveAssembly(true)}
            style="padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.38); background: rgba(14, 165, 233, 0.16); color: #bae6fd; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
          >
            ${modeler.hasGenerated ? "Rebuild" : "Generate"}
          </button>
        </div>
      </div>

      <!-- Mode Switcher: Parametric Table (2.5-2.7) vs Structural Rebar (Assignment) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 3px; border-radius: 8px; background: ${inputBg}; border: 1px solid ${borderCol};">
        ${([
          { id: "table", label: "Table Assembly (2.5–2.7)" },
          { id: "rebar", label: "Rebar Cage (Assignment)" },
        ] as Array<{ id: ModelerMode; label: string }>).map(
          (item) => BUI.html`
            <button
              type="button"
              @click=${() => modeler.setMode(item.id)}
              style="
                padding: 6px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer;
                border: 1px solid ${mode === item.id ? "rgba(255, 255, 255, 0.24)" : "transparent"};
                background: ${mode === item.id ? subCardBg : "transparent"};
                color: ${mode === item.id ? "#ffffff" : "#a1a1aa"};
              "
            >
              ${item.label}
            </button>
          `
        )}
      </div>

      ${mode === "table"
        ? BUI.html`
            <!-- PARAMETRIC TABLE + HOLLOW BORDER CONFIGURATOR -->
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">Panel Extrusion</span>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                ${renderNumberControl("Width (m)", tc.panelWidth, 0.6, 5.0, 0.1, (v) =>
                  modeler.updateTable({ panelWidth: v })
                )}
                ${renderNumberControl("Thick (m)", tc.panelHeight, 0.03, 0.35, 0.01, (v) =>
                  modeler.updateTable({ panelHeight: v })
                )}
                ${renderNumberControl("Depth (m)", tc.panelDepth, 0.5, 3.0, 0.1, (v) =>
                  modeler.updateTable({ panelDepth: v })
                )}
              </div>

              <div style="height: 1px; background: ${borderCol};"></div>

              <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">Corner Legs (×4)</span>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                ${renderNumberControl("Leg W", tc.legWidth, 0.04, 0.4, 0.01, (v) =>
                  modeler.updateTable({ legWidth: v })
                )}
                ${renderNumberControl("Leg H", tc.legHeight, 0.3, 1.5, 0.05, (v) =>
                  modeler.updateTable({ legHeight: v })
                )}
                ${renderNumberControl("Leg D", tc.legDepth, 0.04, 0.4, 0.01, (v) =>
                  modeler.updateTable({ legDepth: v })
                )}
              </div>

              <div style="height: 1px; background: ${borderCol};"></div>

              <!-- Border Trim (Lesson 2.7 Boolean Hole Extrusion) -->
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">Perimeter Border (Profile Hole)</span>
                <label style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.68rem; color: #d4d4d8; cursor: pointer;">
                  <input
                    type="checkbox"
                    .checked=${tc.showBorder}
                    @change=${(e: Event) =>
                      modeler.updateTable({ showBorder: (e.target as HTMLInputElement).checked })}
                  />
                  Enabled
                </label>
              </div>
              ${tc.showBorder
                ? BUI.html`
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                      ${renderNumberControl("Border H", tc.borderHeight, 0.02, 0.2, 0.01, (v) =>
                        modeler.updateTable({ borderHeight: v })
                      )}
                      ${renderNumberControl("Border D", tc.borderDepth, 0.02, 0.18, 0.01, (v) =>
                        modeler.updateTable({ borderDepth: v })
                      )}
                      ${renderNumberControl("Offset", tc.borderOffset, -0.08, 0.12, 0.01, (v) =>
                        modeler.updateTable({ borderOffset: v })
                      )}
                    </div>
                  `
                : ""}

              <div style="height: 1px; background: ${borderCol};"></div>

              <!-- Material & Finish (Lesson 2.6) -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: inline-flex; align-items: center; gap: 5px;">
                  ${TABLE_FINISH_PRESETS.map(
                    (p) => BUI.html`
                      <button
                        type="button"
                        title=${p.label}
                        @click=${() =>
                          modeler.updateTable({
                            colorHex: p.hex,
                            roughness: p.roughness,
                            metalness: p.metalness,
                          })}
                        style="
                          width: 20px; height: 20px; border-radius: 5px; cursor: pointer;
                          background: ${p.hex};
                          border: 2px solid ${tc.colorHex.toLowerCase() === p.hex ? "#ffffff" : "rgba(255,255,255,0.2)"};
                        "
                      ></button>
                    `
                  )}
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <input
                    type="color"
                    .value=${tc.colorHex}
                    @input=${(e: Event) =>
                      modeler.updateTable({ colorHex: (e.target as HTMLInputElement).value })}
                    style="width: 28px; height: 24px; border-radius: 5px; border: 1px solid ${borderCol}; background: transparent; cursor: pointer;"
                  />
                  <span style="font-size: 0.68rem; font-family: monospace; color: #a1a1aa;">${tc.colorHex.toUpperCase()}</span>
                </div>
              </div>
            </div>
          `
        : BUI.html`
            <!-- STRUCTURAL REBAR CAGE CONFIGURATOR (Assignment 2.7) -->
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px; align-items: end;">
                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                  Rebar Pattern (CircularSweep)
                  <select
                    .value=${rc.pattern}
                    @change=${(e: Event) =>
                      modeler.updateRebar({ pattern: (e.target as HTMLSelectElement).value as RebarPattern })}
                    style="padding: 6px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                  >
                    <option value="column-cage">Column Cage + Stirrups</option>
                    <option value="spiral-core">Circular Hoop Column Cage</option>
                    <option value="bent-bar">Seismic Bent U-Bar Fan</option>
                  </select>
                </label>

                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                  Bar Count (${rc.barCount})
                  <input
                    type="range"
                    min="2"
                    max="24"
                    step="1"
                    .value=${String(rc.barCount)}
                    @input=${(e: Event) =>
                      modeler.updateRebar({ barCount: Number((e.target as HTMLInputElement).value) })}
                    style="width: 100%; accent-color: #38bdf8; cursor: pointer;"
                  />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                ${renderNumberControl("Cage W (m)", rc.cageWidth, 0.25, 2.0, 0.05, (v) =>
                  modeler.updateRebar({ cageWidth: v })
                )}
                ${renderNumberControl("Cage D (m)", rc.cageDepth, 0.25, 2.0, 0.05, (v) =>
                  modeler.updateRebar({ cageDepth: v })
                )}
                ${renderNumberControl("Height (m)", rc.cageHeight, 0.8, 6.0, 0.1, (v) =>
                  modeler.updateRebar({ cageHeight: v })
                )}
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                ${renderNumberControl("Bar Ø (mm)", rc.barDiameterMm, 10, 40, 2, (v) =>
                  modeler.updateRebar({ barDiameterMm: v })
                )}
                ${renderNumberControl("Hook (m)", rc.hookLength, 0.08, 0.6, 0.02, (v) =>
                  modeler.updateRebar({ hookLength: v })
                )}
                ${renderNumberControl("Bend R (m)", rc.bendRadius, 0.02, 0.15, 0.01, (v) =>
                  modeler.updateRebar({ bendRadius: v })
                )}
              </div>

              ${rc.pattern !== "bent-bar"
                ? BUI.html`
                    <div style="height: 1px; background: ${borderCol};"></div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                      <label style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.69rem; font-weight: 700; color: #e4e4e7; cursor: pointer;">
                        <input
                          type="checkbox"
                          .checked=${rc.includeStirrups}
                          @change=${(e: Event) =>
                            modeler.updateRebar({ includeStirrups: (e.target as HTMLInputElement).checked })}
                        />
                        Transverse Stirrups (Ø${rc.stirrupDiameterMm}mm)
                      </label>
                      ${rc.includeStirrups
                        ? BUI.html`<div style="flex: 1; max-width: 150px;">${renderNumberControl("Spacing (m)", rc.stirrupSpacing, 0.1, 0.6, 0.05, (v) =>
                            modeler.updateRebar({ stirrupSpacing: v })
                          )}</div>`
                        : ""}
                    </div>
                  `
                : ""}

              <div style="height: 1px; background: ${borderCol};"></div>

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: inline-flex; align-items: center; gap: 5px;">
                  ${REBAR_FINISH_PRESETS.map(
                    (p) => BUI.html`
                      <button
                        type="button"
                        title=${p.label}
                        @click=${() => modeler.updateRebar({ colorHex: p.hex })}
                        style="
                          width: 20px; height: 20px; border-radius: 5px; cursor: pointer;
                          background: ${p.hex};
                          border: 2px solid ${rc.colorHex.toLowerCase() === p.hex ? "#ffffff" : "rgba(255,255,255,0.2)"};
                        "
                      ></button>
                    `
                  )}
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <input
                    type="color"
                    .value=${rc.colorHex}
                    @input=${(e: Event) =>
                      modeler.updateRebar({ colorHex: (e.target as HTMLInputElement).value })}
                    style="width: 28px; height: 24px; border-radius: 5px; border: 1px solid ${borderCol}; background: transparent; cursor: pointer;"
                  />
                  <span style="font-size: 0.68rem; font-family: monospace; color: #a1a1aa;">${rc.colorHex.toUpperCase()}</span>
                </div>
              </div>
            </div>
          `}

      <!-- Live Engineering Takeoff Strip -->
      ${takeoff
        ? BUI.html`
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
              <div style="padding: 6px 8px; border-radius: 7px; background: ${cardBg}; border: 1px solid ${borderCol};">
                <div style="font-size: 0.58rem; color: #a1a1aa; font-weight: 700;">PARTS</div>
                <div style="font-size: 0.78rem; font-weight: 800;">${takeoff.partCount}</div>
              </div>
              <div style="padding: 6px 8px; border-radius: 7px; background: ${cardBg}; border: 1px solid ${borderCol};">
                <div style="font-size: 0.58rem; color: #a1a1aa; font-weight: 700;">VOLUME</div>
                <div style="font-size: 0.78rem; font-weight: 800;">${takeoff.volumeM3.toFixed(3)} m³</div>
              </div>
              <div style="padding: 6px 8px; border-radius: 7px; background: ${cardBg}; border: 1px solid ${borderCol};">
                <div style="font-size: 0.58rem; color: #a1a1aa; font-weight: 700;">EST. MASS</div>
                <div style="font-size: 0.78rem; font-weight: 800;">${takeoff.massKg.toFixed(1)} kg</div>
              </div>
              <div style="padding: 6px 8px; border-radius: 7px; background: ${cardBg}; border: 1px solid ${borderCol};">
                <div style="font-size: 0.58rem; color: #a1a1aa; font-weight: 700;">${mode === "rebar" ? "LENGTH" : "TRIS"}</div>
                <div style="font-size: 0.78rem; font-weight: 800;">${mode === "rebar" ? `${takeoff.totalLinearMeters.toFixed(1)} m` : takeoff.triangleCount.toLocaleString()}</div>
              </div>
            </div>
          `
        : ""}

      <!-- Authoring & Export Actions -->
      <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 6px; padding: 8px 10px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
        <button
          type="button"
          ?disabled=${modeler.isBusy || !modeler.hasGenerated}
          @click=${() => modeler.clearPreview()}
          style="padding: 6px 9px; border-radius: 6px; border: 1px solid rgba(248, 113, 113, 0.35); background: rgba(239, 68, 68, 0.14); color: #fca5a5; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
        >
          Clear
        </button>
        <button
          type="button"
          ?disabled=${modeler.isBusy}
          @click=${() => modeler.bakeToFragmentsModel(false)}
          style="padding: 6px 9px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #f4f4f5; font-size: 0.69rem; font-weight: 700; cursor: pointer;"
        >
          Bake to .FRAG Model
        </button>
        <button
          type="button"
          ?disabled=${modeler.isBusy}
          @click=${() => modeler.bakeToFragmentsModel(true)}
          style="padding: 6px 9px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.35); background: #0284c7; color: #ffffff; font-size: 0.69rem; font-weight: 700; cursor: pointer;"
        >
          Bake & Export .FRAG
        </button>
      </div>

      <div
        style="
          padding: 6px 9px; border-radius: 7px; font-size: 0.68rem; font-weight: 600;
          background: ${inputBg};
          border: 1px solid ${modeler.statusTone === "warn" ? "rgba(245, 158, 11, 0.45)" : borderCol};
          color: ${modeler.statusTone === "warn" ? "#fcd34d" : "#d4d4d8"};
        "
      >
        ${modeler.statusMessage}
      </div>
    </div>
  `;
};
