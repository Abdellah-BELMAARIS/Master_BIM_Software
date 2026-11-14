import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { SmartViews } from "../../../bim-components/SmartViews";
import { QueriesListTableData } from "./types";

/**
 * Module 4 — Lesson 3.12 & 5.4: External Default Configuration for Queries List Table
 * Keeps table configuration decoupled from stateful template updates so custom user filters,
 * column settings, or queryString edits are preserved across updates.
 */
export const setDefaults = (
  components: OBC.Components,
  table: BUI.Table<QueriesListTableData>
) => {
  table.headersHidden = true;
  table.noIndentation = true;
  table.columns = [
    { name: "Name", width: "minmax(0, 1fr)" },
    { name: "Actions", width: "auto" },
  ];

  const getQueryItems = async (queryName: string) => {
    const finder = components.get(OBC.ItemsFinder);
    const finderQuery = finder.list.get(queryName);
    if (!finderQuery) return {};
    return finderQuery.test();
  };

  const focusItems = async (items: OBC.ModelIdMap) => {
    try {
      const worlds = components.get(OBC.Worlds);
      const world = [...worlds.list.values()][0];
      if (world?.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems(items);
      }
    } catch {}
  };

  table.dataTransform = {
    Name: (value) => {
      const name = String(value || "");
      return BUI.html`
        <div style="display: flex; align-items: center; gap: 6px; padding: 2px 0; min-width: 0;">
          <bim-icon icon="solar:filter-bold" style="color: #38bdf8; flex-shrink: 0;"></bim-icon>
          <bim-label style="font-size: 0.82rem; font-weight: 600; color: #f8fafc; overflow: hidden; text-overflow: ellipsis;">
            ${name}
          </bim-label>
        </div>
      `;
    },
    Actions: (_value, rowData) => {
      const queryName = String(rowData.Name || "");
      let colorInput: BUI.ColorInput | null = null;

      const onHighlightQuery = async (e: Event) => {
        const btn = e.currentTarget as BUI.Button;
        if (btn) btn.loading = true;
        try {
          const items = await getQueryItems(queryName);
          if (!OBC.ModelIdMapUtils.isEmpty(items)) {
            const highlighter = components.get(OBCF.Highlighter);
            await highlighter.highlightByID("select", items, true, true);
            await focusItems(items);
          }
        } catch (err) {
          console.warn(`[QueriesList] Error highlighting "${queryName}":`, err);
        } finally {
          if (btn) btn.loading = false;
        }
      };

      const onIsolateQuery = async (e: Event) => {
        const btn = e.currentTarget as BUI.Button;
        if (btn) btn.loading = true;
        try {
          const items = await getQueryItems(queryName);
          if (!OBC.ModelIdMapUtils.isEmpty(items)) {
            const hider = components.get(OBC.Hider);
            await hider.isolate(items);
            await focusItems(items);
            try {
              const smartViews = components.get(SmartViews);
              smartViews.currentState.defaultVisibility = false;
              smartViews.currentState.visibility = {
                exceptions: {
                  queries: new Set([queryName]),
                  items: {},
                },
              };
            } catch {}
          }
        } catch (err) {
          console.warn(`[QueriesList] Error isolating "${queryName}":`, err);
        } finally {
          if (btn) btn.loading = false;
        }
      };

      const onColorizeQuery = async (e: Event) => {
        const btn = e.currentTarget as BUI.Button;
        if (btn) btn.loading = true;
        try {
          const hexColor = colorInput?.color || colorInput?.value?.color || "#38bdf8";
          const items = await getQueryItems(queryName);
          if (!OBC.ModelIdMapUtils.isEmpty(items)) {
            const highlighter = components.get(OBCF.Highlighter);
            if (!highlighter.styles.has(hexColor)) {
              highlighter.styles.set(hexColor, {
                color: new THREE.Color(hexColor),
                opacity: 1,
                transparent: false,
                renderedFaces: 0,
              });
            }
            await highlighter.highlightByID(hexColor, items, false, false);
            try {
              const smartViews = components.get(SmartViews);
              smartViews.addQueryColor(queryName, hexColor);
            } catch {}
          }
        } catch (err) {
          console.warn(`[QueriesList] Error colorizing "${queryName}":`, err);
        } finally {
          if (btn) btn.loading = false;
          BUI.ContextMenu.removeMenus();
        }
      };

      const onDeleteQuery = () => {
        const finder = components.get(OBC.ItemsFinder);
        finder.list.delete(queryName);
      };

      return BUI.html`
        <div style="display: flex; align-items: center; gap: 3px;">
          <bim-button
            @click=${onHighlightQuery}
            icon="material-symbols:highlight"
            tooltip-title="Run & Highlight Query"
          ></bim-button>
          <bim-button
            @click=${onIsolateQuery}
            icon="flowbite:expand-outline"
            tooltip-title="Isolate Matching Elements"
          ></bim-button>
          <bim-button
            icon="flowbite:palette-outline"
            tooltip-title="Colorize Query Items (Syncs to Smart Views)"
          >
            <bim-context-menu>
              <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.65rem; min-width: 13rem; background: rgba(19, 20, 24, 0.96); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px;">
                <bim-color-input
                  ${BUI.ref((el) => {
                    colorInput = el as BUI.ColorInput;
                  })}
                  label="Query Color"
                  color="#38bdf8"
                ></bim-color-input>
                <bim-button
                  @click=${onColorizeQuery}
                  label="Apply Query Color"
                  icon="flowbite:check-outline"
                  style="--bim-button-background: #0284c7; color: white;"
                ></bim-button>
              </div>
            </bim-context-menu>
          </bim-button>
          <bim-button
            @click=${onDeleteQuery}
            icon="flowbite:trash-bin-outline"
            tooltip-title="Remove Query"
          ></bim-button>
        </div>
      `;
    },
  };
};

