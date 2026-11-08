import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import { loadButtonTemplate, LoadButtonState } from "../buttons";

/**
 * Module 4 — Lesson 3.6: Creating a Fragments list panel
 * Panel section hosting the list of loaded BIM fragment models,
 * the Load IFC button, and a real-time search box filtering the models table.
 */
export interface ModelsState {
  components: OBC.Components;
}

export const modelsTemplate: BUI.StatefullComponent<ModelsState> = (
  state: ModelsState
) => {
  const { components } = state;

  const [modelsTable] = CUI.tables.modelsList({ components });

  const [loadModelsBtn] = BUI.Component.create<BUI.Button, LoadButtonState>(
    loadButtonTemplate,
    { components }
  );
  loadModelsBtn.style.flex = "0";

  const onSearchInput = (e: Event) => {
    const input = e.target as BUI.TextInput;
    modelsTable.queryString = input.value;
  };

  return BUI.html`
    <bim-panel-section
      label="Loaded Models"
      icon="tabler:folders"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.25);"
    >
      <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem 0.5rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        ${loadModelsBtn}
        <bim-text-input
          @input=${onSearchInput}
          placeholder="Search models..."
          style="flex: 1; min-width: 0;"
        ></bim-text-input>
      </div>
      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${modelsTable}
      </div>
    </bim-panel-section>
  `;
};

