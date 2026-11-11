import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import {
  ElementProfileKind,
  Modeler,
  ModelerMode,
  PlacementMode,
  RebarPattern,
} from "../../bim-components/Modeler";

export interface ModelerSectionState {
  components: OBC.Components;
}

const ELEMENT_FINISH_PRESETS = [
  { label: "Structural Steel", hex: "#64748b", roughness: 0.35, metalness: 0.72 },
  { label: "Architectural Concrete", hex: "#94a3b8", roughness: 0.82, metalness: 0.05 },
  { label: "Glazed Tint", hex: "#38bdf8", roughness: 0.15, metalness: 0.3 },
  { label: "Timber Cladding", hex: "#a16207", roughness: 0.55, metalness: 0.08 },
  { label: "Graphite Finish", hex: "#27272a", roughness: 0.4, metalness: 0.45 },
];

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
 * Pro Parametric BIM Modeler UI Section.
 * - Direct Selected IFC Element Resizing / Move / Rotate / Color (zero auto-spawn on open).
 * - Parametric GeometryEngine Configurator (`BIM Element`, `Rebar Cage`, `Table`) on explicit Generate.
 */
export const modelerTemplate: BUI.StatefullComponent<ModelerSectionState> = (state) => {
  const { components } = state;
  const modeler = components.get(Modeler);
  const {
    mode,
    placementMode,
    placementOffset,
    selectedTarget,
    selectedEdit,
    elementConfig: ec,
    tableConfig: tc,
    rebarConfig: rc,
    takeoff,
  } = modeler;
  const hasLoadedModel = modeler.hasLoadedFragmentModels;

  const cardBg = "rgba(25, 26, 30, 0.94)";
  const subCardBg = "rgba(34, 35, 41, 0.9)";
  const inputBg = "#121316";
  const borderCol = "rgba(255, 255, 255, 0.12)";

  const renderSliderControl = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (val: number) => void
  ) => BUI.html`
    <div style="display: flex; flex-direction: column; gap: 3px;">
      <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #a1a1aa; font-weight: 600;">
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
    <div style="display: flex; flex-direction: column; gap: 9px; padding: 2px; color: #f4f4f5;">
      <!-- DIRECT SELECTED IFC ELEMENT RESIZE & TRANSFORM (Active whenever an item is clicked in 3D) -->
      ${hasLoadedModel
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${selectedTarget ? "rgba(56, 189, 248, 0.4)" : borderCol};">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 0.74rem; font-weight: 700; color: ${selectedTarget ? "#bae6fd" : "#e4e4e7"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${selectedTarget ? `${selectedTarget.category} · ${selectedTarget.name}` : "Select Any IFC Element in 3D"}
                  </span>
                  <span style="font-size: 0.64rem; color: #a1a1aa; font-family: monospace;">
                    ${selectedTarget
                      ? `Current Size: ${selectedTarget.width} × ${selectedTarget.height} × ${selectedTarget.depth} m`
                      : "Click any wall, column, slab, beam or door to resize it directly."}
                  </span>
                </div>
                ${selectedTarget
                  ? BUI.html`
                      <button
                        type="button"
                        ?disabled=${modeler.isBusy}
                        @click=${() => modeler.resetSelectedEditDraft()}
                        style="padding: 4px 8px; border-radius: 5px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #e4e4e7; font-size: 0.64rem; font-weight: 600; cursor: pointer; flex-shrink: 0;"
                      >
                        Reset 1:1
                      </button>
                    `
                  : ""}
              </div>

              ${selectedTarget && selectedEdit
                ? BUI.html`
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.64rem; color: #a1a1aa; font-weight: 600;">
                        Width X (m)
                        <input
                          type="number"
                          step="0.05"
                          min="0.05"
                          .value=${String(selectedEdit.targetWidth)}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({
                              targetWidth: Math.max(0.05, Number((e.target as HTMLInputElement).value)),
                            })}
                          style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                        />
                      </label>
                      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.64rem; color: #a1a1aa; font-weight: 600;">
                        Height Y (m)
                        <input
                          type="number"
                          step="0.05"
                          min="0.05"
                          .value=${String(selectedEdit.targetHeight)}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({
                              targetHeight: Math.max(0.05, Number((e.target as HTMLInputElement).value)),
                            })}
                          style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                        />
                      </label>
                      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.64rem; color: #a1a1aa; font-weight: 600;">
                        Depth Z (m)
                        <input
                          type="number"
                          step="0.05"
                          min="0.05"
                          .value=${String(selectedEdit.targetDepth)}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({
                              targetDepth: Math.max(0.05, Number((e.target as HTMLInputElement).value)),
                            })}
                          style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                        />
                      </label>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.63rem; color: #a1a1aa;">
                        Move ΔX
                        <input
                          type="number"
                          step="0.25"
                          .value=${String(selectedEdit.dx)}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({ dx: Number((e.target as HTMLInputElement).value) })}
                          style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.7rem;"
                        />
                      </label>
                      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.63rem; color: #a1a1aa;">
                        Move ΔY
                        <input
                          type="number"
                          step="0.25"
                          .value=${String(selectedEdit.dy)}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({ dy: Number((e.target as HTMLInputElement).value) })}
                          style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.7rem;"
                        />
                      </label>
                      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.63rem; color: #a1a1aa;">
                        Move ΔZ
                        <input
                          type="number"
                          step="0.25"
                          .value=${String(selectedEdit.dz)}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({ dz: Number((e.target as HTMLInputElement).value) })}
                          style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.7rem;"
                        />
                      </label>
                      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.63rem; color: #a1a1aa;">
                        Rot Y°
                        <input
                          type="number"
                          step="15"
                          .value=${String(selectedEdit.rotYDeg)}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({ rotYDeg: Number((e.target as HTMLInputElement).value) })}
                          style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.7rem;"
                        />
                      </label>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                      <label style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.67rem; color: #d4d4d8; cursor: pointer;">
                        <input
                          type="checkbox"
                          .checked=${selectedEdit.overrideColor}
                          @change=${(e: Event) =>
                            modeler.updateSelectedEdit({ overrideColor: (e.target as HTMLInputElement).checked })}
                        />
                        Apply Finish Color
                      </label>
                      <div style="display: inline-flex; align-items: center; gap: 6px;">
                        <input
                          type="color"
                          .value=${selectedEdit.colorHex}
                          @input=${(e: Event) =>
                            modeler.updateSelectedEdit({
                              colorHex: (e.target as HTMLInputElement).value,
                              overrideColor: true,
                            })}
                          style="width: 26px; height: 22px; border-radius: 5px; border: 1px solid ${borderCol}; background: transparent; cursor: pointer;"
                        />
                        <button
                          type="button"
                          ?disabled=${modeler.isBusy}
                          @click=${() => modeler.applySelectedElementModification()}
                          style="padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.45); background: #0284c7; color: #ffffff; font-size: 0.7rem; font-weight: 700; cursor: pointer;"
                        >
                          Apply Resize & Transform
                        </button>
                      </div>
                    </div>
                  `
                : ""}
            </div>
          `
        : ""}

      <!-- Parametric Geometry Engine Studio (Create New From Scratch or Match Selected Bounds) -->
      <div
        style="
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 8px 11px; border-radius: 9px;
          background: ${cardBg}; border: 1px solid ${borderCol};
        "
      >
        <div style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 0.73rem; font-weight: 700; color: #f4f4f5;">
            Create New Geometry (WASM Engine)
          </span>
          <span style="font-size: 0.64rem; color: #a1a1aa;">
            ${modeler.hasGenerated ? `Active Preview: ${takeoff?.partCount ?? 0} Parts` : "Click Generate when ready (no auto-spawn)"}
          </span>
        </div>
        <div style="display: inline-flex; gap: 4px; flex-shrink: 0;">
          ${selectedTarget
            ? BUI.html`
                <button
                  type="button"
                  ?disabled=${modeler.isBusy}
                  @click=${() => modeler.matchSelectedElement(true)}
                  style="padding: 5px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #bae6fd; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
                >
                  Match Bounds
                </button>
              `
            : ""}
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

      <!-- Context-Aware Spatial Placement Strip -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 9px; border-radius: 8px; background: ${cardBg}; border: 1px solid ${borderCol};">
        <div style="display: inline-flex; align-items: center; gap: 4px;">
          <span style="font-size: 0.63rem; color: #a1a1aa; font-weight: 700;">PLACE:</span>
          ${([
            { id: "origin", label: "Origin" },
            { id: "beside-model", label: "Beside Model", hideIfEmpty: true },
            { id: "selection", label: "On Selected", hideIfEmpty: true },
          ] as Array<{ id: PlacementMode; label: string; hideIfEmpty?: boolean }>)
            .filter((opt) => hasLoadedModel || !opt.hideIfEmpty)
            .map(
              (opt) => BUI.html`
                <button
                  type="button"
                  ?disabled=${modeler.isBusy}
                  @click=${() => modeler.setPlacementMode(opt.id)}
                  style="
                    padding: 4px 7px; border-radius: 5px; font-size: 0.64rem; font-weight: 600; cursor: pointer;
                    border: 1px solid ${placementMode === opt.id ? "rgba(56, 189, 248, 0.45)" : borderCol};
                    background: ${placementMode === opt.id ? "rgba(56, 189, 248, 0.16)" : inputBg};
                    color: ${placementMode === opt.id ? "#e0f2fe" : "#a1a1aa"};
                  "
                >
                  ${opt.label}
                </button>
              `
            )}
        </div>
        <span style="font-size: 0.63rem; font-family: monospace; color: #a1a1aa;">
          (${placementOffset[0]}, ${placementOffset[1]}, ${placementOffset[2]})
        </span>
      </div>

      <!-- Clean 3-Tab Generator Type Switcher -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 3px; border-radius: 8px; background: ${inputBg}; border: 1px solid ${borderCol};">
        ${([
          { id: "element", label: "BIM Element" },
          { id: "rebar", label: "Rebar Cage" },
          { id: "table", label: "Table" },
        ] as Array<{ id: ModelerMode; label: string }>).map(
          (item) => BUI.html`
            <button
              type="button"
              @click=${() => modeler.setMode(item.id)}
              style="
                padding: 6px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer;
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

      ${mode === "element"
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 8px; align-items: end;">
                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.66rem; color: #a1a1aa; font-weight: 600;">
                  Section / Extrusion Profile
                  <select
                    .value=${ec.profile}
                    @change=${(e: Event) =>
                      modeler.updateElement({
                        profile: (e.target as HTMLSelectElement).value as ElementProfileKind,
                      })}
                    style="padding: 6px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                  >
                    <option value="steel-h">Structural Steel H-Beam</option>
                    <option value="steel-c">Structural Steel C-Channel</option>
                    <option value="steel-t">Structural Steel T-Section</option>
                    <option value="steel-l">Structural Steel L-Angle</option>
                    <option value="solid-block">Solid Wall / Slab Block</option>
                    <option value="hollow-frame">Hollow Opening Frame</option>
                    <option value="circular-column">Circular Pier / Column</option>
                  </select>
                </label>

                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.66rem; color: #a1a1aa; font-weight: 600;">
                  ${ec.profile === "hollow-frame" ? `Void Ratio (${Math.round(ec.voidRatio * 100)}%)` : `Web / Wall Thick (${Number(ec.thickness.toFixed(3))}m)`}
                  <input
                    type="range"
                    min=${ec.profile === "hollow-frame" ? "0.2" : "0.008"}
                    max=${ec.profile === "hollow-frame" ? "0.85" : "0.25"}
                    step=${ec.profile === "hollow-frame" ? "0.05" : "0.004"}
                    .value=${String(ec.profile === "hollow-frame" ? ec.voidRatio : ec.thickness)}
                    @input=${(e: Event) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      modeler.updateElement(
                        ec.profile === "hollow-frame" ? { voidRatio: val } : { thickness: val }
                      );
                    }}
                    style="width: 100%; accent-color: #38bdf8; cursor: pointer;"
                  />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                ${renderSliderControl(
                  "Width (m)",
                  ec.width,
                  0.1,
                  Math.max(6, Math.ceil(ec.width * 1.5)),
                  0.05,
                  (v) => modeler.updateElement({ width: v })
                )}
                ${renderSliderControl(
                  "Height (m)",
                  ec.height,
                  0.1,
                  Math.max(6, Math.ceil(ec.height * 1.5)),
                  0.05,
                  (v) => modeler.updateElement({ height: v })
                )}
                ${renderSliderControl(
                  "Depth (m)",
                  ec.depth,
                  0.1,
                  Math.max(6, Math.ceil(ec.depth * 1.5)),
                  0.05,
                  (v) => modeler.updateElement({ depth: v })
                )}
              </div>

              <div style="height: 1px; background: ${borderCol};"></div>

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: inline-flex; align-items: center; gap: 5px;">
                  ${ELEMENT_FINISH_PRESETS.map(
                    (p) => BUI.html`
                      <button
                        type="button"
                        title=${p.label}
                        @click=${() =>
                          modeler.updateElement({
                            colorHex: p.hex,
                            roughness: p.roughness,
                            metalness: p.metalness,
                          })}
                        style="
                          width: 20px; height: 20px; border-radius: 5px; cursor: pointer;
                          background: ${p.hex};
                          border: 2px solid ${ec.colorHex.toLowerCase() === p.hex ? "#ffffff" : "rgba(255,255,255,0.2)"};
                        "
                      ></button>
                    `
                  )}
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <input
                    type="color"
                    .value=${ec.colorHex}
                    @input=${(e: Event) =>
                      modeler.updateElement({ colorHex: (e.target as HTMLInputElement).value })}
                    style="width: 28px; height: 24px; border-radius: 5px; border: 1px solid ${borderCol}; background: transparent; cursor: pointer;"
                  />
                  <span style="font-size: 0.68rem; font-family: monospace; color: #a1a1aa;">${ec.colorHex.toUpperCase()}</span>
                </div>
              </div>
            </div>
          `
        : mode === "table"
          ? BUI.html`
              <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
                <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">Panel Extrusion</span>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                  ${renderSliderControl("Width (m)", tc.panelWidth, 0.6, 5.0, 0.1, (v) =>
                    modeler.updateTable({ panelWidth: v })
                  )}
                  ${renderSliderControl("Thick (m)", tc.panelHeight, 0.03, 0.35, 0.01, (v) =>
                    modeler.updateTable({ panelHeight: v })
                  )}
                  ${renderSliderControl("Depth (m)", tc.panelDepth, 0.5, 3.0, 0.1, (v) =>
                    modeler.updateTable({ panelDepth: v })
                  )}
                </div>

                <div style="height: 1px; background: ${borderCol};"></div>

                <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">Corner Legs (×4)</span>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                  ${renderSliderControl("Leg W", tc.legWidth, 0.04, 0.4, 0.01, (v) =>
                    modeler.updateTable({ legWidth: v })
                  )}
                  ${renderSliderControl("Leg H", tc.legHeight, 0.3, 1.5, 0.05, (v) =>
                    modeler.updateTable({ legHeight: v })
                  )}
                  ${renderSliderControl("Leg D", tc.legDepth, 0.04, 0.4, 0.01, (v) =>
                    modeler.updateTable({ legDepth: v })
                  )}
                </div>

                <div style="height: 1px; background: ${borderCol};"></div>

                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">Perimeter Border Frame</span>
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
                        ${renderSliderControl("Border H", tc.borderHeight, 0.02, 0.2, 0.01, (v) =>
                          modeler.updateTable({ borderHeight: v })
                        )}
                        ${renderSliderControl("Border D", tc.borderDepth, 0.02, 0.18, 0.01, (v) =>
                          modeler.updateTable({ borderDepth: v })
                        )}
                        ${renderSliderControl("Offset", tc.borderOffset, -0.08, 0.12, 0.01, (v) =>
                          modeler.updateTable({ borderOffset: v })
                        )}
                      </div>
                    `
                  : ""}

                <div style="height: 1px; background: ${borderCol};"></div>

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
              <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px; align-items: end;">
                  <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                    Rebar Pattern
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
                  ${renderSliderControl("Cage W (m)", rc.cageWidth, 0.2, 3.0, 0.05, (v) =>
                    modeler.updateRebar({ cageWidth: v })
                  )}
                  ${renderSliderControl("Cage D (m)", rc.cageDepth, 0.2, 3.0, 0.05, (v) =>
                    modeler.updateRebar({ cageDepth: v })
                  )}
                  ${renderSliderControl("Height (m)", rc.cageHeight, 0.5, 8.0, 0.1, (v) =>
                    modeler.updateRebar({ cageHeight: v })
                  )}
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                  ${renderSliderControl("Bar Ø (mm)", rc.barDiameterMm, 10, 40, 2, (v) =>
                    modeler.updateRebar({ barDiameterMm: v })
                  )}
                  ${renderSliderControl("Hook (m)", rc.hookLength, 0.06, 0.6, 0.02, (v) =>
                    modeler.updateRebar({ hookLength: v })
                  )}
                  ${renderSliderControl("Bend R (m)", rc.bendRadius, 0.02, 0.15, 0.01, (v) =>
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
                          Stirrups (Ø${rc.stirrupDiameterMm}mm)
                        </label>
                        ${rc.includeStirrups
                          ? BUI.html`<div style="flex: 1; max-width: 150px;">${renderSliderControl("Spacing (m)", rc.stirrupSpacing, 0.1, 0.6, 0.05, (v) =>
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

      ${modeler.hasGenerated
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 5px; padding: 8px 9px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              ${selectedTarget && mode === "element"
                ? BUI.html`
                    <button
                      type="button"
                      ?disabled=${modeler.isBusy}
                      @click=${() => modeler.replaceSelectedElementGeometry()}
                      style="padding: 7px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.16); color: #fde68a; font-size: 0.7rem; font-weight: 700; cursor: pointer;"
                    >
                      Replace Selected Element Geometry with Preview
                    </button>
                  `
                : ""}
              <div style="display: grid; grid-template-columns: ${hasLoadedModel ? "auto 1fr 1fr 1fr" : "auto 1fr 1fr"}; gap: 5px;">
                <button
                  type="button"
                  ?disabled=${modeler.isBusy}
                  @click=${() => modeler.clearPreview()}
                  style="padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(248, 113, 113, 0.35); background: rgba(239, 68, 68, 0.14); color: #fca5a5; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
                >
                  Clear
                </button>
                ${hasLoadedModel
                  ? BUI.html`
                      <button
                        type="button"
                        ?disabled=${modeler.isBusy}
                        @click=${() => modeler.insertIntoActiveModel()}
                        style="padding: 6px 7px; border-radius: 6px; border: 1px solid rgba(52, 211, 153, 0.35); background: rgba(16, 185, 129, 0.16); color: #6ee7b7; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
                      >
                        + Active Model
                      </button>
                    `
                  : ""}
                <button
                  type="button"
                  ?disabled=${modeler.isBusy}
                  @click=${() => modeler.bakeToFragmentsModel(false)}
                  style="padding: 6px 7px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #f4f4f5; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
                >
                  ${hasLoadedModel ? "New .FRAG" : "Bake .FRAG Model"}
                </button>
                <button
                  type="button"
                  ?disabled=${modeler.isBusy}
                  @click=${() => modeler.bakeToFragmentsModel(true)}
                  style="padding: 6px 7px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.35); background: #0284c7; color: #ffffff; font-size: 0.67rem; font-weight: 700; cursor: pointer;"
                >
                  Export .FRAG
                </button>
              </div>
            </div>
          `
        : ""}

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
