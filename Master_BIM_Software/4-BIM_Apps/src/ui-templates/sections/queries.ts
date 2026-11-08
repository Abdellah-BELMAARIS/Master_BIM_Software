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

  let queryNameInput: BUI.TextInput | null = null;
  let categoryRegexInput: BUI.TextInput | null = null;
  let attrValueInput: BUI.TextInput | null = null;
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
    const rawAttr = attrValueInput?.value?.trim() || "";

    if (!rawCategory && !rawAttr) {
      setStatus("Enter a Category regex or Attribute keyword.", true);
      return;
    }

    const name =
      rawName ||
      `${rawCategory || "Items"}${rawAttr ? ` (${rawAttr})` : ""}`.slice(0, 40);

    try {
      const categoryRegex = rawCategory
        ? new RegExp(rawCategory.replace(/^\//, "").replace(/\/i?$/, ""), "i")
        : /.+/;

      const queryParams: Parameters<OBC.ItemsFinder["create"]>[1][number] = {
        categories: [categoryRegex],
      };

      if (rawAttr) {
        queryParams.attributes = {
          queries: [
            {
              name: /^(Name|ObjectType|Description|Tag)$/i,
              value: new RegExp(rawAttr, "i"),
            },
          ],
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

      setStatus(`Saved "${name}" (${count} elements matched).`);
      if (queryNameInput) queryNameInput.value = "";
    } catch (err: any) {
      setStatus(`Invalid regex pattern: ${err?.message || err}`, true);
    }
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
      label="Data Queries (ItemsFinder)"
      icon="material-symbols:search"
      fixed
      style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.25);"
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
        </div>

        <!-- Inline New Query Creator -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; padding: 0.45rem; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px;">
          <bim-text-input
            ${BUI.ref((el) => {
              queryNameInput = el as BUI.TextInput;
            })}
            placeholder="Query Name"
            style="grid-column: 1 / -1;"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              categoryRegexInput = el as BUI.TextInput;
            })}
            placeholder="Category (WALL|SLAB)"
            value="WALL|COLUMN"
          ></bim-text-input>
          <bim-text-input
            ${BUI.ref((el) => {
              attrValueInput = el as BUI.TextInput;
            })}
            placeholder="Name/Attr filter (opt.)"
          ></bim-text-input>
          <bim-button
            @click=${onCreateQuery}
            label="Add & Run Query"
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

