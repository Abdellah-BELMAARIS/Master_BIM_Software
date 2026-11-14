import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as CUI from "@thatopen/ui-obc";
import { DataEnhancer } from "../../bim-components/DataEnhancer";

/**
 * Module 4 — Lesson 3.5 & Assignment: Displaying Elements Data
 * Interactive property inspector displaying IFC attributes & property sets
 * for selected 3D BIM elements, with search, auto-update toggle, CSV export,
 * click-to-copy cell values, and DataEnhancer specification badges.
 */
export interface ItemsDataState {
  components: OBC.Components;
}

export const itemsDataTemplate: BUI.StatefullComponent<ItemsDataState> = (
  state: ItemsDataState
) => {
  const { components } = state;

  const highlighter = components.get(OBCF.Highlighter);
  const initialSelection = highlighter.selection?.select
    ? OBC.ModelIdMapUtils.clone(highlighter.selection.select)
    : {};

  const [itemsTable, updateItemsTable] = CUI.tables.itemsData({
    components,
    modelIdMap: initialSelection,
  });
  itemsTable.preserveStructureOnFilter = true;
  itemsTable.headersHidden = true;
  itemsTable.hiddenColumns = ["modelId", "localId", "type", "dataType"];
  itemsTable.columns = [
    { name: "Name", width: "11rem" },
    { name: "Value", width: "minmax(8rem, 1fr)" },
  ];

  let autoUpdate = true;
  let lastSelection: OBC.ModelIdMap = initialSelection;
  let specsContainer: HTMLDivElement | null = null;
  let copyToast: HTMLSpanElement | null = null;

  const renderMatchedSpecs = async (selection: OBC.ModelIdMap) => {
    if (!specsContainer) return;
    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      specsContainer.innerHTML = "";
      specsContainer.style.display = "none";
      return;
    }

    try {
      const enhancer = components.get(DataEnhancer);
      const enhanced = await enhancer.getData(selection);
      const chips: string[] = [];

      for (const [, itemMap] of enhanced) {
        for (const [, bySource] of itemMap) {
          for (const [sourceName, rows] of Object.entries(bySource)) {
            if (!Array.isArray(rows) || rows.length === 0) continue;
            for (const row of rows.slice(0, 2)) {
              const summary =
                row.Standard ||
                row.FireRating ||
                row.InspectionGate ||
                row.Value ||
                row.Property;
              if (summary) {
                chips.push(`${sourceName.split(" ")[0]}: ${summary}`);
              }
            }
          }
          if (chips.length >= 4) break;
        }
        if (chips.length >= 4) break;
      }

      if (chips.length > 0) {
        const unique = [...new Set(chips)].slice(0, 4);
        specsContainer.style.display = "flex";
        specsContainer.innerHTML = unique
          .map(
            (text) =>
              `<span style="font-size:0.7rem;padding:2px 7px;border-radius:6px;background:rgba(16,185,129,0.16);border:1px solid rgba(16,185,129,0.35);color:#34d399;white-space:nowrap;">${text}</span>`
          )
          .join("");
      } else {
        specsContainer.style.display = "none";
      }
    } catch {
      specsContainer.style.display = "none";
    }
  };

  highlighter.events.select.onHighlight.add((modelIdMap) => {
    lastSelection = modelIdMap;
    if (autoUpdate) {
      updateItemsTable({ modelIdMap });
      renderMatchedSpecs(modelIdMap);
    }
  });

  highlighter.events.select.onClear.add(() => {
    lastSelection = {};
    if (autoUpdate) {
      updateItemsTable({ modelIdMap: {} });
      renderMatchedSpecs({});
    }
  });

  const onSearchInput = (e: Event) => {
    const input = e.target as BUI.TextInput;
    itemsTable.queryString = input.value;
    itemsTable.expanded = Boolean(input.value.trim());
  };

  const onRefreshSelection = () => {
    const current = highlighter.selection.select || lastSelection;
    updateItemsTable({ modelIdMap: current });
    renderMatchedSpecs(current);
  };

  const onToggleAutoUpdate = (e: Event) => {
    const checkbox = e.target as BUI.Checkbox;
    autoUpdate = checkbox.checked;
    if (autoUpdate) {
      onRefreshSelection();
    }
  };

  const onToggleExpand = () => {
    itemsTable.expanded = !itemsTable.expanded;
  };

  const onExportCsv = () => {
    itemsTable.downloadData("bim-element-properties", "csv");
  };

  const onClearSelection = async () => {
    await highlighter.clear("select");
    lastSelection = {};
    updateItemsTable({ modelIdMap: {} });
    renderMatchedSpecs({});
  };

  // Lesson 3.5 Challenge: Click any Value cell in itemsTable to copy value
  const onCellCreated = (e: CustomEvent<BUI.CellCreatedEventDetail>) => {
    const { cell } = e.detail;
    cell.style.minWidth = "0";
    cell.style.overflow = "hidden";
    if (cell.column === "Value" && cell.data !== null && cell.data !== undefined) {
      cell.style.cursor = "pointer";
      cell.title = "Click to copy property value";
      cell.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(String(cell.data));
          if (copyToast) {
            copyToast.textContent = `Copied: ${String(cell.data).slice(0, 28)}`;
            copyToast.style.opacity = "1";
            setTimeout(() => {
              if (copyToast) copyToast.style.opacity = "0";
            }, 1600);
          }
        } catch {}
      });
    }
  };
  itemsTable.addEventListener("cellcreated", onCellCreated as EventListener);

  return BUI.html`
    <bim-panel-section
      label="IFC Schema Attributes & Quantities"
      icon="solar:document-bold"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(19, 20, 24, 0.95); border: 1px solid rgba(255, 255, 255, 0.12);"
    >
      <div style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.5rem 0.75rem 0.45rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <bim-text-input
            @input=${onSearchInput}
            placeholder="Search IFC attributes or Psets..."
            style="flex: 1; min-width: 0;"
          ></bim-text-input>
          <bim-button
            @click=${onToggleExpand}
            icon="flowbite:expand-outline"
            tooltip-title="Expand / Collapse Groups"
            style="flex: 0;"
          ></bim-button>
          <bim-button
            @click=${onExportCsv}
            icon="solar:download-bold"
            tooltip-title="Export Properties CSV"
            style="flex: 0;"
          ></bim-button>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
          <bim-checkbox
            @change=${onToggleAutoUpdate}
            label="Auto-Update"
            checked
          ></bim-checkbox>
          <div style="display: flex; align-items: center; gap: 0.25rem;">
            <bim-button
              @click=${onRefreshSelection}
              icon="solar:refresh-bold"
              label="Read"
              style="flex: 0;"
            ></bim-button>
            <bim-button
              @click=${onClearSelection}
              icon="flowbite:trash-bin-outline"
              tooltip-title="Clear Selection"
              style="flex: 0;"
            ></bim-button>
          </div>
        </div>

        <div
          ${BUI.ref((el) => {
            specsContainer = el as HTMLDivElement;
            if (
              specsContainer &&
              lastSelection &&
              !OBC.ModelIdMapUtils.isEmpty(lastSelection)
            ) {
              void renderMatchedSpecs(lastSelection);
            }
          })}
          style="display: none; flex-wrap: wrap; gap: 4px; padding-top: 2px;"
        ></div>

        <span
          ${BUI.ref((el) => {
            copyToast = el as HTMLSpanElement;
          })}
          style="font-size: 0.7rem; color: #38bdf8; opacity: 0; transition: opacity 0.2s ease; height: 14px;"
        ></span>
      </div>

      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${itemsTable}
      </div>
    </bim-panel-section>
  `;
};
