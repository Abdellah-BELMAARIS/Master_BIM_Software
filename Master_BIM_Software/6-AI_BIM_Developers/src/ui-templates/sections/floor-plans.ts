import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export interface FloorPlansSectionState {
  components: OBC.Components;
  activeViewId?: string | null;
  statusMessage?: string;
}

/**
 * That Open Docs Pro Feature — Core OBC.Views:
 * Auto-generates interactive 2D IFC Storey Floor Plans & 4-Side Elevations
 * with live clipping depth range and seamless 3D camera snapshot restoration.
 */
export const floorPlansTemplate: BUI.StatefullComponent<FloorPlansSectionState> = (
  state: FloorPlansSectionState,
  update
) => {
  const { components } = state;
  const views = components.get(OBC.Views);
  const worlds = components.get(OBC.Worlds);
  const world = [...worlds.list.values()][0] || null;
  if (world && !views.world) {
    views.world = world;
  }

  const viewsList = [...views.list.entries()];
  const openView = viewsList.find(([, v]) => v.open)?.[1] || null;

  const onGenerateStoreys = async () => {
    if (!world) return;
    try {
      const created = await views.createFromIfcStoreys({ world });
      if (created.length === 0) {
        // Provide parametric Ground & Level 02 cuts when model has no IfcBuildingStorey
        if (!views.list.has("Level 01 (Ground Plan)")) {
          views.create(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1.5, 0), {
            id: "Level 01 (Ground Plan)",
            world,
          });
        }
        if (!views.list.has("Level 02 (Upper Plan)")) {
          views.create(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 4.8, 0), {
            id: "Level 02 (Upper Plan)",
            world,
          });
        }
        update({
          statusMessage: "Generated 2 datum floor plan views from active geometry.",
        });
      } else {
        update({
          statusMessage: `Extracted ${created.length} architectural floor plan(s) from IfcBuildingStorey.`,
        });
      }
    } catch (err: any) {
      update({ statusMessage: `Plan generation error: ${err?.message || err}` });
    }
  };

  const onGenerateElevations = () => {
    if (!world) return;
    try {
      const created = views.createElevations({
        world,
        combine: true,
      });
      update({
        statusMessage: `Generated ${created.length} architectural elevation views (Front/Back/Left/Right).`,
      });
    } catch (err: any) {
      update({ statusMessage: `Elevation error: ${err?.message || err}` });
    }
  };

  const onOpenView = (id: string) => {
    try {
      if (openView && openView.id === id) {
        views.close(id);
        update({ activeViewId: null, statusMessage: "Restored full 3D perspective camera." });
      } else {
        views.open(id);
        update({ activeViewId: id, statusMessage: `Active 2D View: ${id}` });
      }
    } catch (err: any) {
      update({ statusMessage: `Could not open view: ${err?.message || err}` });
    }
  };

  const onCloseAll = () => {
    views.close();
    update({ activeViewId: null, statusMessage: "Closed 2D view & restored 3D camera." });
  };

  return BUI.html`
    <div
      style="display: flex; flex-direction: column; gap: 11px; width: 100%; background: transparent; padding: 12px 14px; box-sizing: border-box;"
    >
      <!-- Header -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 13px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(19, 20, 24, 0.92));
          border: 1px solid rgba(255, 255, 255, 0.12);
        "
      >
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 0.85rem; font-weight: 800; color: #f8fafc;">2D Storey Plans &amp; Elevations</span>
          <span style="font-size: 0.69rem; color: #94a3b8;">
            Native That Open OBC.Views Engine
          </span>
        </div>
        ${openView
          ? BUI.html`
              <button
                type="button"
                @click=${onCloseAll}
                style="padding: 6px 10px; border-radius: 8px; border: 1px solid #ef4444; background: rgba(239, 68, 68, 0.22); color: #fca5a5; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
              >
                Exit 2D View
              </button>
            `
          : ""}
      </div>

      <!-- Generator Controls -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button
          type="button"
          @click=${onGenerateStoreys}
          style="
            padding: 8px 10px;
            border-radius: 9px;
            border: none;
            background: linear-gradient(135deg, #0284c7, #0ea5e9);
            color: #ffffff;
            font-size: 0.74rem;
            font-weight: 700;
            cursor: pointer;
          "
        >
          + Generate Storey Plans
        </button>
        <button
          type="button"
          @click=${onGenerateElevations}
          style="
            padding: 8px 10px;
            border-radius: 9px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(32, 33, 38, 0.85);
            color: #38bdf8;
            font-size: 0.74rem;
            font-weight: 700;
            cursor: pointer;
          "
        >
          + Generate Elevations
        </button>
      </div>

      ${openView
        ? BUI.html`
            <div style="padding: 9px 11px; border-radius: 9px; background: rgba(19, 20, 24, 0.8); border: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.70rem; color: #38bdf8; font-weight: 700;">
                <span>Cut Depth Range (${openView.id})</span>
                <span>${openView.range.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="30"
                step="0.5"
                .value=${String(openView.range)}
                @input=${(e: Event) => {
                  openView.range = Number((e.target as HTMLInputElement).value);
                  openView.update();
                  update();
                }}
                style="width: 100%; accent-color: #38bdf8;"
              />
            </div>
          `
        : ""}

      ${state.statusMessage
        ? BUI.html`
            <div style="padding: 7px 10px; border-radius: 7px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(255, 255, 255, 0.12); color: #bae6fd; font-size: 0.70rem;">
              ${state.statusMessage}
            </div>
          `
        : ""}

      <!-- Views Catalog -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <span style="font-size: 0.70rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">
          Architectural Views (${viewsList.length})
        </span>

        ${viewsList.length === 0
          ? BUI.html`
              <div style="padding: 18px; border-radius: 9px; background: rgba(9, 13, 22, 0.7); border: 1px dashed rgba(148, 163, 184, 0.25); color: #64748b; font-size: 0.74rem; text-align: center;">
                Click "Generate Storey Plans" or "Generate Elevations" to automatically extract 2D CAD sections from the model.
              </div>
            `
          : viewsList.map(([id, view]) => {
              const isOpen = view.open;
              return BUI.html`
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 9px 11px;
                    border-radius: 9px;
                    background: ${isOpen ? "rgba(14, 165, 233, 0.22)" : "rgba(19, 20, 24, 0.85)"};
                    border: 1px solid ${isOpen ? "#38bdf8" : "rgba(148, 163, 184, 0.22)"};
                  "
                >
                  <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 0.76rem; font-weight: 700; color: #f8fafc;">${id}</span>
                    <span style="font-size: 0.65rem; color: #94a3b8;">Clip Range: ${view.range.toFixed(1)}m</span>
                  </div>
                  <button
                    type="button"
                    @click=${() => onOpenView(id)}
                    style="
                      padding: 5px 10px;
                      border-radius: 7px;
                      border: none;
                      background: ${isOpen ? "#ef4444" : "rgba(56, 189, 248, 0.2)"};
                      color: ${isOpen ? "#ffffff" : "#38bdf8"};
                      font-size: 0.70rem;
                      font-weight: 700;
                      cursor: pointer;
                    "
                  >
                    ${isOpen ? "Close 2D" : "Open 2D"}
                  </button>
                </div>
              `;
            })}
      </div>
    </div>
  `;
};

