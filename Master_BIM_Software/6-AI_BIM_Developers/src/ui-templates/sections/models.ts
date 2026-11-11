import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import { loadButtonTemplate, LoadButtonState } from "../buttons";

/**
 * Module 4 — Lessons 3.6 & 3.7: Creating a Fragments List Panel + Exporting Fragments
 * Panel section hosting loaded BIM fragment models with native visibility, download (.frag),
 * and disposal actions, plus Load IFC/Frag and Export Binary Fragment buttons.
 */
export interface ModelsState {
  components: OBC.Components;
}

export const modelsTemplate: BUI.StatefullComponent<ModelsState> = (
  state: ModelsState
) => {
  const { components } = state;

  const [modelsTable] = CUI.tables.modelsList({
    components,
    actions: {
      visibility: true,
      download: true,
      dispose: true,
    },
  });

  const [loadModelsBtn] = BUI.Component.create<BUI.Button, LoadButtonState>(
    loadButtonTemplate,
    { components }
  );
  loadModelsBtn.style.flex = "0";

  const onSearchInput = (e: Event) => {
    const input = e.target as BUI.TextInput;
    modelsTable.queryString = input.value;
  };

  // Lesson 3.7: Export all active Fragment models to binary .frag files
  const onExportAllFrags = async (e: Event) => {
    const btn = e.currentTarget as BUI.Button;
    if (btn) btn.loading = true;
    try {
      const fragments = components.get(OBC.FragmentsManager);
      for (const [modelId, model] of fragments.list) {
        if (!model || typeof model.getBuffer !== "function") continue;
        const buffer = await model.getBuffer(false);
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${modelId.replace(/[^a-zA-Z0-9._-]/g, "_")}.frag`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }
    } catch (err) {
      console.error("[ModelsSection] Export .frag failed:", err);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  return BUI.html`
    <bim-panel-section
      label="Federated Models & IFC Hierarchy"
      icon="tabler:folders"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(19, 20, 24, 0.95); border: 1px solid rgba(255, 255, 255, 0.12);"
    >
      <div style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        ${loadModelsBtn}
        <bim-text-input
          @input=${onSearchInput}
          placeholder="Search models..."
          style="flex: 1; min-width: 0;"
        ></bim-text-input>
        <bim-button
          @click=${onExportAllFrags}
          icon="solar:download-bold"
          tooltip-title="Export Compressed Fragment Binaries (.frag)"
          style="flex: 0;"
        ></bim-button>
      </div>
      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${modelsTable}
      </div>
    </bim-panel-section>
  `;
};
