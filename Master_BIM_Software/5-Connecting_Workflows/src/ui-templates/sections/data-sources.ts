import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { DataEnhancer, unwrapIfcAttr } from "../../bim-components/DataEnhancer";
import { sourceData } from "../tables";

/**
 * Module 4 — Section 4 (Lessons 4.2 – 4.5): Data Enhancer Section
 * Switches external data sources (Technical Specifications JSON, Quality/Cost Matrix,
 * Cloud Firestore Field Logs), supports click-row 3D element selection, CSV export,
 * and attaching custom Firestore parameters to selected IFC elements.
 */
export interface DataSourcesState {
  components: OBC.Components;
  projectId?: string;
}

export const dataSourcesTemplate: BUI.StatefullComponent<DataSourcesState> = (
  state: DataSourcesState
) => {
  const { components, projectId } = state;
  const enhancer = components.get(DataEnhancer);
  if (projectId) {
    enhancer.projectId = projectId;
  }

  const sourceNames = [...enhancer.sources.keys()];
  let activeSource = sourceNames[0] || "Technical Specifications & Standards";

  const [sourceTable, updateSourceTable] = sourceData({
    components,
    sourceId: activeSource,
  });

  let propNameInput: BUI.TextInput | null = null;
  let propValueInput: BUI.TextInput | null = null;
  let statusBadge: HTMLSpanElement | null = null;
  let sourceDropdown: BUI.Dropdown | null = null;

  const setStatus = (msg: string, isError = false) => {
    if (!statusBadge) return;
    statusBadge.textContent = msg;
    statusBadge.style.color = isError ? "#f59e0b" : "#34d399";
  };

  const onSourceChange = (e: Event) => {
    const dropdown = e.target as BUI.Dropdown;
    const selected = dropdown.value?.[0];
    if (selected && typeof selected === "string") {
      activeSource = selected;
      updateSourceTable({ sourceId: activeSource });
      setStatus(`Loaded source: ${activeSource}`);
    }
  };

  const onSearchInput = (e: Event) => {
    const input = e.target as BUI.TextInput;
    sourceTable.queryString = input.value;
  };

  const onRefreshSource = async () => {
    enhancer.clearCache(activeSource);
    await sourceTable.loadData(true);
    setStatus(`Refreshed "${activeSource}".`);
  };

  const onExportCsv = () => {
    sourceTable.downloadData(
      activeSource.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      "csv"
    );
  };

  // Lesson 4.5: Persist custom parameter on selected 3D BIM elements into Cloud Firestore
  const onAttachToSelection = async (e: Event) => {
    const btn = e.currentTarget as BUI.Button;
    const propertyName = propNameInput?.value?.trim() || "";
    const propertyValue = propValueInput?.value?.trim() || "";

    if (!propertyName || !propertyValue) {
      setStatus("Enter both Parameter Name and Value.", true);
      return;
    }

    const highlighter = components.get(OBCF.Highlighter);
    const fragments = components.get(OBC.FragmentsManager);
    const selection = highlighter.selection.select;

    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      setStatus("Select a 3D element in the model first.", true);
      return;
    }

    if (btn) btn.loading = true;
    try {
      const itemsData = await fragments.getData(selection, {
        attributesDefault: true,
      });

      let savedCount = 0;
      for (const [modelId, items] of Object.entries(itemsData)) {
        for (const item of items) {
          const expressId = Number(unwrapIfcAttr((item as any)._localId));
          if (!Number.isFinite(expressId)) continue;
          const guid = unwrapIfcAttr((item as any)._guid);
          const category = unwrapIfcAttr((item as any)._category) || "IFC Element";
          const elementName =
            unwrapIfcAttr((item as any).Name) ||
            unwrapIfcAttr((item as any).ObjectType) ||
            `${category} #${expressId}`;

          await enhancer.set(
            {
              modelId,
              expressId,
              guid,
              category,
              elementName,
              propertyName,
              propertyValue,
              discipline: "Field QA",
              author: "Abdellah B.",
              createdAt: Date.now(),
            },
            enhancer.projectId
          );
          savedCount++;
        }
      }

      if (savedCount > 0) {
        if (propNameInput) propNameInput.value = "";
        if (propValueInput) propValueInput.value = "";
        const cloudSource = "Cloud Field Logs & Inspections";
        if (enhancer.sources.has(cloudSource)) {
          activeSource = cloudSource;
          if (sourceDropdown) sourceDropdown.value = [cloudSource];
          updateSourceTable({ sourceId: cloudSource });
        }
        setStatus(
          `Saved "${propertyName}" to Cloud Firestore for ${savedCount} item${savedCount > 1 ? "s" : ""}.`
        );
      } else {
        setStatus("Could not resolve selected item metadata.", true);
      }
    } catch (err: any) {
      setStatus(`Save error: ${err?.message || err}`, true);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  // Mini Challenge: Query all BIM elements sharing the same source property value
  const onFindSharingData = async (e: Event) => {
    const btn = e.currentTarget as BUI.Button;
    const propertyName = propNameInput?.value?.trim() || "";
    const propertyValue = propValueInput?.value?.trim() || "";

    if (!propertyName || !propertyValue) {
      setStatus("Enter Param Name and Target Value to find shared items.", true);
      return;
    }

    if (btn) btn.loading = true;
    try {
      const itemsMap = await enhancer.findItemsSharingData(
        activeSource,
        propertyName,
        propertyValue
      );

      if (!itemsMap || OBC.ModelIdMapUtils.isEmpty(itemsMap)) {
        setStatus(`No items found sharing "${propertyName} = ${propertyValue}".`, true);
        return;
      }

      const highlighter = components.get(OBCF.Highlighter);
      await highlighter.highlightByID("select", itemsMap, true, true);
      setStatus(`Found & highlighted items sharing "${propertyName} = ${propertyValue}".`);
    } catch (err: any) {
      setStatus(`Search error: ${err?.message || err}`, true);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  return BUI.html`
    <bim-panel-section
      label="Data Enhancer & Specifications Matrix"
      icon="solar:database-bold"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.25);"
    >
      <div style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        <div style="display: flex; gap: 0.35rem; align-items: center;">
          <bim-dropdown
            ${BUI.ref((el) => {
    sourceDropdown = el as BUI.Dropdown;
    if (sourceDropdown && !sourceDropdown.value?.length && activeSource) {
      sourceDropdown.value = [activeSource];
    }
  })}
            @change=${onSourceChange}
            required
            style="flex: 1; min-width: 0;"
          >
            ${sourceNames.map(
    (name) => BUI.html`<bim-option label=${name} value=${name} ?checked=${name === activeSource}></bim-option>`
  )}
          </bim-dropdown>
          <bim-button
            @click=${onRefreshSource}
            icon="solar:refresh-bold"
            tooltip-title="Refresh External Source"
            style="flex: 0;"
          ></bim-button>
          <bim-button
            @click=${onExportCsv}
            icon="solar:download-bold"
            tooltip-title="Export Source Table CSV"
            style="flex: 0;"
          ></bim-button>
        </div>

        <bim-text-input
          @input=${onSearchInput}
          placeholder="Search rows (click any row to highlight in 3D)..."
          style="width: 100%;"
        ></bim-text-input>

        <!-- Lesson 4.5: Attach Custom Cloud Parameter to Selection -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; padding: 0.45rem; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px;">
          <bim-text-input
            ${BUI.ref((el) => {
    propNameInput = el as BUI.TextInput;
  })}
            placeholder="Param (e.g. FireRating)"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
    propValueInput = el as BUI.TextInput;
  })}
            placeholder="Value (e.g. REI-120)"
          ></bim-text-input>
          <bim-button
            @click=${onAttachToSelection}
            label="Save to Selection (Firestore)"
            icon="solar:cloud-upload-bold"
            style="--bim-button-background: #059669; color: white; font-weight: 600;"
          ></bim-button>
          <bim-button
            @click=${onFindSharingData}
            label="Find Items Sharing Param"
            icon="solar:magnifer-bold"
            style="--bim-button-background: #0284c7; color: white; font-weight: 600;"
          ></bim-button>
        </div>

        <span
          ${BUI.ref((el) => {
    statusBadge = el as HTMLSpanElement;
  })}
          style="font-size: 0.72rem; color: #94a3b8;"
        >Click any row below to highlight matching BIM elements.</span>
      </div>

      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${sourceTable}
      </div>
    </bim-panel-section>
  `;
};

