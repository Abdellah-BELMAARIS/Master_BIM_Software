import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { queriesList } from "../tables";
import { SmartViews } from "../../bim-components/SmartViews";

/**
 * Module 4 — Lessons 3.11 & 3.12: Finding Model Items Based on Data (ItemsFinder Section)
 * Hosts the curated & relational ItemsFinder query table plus a live custom query builder
 * (IFC category regex + optional attribute keyword) and one-click filter reset.
 */
export interface QueriesSectionState {
  components: OBC.Components;
}

export const queriesTemplate: BUI.StatefullComponent<QueriesSectionState> = (
  state: QueriesSectionState
) => {
  const { components } = state;
  const finder = components.get(OBC.ItemsFinder);

  const [queriesTable] = queriesList({ components });

  const persistQueries = () => {
    try {
      const serialized = finder.export();
      localStorage.setItem("toc_bim_saved_queries", JSON.stringify(serialized));
    } catch {}
  };

  try {
    const saved = localStorage.getItem("toc_bim_saved_queries");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.data && Array.isArray(parsed.data)) {
        finder.import(parsed);
      }
    }
  } catch {}

  let queryNameInput: BUI.TextInput | null = null;
  let categoryRegexInput: BUI.TextInput | null = null;
  let psetNameInput: BUI.TextInput | null = null;
  let propNameInput: BUI.TextInput | null = null;
  let propValueInput: BUI.TextInput | null = null;
  let statusBadge: HTMLSpanElement | null = null;

  const setStatus = (msg: string, isError = false) => {
    if (!statusBadge) return;
    statusBadge.textContent = msg;
    statusBadge.style.color = isError ? "#f59e0b" : "#34d399";
  };

  const onSearchQueries = (e: Event) => {
    const input = e.target as BUI.TextInput;
    queriesTable.queryString = input.value;
  };

  const onCreateQuery = async () => {
    const rawName = queryNameInput?.value?.trim() || "";
    const rawCategory = categoryRegexInput?.value?.trim() || "";
    const rawPset = psetNameInput?.value?.trim() || "";
    const rawProp = propNameInput?.value?.trim() || "";
    const rawVal = propValueInput?.value?.trim() || "";

    if (!rawCategory && !rawPset && !rawProp && !rawVal) {
      setStatus("Specify an IFC Category, Property Set, Property Name, or Value.", true);
      return;
    }

    const name =
      rawName ||
      `${rawCategory || "Elements"}${rawPset ? ` · ${rawPset}` : ""}${rawProp ? ` (${rawProp}=${rawVal || "*"})` : ""}`.slice(0, 50);

    try {
      const categoryRegex = rawCategory
        ? new RegExp(rawCategory.replace(/^\//, "").replace(/\/i?$/, ""), "i")
        : /.+/;

      // Challenge Part 1: Query that matches a particular property value in a specific property set via IsDefinedBy relation
      let queryParams: Parameters<OBC.ItemsFinder["create"]>[1][number];

      if (rawPset || rawProp || rawVal) {
        // Relational query on IsDefinedBy -> PropertySet
        const psetQueries: any[] = [];
        if (rawPset) {
          psetQueries.push({
            name: /^Name$/i,
            value: new RegExp(rawPset, "i"),
          });
        }
        if (rawProp) {
          psetQueries.push({
            name: new RegExp(rawProp, "i"),
            value: rawVal ? new RegExp(rawVal, "i") : /.+/,
          });
        } else if (rawVal) {
          psetQueries.push({
            name: /.+/,
            value: new RegExp(rawVal, "i"),
          });
        }

        queryParams = {
          categories: [categoryRegex],
          relation: {
            name: "IsDefinedBy",
            query: {
              categories: [/PROPERTYSET|ELEMENTQUANTITY/i],
              attributes: psetQueries.length > 0
                ? {
                    queries: psetQueries,
                  }
                : undefined,
            },
          },
        };
      } else {
        queryParams = {
          categories: [categoryRegex],
        };
      }

      finder.create(name, [queryParams]);
      const fq = finder.list.get(name);
      const found = fq ? await fq.test() : {};
      let count = 0;
      for (const s of Object.values(found)) count += s.size;

      if (!OBC.ModelIdMapUtils.isEmpty(found)) {
        const highlighter = components.get(OBCF.Highlighter);
        await highlighter.highlightByID("select", found, true, true);
      }

      setStatus(`Created "${name}" (${count} elements matching criteria).`);
      persistQueries();
      if (queryNameInput) queryNameInput.value = "";
      if (psetNameInput) psetNameInput.value = "";
      if (propNameInput) propNameInput.value = "";
      if (propValueInput) propValueInput.value = "";
    } catch (err: any) {
      setStatus(`Query creation error: ${err?.message || err}`, true);
    }
  };

  // Challenge Task 1: Export (download) ItemsFinder queries to JSON
  const onExportQueries = () => {
    try {
      const serialized = finder.export();
      const blob = new Blob([JSON.stringify(serialized, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `bim-items-finder-queries-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus("Queries exported to JSON successfully.");
    } catch (err: any) {
      setStatus(`Export failed: ${err?.message || err}`, true);
    }
  };

  // Challenge Task 1: Import (upload) ItemsFinder queries from JSON file
  const onImportQueries = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const imported = finder.import(json);
        persistQueries();
        setStatus(`Imported ${imported.length} queries successfully.`);
      } catch (err: any) {
        setStatus(`Import failed: ${err?.message || err}`, true);
      }
    };
    fileInput.click();
  };

  const onResetFilters = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    const hider = components.get(OBC.Hider);
    await Promise.all([highlighter.clear(), hider.set(true)]);
    try {
      const smartViews = components.get(SmartViews);
      smartViews.recordVisibility("showAll");
      smartViews.currentState.colors = { queries: new Map(), items: new Map() };
    } catch {}
    setStatus("All query highlights & visibility filters cleared.");
  };

  return BUI.html`
    <bim-panel-section
      label="IFC Semantic Queries & Spatial Filters"
      icon="solar:magnifer-bold"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(19, 20, 24, 0.95); border: 1px solid rgba(255, 255, 255, 0.12);"
    >
      <div style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.15);">
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <bim-text-input
            @input=${onSearchQueries}
            placeholder="Filter saved queries..."
            style="flex: 1; min-width: 0;"
          ></bim-text-input>
          <bim-button
            @click=${onResetFilters}
            icon="flowbite:eye-outline"
            label="Show All"
            tooltip-title="Clear Highlights & Restore Visibility"
            style="flex: 0;"
          ></bim-button>
          <!-- Challenge Task 1: Export/Download & Import/Upload Queries -->
          <bim-button
            @click=${onExportQueries}
            icon="material-symbols:download"
            tooltip-title="Download ItemsFinder Queries (.json)"
            style="flex: 0;"
          ></bim-button>
          <bim-button
            @click=${onImportQueries}
            icon="material-symbols:upload"
            tooltip-title="Upload Saved Queries (.json)"
            style="flex: 0;"
          ></bim-button>
        </div>

        <!-- Challenge Part 1: Property in Specific Property Set Query Builder -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; padding: 0.45rem; background: rgba(32, 33, 38, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px;">
          <bim-text-input
            ${BUI.ref((el) => {
              queryNameInput = el as BUI.TextInput;
            })}
            placeholder="Query Name (Optional)"
            style="grid-column: 1 / -1;"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              categoryRegexInput = el as BUI.TextInput;
            })}
            placeholder="IFC Category (WALL|SLAB)"
            value="WALL|COLUMN"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              psetNameInput = el as BUI.TextInput;
            })}
            placeholder="Property Set (Pset_WallCommon)"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              propNameInput = el as BUI.TextInput;
            })}
            placeholder="Property Name (LoadBearing)"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              propValueInput = el as BUI.TextInput;
            })}
            placeholder="Target Value (TRUE)"
          ></bim-text-input>
          <bim-button
            @click=${onCreateQuery}
            label="Run Property & Pset Query"
            icon="solar:add-circle-bold"
            style="grid-column: 1 / -1; --bim-button-background: #0284c7; color: white; font-weight: 600;"
          ></bim-button>
        </div>

        <span
          ${BUI.ref((el) => {
            statusBadge = el as HTMLSpanElement;
          })}
          style="font-size: 0.72rem; color: #94a3b8;"
        >Run, isolate, or color-code IFC classes & relations.</span>
      </div>

      <div style="flex: 1; overflow: auto; min-height: 0;">
        ${queriesTable}
      </div>
    </bim-panel-section>
  `;
};

