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

  // Challenge: Export (download) SmartViews to JSON
  const onExportViews = () => {
    try {
      const serialized = smartViews.export();
      const blob = new Blob([JSON.stringify(serialized, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `bim-coordination-viewpoints-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus("Viewpoints exported to JSON successfully.");
    } catch (err: any) {
      setStatus(`Export failed: ${err?.message || err}`, true);
    }
  };

  // Challenge: Import (upload) SmartViews from JSON file
  const onImportViews = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const imported = smartViews.import(json);
        setStatus(`Imported ${imported.length} viewpoint${imported.length === 1 ? "" : "s"} successfully.`);
      } catch (err: any) {
        setStatus(`Import failed: ${err?.message || err}`, true);
      }
    };
    fileInput.click();
  };

  return BUI.html`
    <bim-panel-section
      label="Coordination Viewpoints"
      icon="solar:layers-minimalistic-bold"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.25);"
    >
      <div style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <bim-text-input
            @input=${onSearchViews}
            placeholder="Search coordination viewpoints..."
            style="flex: 1; min-width: 0;"
          ></bim-text-input>
          <bim-button
            @click=${onResetWorkspace}
            icon="solar:restart-bold"
            label="Restore All"
            tooltip-title="Restore Shading, Visibility, Clear Ghost & Reset Viewport"
            style="flex: 0;"
          ></bim-button>
          <bim-button
            @click=${onExportViews}
            icon="material-symbols:download"
            tooltip-title="Export Viewpoints (.json)"
            style="flex: 0;"
          ></bim-button>
          <bim-button
            @click=${onImportViews}
            icon="material-symbols:upload"
            tooltip-title="Import Viewpoints (.json)"
            style="flex: 0;"
          ></bim-button>
        </div>

        <!-- Capture Active Viewpoint State -->
        <div style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.45rem; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px;">
          <bim-text-input
            ${BUI.ref((el) => {
              nameInput = el as BUI.TextInput;
            })}
            placeholder="Viewpoint Name (e.g. Structural Framing Audit)"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              descInput = el as BUI.TextInput;
            })}
            placeholder="Engineering Scope / Discipline Note"
          ></bim-text-input>
          <bim-button
            @click=${onSaveCurrentView}
            label="Capture Viewpoint & Camera Pose"
            icon="solar:camera-add-bold"
            style="--bim-button-background: #0284c7; color: white; font-weight: 600;"
          ></bim-button>
        </div>

        <span
          ${BUI.ref((el) => {
            statusBadge = el as HTMLSpanElement;
          })}
          style="font-size: 0.72rem; color: #94a3b8;"
        >Evaluate engineering viewpoints, isolate disciplines, and capture camera perspectives.</span>
      </div>

      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${viewsTable}
      </div>
    </bim-panel-section>
  `;
};

