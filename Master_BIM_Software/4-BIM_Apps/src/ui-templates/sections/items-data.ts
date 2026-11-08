import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as CUI from "@thatopen/ui-obc";

/**
 * Module 4 — Lesson 3.5: Displaying elements data
 * Panel section displaying BIM element properties for selected elements,
 * reactive to Highlighter selection events and supporting real-time text query filtering.
 */
export interface ItemsDataState {
  components: OBC.Components;
}

export const itemsDataTemplate: BUI.StatefullComponent<ItemsDataState> = (
  state: ItemsDataState
) => {
  const { components } = state;

  const [itemsTable, updateItemsTable] = CUI.tables.itemsData({
    components,
    modelIdMap: {},
  });

  const highlighter = components.get(OBCF.Highlighter);

  highlighter.events.select.onHighlight.add((modelIdMap) => {
    updateItemsTable({ modelIdMap });
  });

  highlighter.events.select.onClear.add(() => {
    updateItemsTable({ modelIdMap: {} });
  });

  // Lesson 3.6 Assignment: property search query on BIMTable
  const onSearchInput = (e: Event) => {
    const input = e.target as BUI.TextInput;
    itemsTable.queryString = input.value;
  };

  return BUI.html`
    <bim-panel-section
      label="Element Data"
      icon="solar:document-bold"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.25);"
    >
      <div style="padding: 0.5rem 0.75rem 0.35rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        <bim-text-input
          @input=${onSearchInput}
          placeholder="Search properties..."
          style="width: 100%;"
        ></bim-text-input>
      </div>
      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${itemsTable}
      </div>
    </bim-panel-section>
  `;
};

