import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { SmartViews } from "../../bim-components/SmartViews";
import { smartViewsTable } from "../tables";

/**
 * Module 4 — Section 5 (Lessons 5.1 – 5.5): Smart Views Section
 * Capture cumulative visibility, colors & camera state into reusable Smart Views,
 * apply curated discipline viewpoints, update camera poses, or reset the workspace.
 */
export interface SmartViewsSectionState {
  components: OBC.Components;
}

export const smartViewsSectionTemplate: BUI.StatefullComponent<
  SmartViewsSectionState
> = (state: SmartViewsSectionState) => {
  const { components } = state;
  const smartViews = components.get(SmartViews);

  const [viewsTable] = smartViewsTable({ components });

  let nameInput: BUI.TextInput | null = null;
  let descInput: BUI.TextInput | null = null;
  let statusBadge: HTMLSpanElement | null = null;

  const setStatus = (msg: string, isError = false) => {
    if (!statusBadge) return;
    statusBadge.textContent = msg;
    statusBadge.style.color = isError ? "#f59e0b" : "#34d399";
  };

  const onSaveCurrentView = async (e: Event) => {
    const btn = e.currentTarget as BUI.Button;
    const rawName = nameInput?.value?.trim() || "";
    const rawDesc = descInput?.value?.trim() || "";

    if (btn) btn.loading = true;
    try {
      const saved = await smartViews.saveCurrentState(
        rawName || `Coord View #${smartViews.list.size + 1}`,
        rawDesc
      );
      if (nameInput) nameInput.value = "";
      if (descInput) descInput.value = "";
      setStatus(`Saved Smart View "${saved.name}" with camera & styles.`);
    } catch (err: any) {
      setStatus(`Error saving view: ${err?.message || err}`, true);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  const onResetWorkspace = async (e: Event) => {
    const btn = e.currentTarget as BUI.Button;
    if (btn) btn.loading = true;
    try {
      await smartViews.reset({ resetCamera: true });
      setStatus("Reset visibility, colors, Ghost mode & camera.");
    } finally {
      if (btn) btn.loading = false;
    }
  };

  const onSearchViews = (e: Event) => {
    const input = e.target as BUI.TextInput;
    viewsTable.queryString = input.value;
  };

  return BUI.html`
    <bim-panel-section
      label="Smart Views · Saved States"
      icon="solar:layers-minimalistic-bold"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.25);"
    >
      <div style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <bim-text-input
            @input=${onSearchViews}
            placeholder="Filter saved Smart Views..."
            style="flex: 1; min-width: 0;"
          ></bim-text-input>
          <bim-button
            @click=${onResetWorkspace}
            icon="solar:restart-bold"
            label="Reset All"
            tooltip-title="Reset Visibility, Colors, Ghost & Camera (Lesson 5.5)"
            style="flex: 0;"
          ></bim-button>
        </div>

        <!-- Lesson 5.4: Save Current Cumulative State as Smart View -->
        <div style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.45rem; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px;">
          <bim-text-input
            ${BUI.ref((el) => {
              nameInput = el as BUI.TextInput;
            })}
            placeholder="Smart View Name (e.g. Steel Framing Audit)"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              descInput = el as BUI.TextInput;
            })}
            placeholder="Description (optional)"
          ></bim-text-input>
          <bim-button
            @click=${onSaveCurrentView}
            label="Save Current State & Camera"
            icon="solar:camera-add-bold"
            style="--bim-button-background: #0284c7; color: white; font-weight: 600;"
          ></bim-button>
        </div>

        <span
          ${BUI.ref((el) => {
            statusBadge = el as HTMLSpanElement;
          })}
          style="font-size: 0.72rem; color: #94a3b8;"
        >Apply discipline presets or snapshot your current filters & colors.</span>
      </div>

      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${viewsTable}
      </div>
    </bim-panel-section>
  `;
};

