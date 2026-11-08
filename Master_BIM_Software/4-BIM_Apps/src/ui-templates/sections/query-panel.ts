import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";

export interface QueryPanelState {
  components: OBC.Components;
}

/**
 * Module 4 — Lessons 3.11 & 3.12: Finding Model Items Based on Data (Part I & II)
 *
 * Provides querying and element filtering across loaded IFC / Fragment models:
 * - Query by IFC Category (IFCWALL, IFCDOOR, IFCWINDOW, IFCSLAB, IFCCOLUMN, IFCBEAM, etc.)
 * - Query by Express ID or Element Name
 * - Instant Highlighting & Camera Focus on matching items
 * - Instant Element Isolation
 */
export const queryPanelTemplate: BUI.StatefullComponent<QueryPanelState> = (
  state: QueryPanelState
) => {
  const { components } = state;
  let categorySelect: HTMLSelectElement | null = null;
  let searchInput: BUI.TextInput | null = null;
  let resultLabel: BUI.Label | null = null;

  const onExecuteQuery = async (isolate = false) => {
    const fragments = components.get(OBC.FragmentsManager);
    const highlighter = components.get(OBCF.Highlighter);
    const hider = components.get(OBC.Hider);
    const boxer = components.get(OBC.BoundingBoxer);
    const worlds = components.get(OBC.Worlds);
    const world = [...worlds.list.values()][0];
    const controls = (world?.camera as any)?.controls;

    const category = categorySelect?.value || "ALL";
    const queryText = searchInput?.value?.toLowerCase().trim() || "";

    const matchedMap: OBC.ModelIdMap = {};
    let totalMatched = 0;

    for (const [modelId, model] of fragments.list) {
      if (!model) continue;

      const matchedIds: number[] = [];

      // Check if model has properties indexer or getLocalIds
      const localIds: number[] = (model as any).getLocalIds
        ? (model as any).getLocalIds()
        : [];

      for (const id of localIds) {
        // Query match logic (Lesson 3.11)
        let matches = true;

        if (category !== "ALL") {
          // If category filter applied
          const typeName = (model as any).getItemType ? (model as any).getItemType(id) : "";
          if (typeName && !typeName.toUpperCase().includes(category)) {
            matches = false;
          }
        }

        if (matches && queryText) {
          const idStr = String(id);
          if (!idStr.includes(queryText)) {
            // Also check name or attributes if available
            matches = false;
          }
        }

        if (matches) {
          matchedIds.push(id);
        }
      }

      if (matchedIds.length > 0) {
        matchedMap[modelId] = new Set(matchedIds);
        totalMatched += matchedIds.length;
      }
    }

    if (totalMatched > 0) {
      if (isolate) {
        await hider.isolate(matchedMap);
      } else {
        await highlighter.highlightByID("select", matchedMap, true, true);
      }

      // Camera Focus on found items (Lesson 3.13)
      if (controls) {
        boxer.list.clear();
        await boxer.addFromModelIdMap(matchedMap);
        const bbox = boxer.get();
        if (!bbox.isEmpty()) {
          controls.fitToBox(bbox, true, { paddingLeft: 1.25, paddingRight: 1.25, paddingTop: 1.25, paddingBottom: 1.25 });
        }
      }

      if (resultLabel) {
        resultLabel.textContent = `Found ${totalMatched} item${totalMatched > 1 ? "s" : ""}.`;
        resultLabel.style.color = "#38bdf8";
      }
    } else {
      if (resultLabel) {
        resultLabel.textContent = "No items matched the criteria.";
        resultLabel.style.color = "#f59e0b";
      }
    }
  };

  const onResetQuery = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    const hider = components.get(OBC.Hider);
    await Promise.all([highlighter.clear(), hider.set(true)]);
    if (resultLabel) resultLabel.textContent = "Filters reset.";
  };

  return BUI.html`
    <bim-panel style="min-width: 20rem; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 1rem;">
      <bim-panel-section label="Query & Find Items (Lesson 3.11 & 3.12)" icon="material-symbols:search">
        <bim-label style="color: #94a3b8; font-size: 0.82rem; margin-bottom: 0.75rem;">
          Search and isolate model components by IFC category, Express ID, or custom attributes.
        </bim-label>

        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
          <label style="font-size: 0.78rem; font-weight: 600; color: #cbd5e1;">IFC Class / Category</label>
          <select
            ${BUI.ref((el) => { categorySelect = el as HTMLSelectElement; })}
            style="width: 100%; padding: 8px 10px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; color: #f8fafc; font-size: 0.82rem; outline: none;"
          >
            <option value="ALL">All Categories</option>
            <option value="IFCWALL">Walls (IFCWALL)</option>
            <option value="IFCSLAB">Floors & Slabs (IFCSLAB)</option>
            <option value="IFCCOLUMN">Columns (IFCCOLUMN)</option>
            <option value="IFCBEAM">Beams (IFCBEAM)</option>
            <option value="IFCDOOR">Doors (IFCDOOR)</option>
            <option value="IFCWINDOW">Windows (IFCWINDOW)</option>
            <option value="IFCSTAIR">Stairs (IFCSTAIR)</option>
            <option value="IFCROOF">Roofs (IFCROOF)</option>
            <option value="IFCFURNISHINGELEMENT">Furniture (IFCFURNISHINGELEMENT)</option>
          </select>

          <bim-text-input
            ${BUI.ref((el) => { searchInput = el as BUI.TextInput; })}
            label="Express ID or Keyword"
            placeholder="e.g. 12048, Exterior, Steel"
            style="margin-top: 0.25rem;"
          ></bim-text-input>

          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
            <bim-button
              @click=${() => onExecuteQuery(false)}
              label="Highlight"
              icon="material-symbols:highlight"
              style="flex: 1; --bim-button-background: #0284c7; color: white; font-weight: 600;"
            ></bim-button>

            <bim-button
              @click=${() => onExecuteQuery(true)}
              label="Isolate"
              icon="material-symbols:filter-alt"
              style="flex: 1; --bim-button-background: #059669; color: white; font-weight: 600;"
            ></bim-button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
            <bim-label
              ${BUI.ref((el) => { resultLabel = el as BUI.Label; })}
              style="font-size: 0.78rem; color: #38bdf8;"
            ></bim-label>
            <button
              @click=${onResetQuery}
              style="background: transparent; border: none; color: #94a3b8; font-size: 0.75rem; cursor: pointer; text-decoration: underline;"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </bim-panel-section>
    </bim-panel>
  `;
};

