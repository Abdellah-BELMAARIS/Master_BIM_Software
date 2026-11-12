import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { DataEnhancer } from "../../../bim-components/DataEnhancer";
import { SourceDataState } from "./types";

/**
 * Module 4 — Lesson 4.4: External Source Data Table
 * Uses Table.loadFunction for asynchronous dataset hydration and rowcreated events
 * to reverse-select & highlight matching 3D BIM elements on row click.
 */
export const sourceDataTemplate: BUI.StatefullComponent<SourceDataState> = (
  state
) => {
  const { components, sourceId } = state;
  const dataEnhancer = components.get(DataEnhancer);

  const loadFunction: BUI.TableLoadFunction = async () => {
    const rows = await dataEnhancer.getSourceRows(sourceId, false);
    if (!rows.length) return [];

    return rows.map((row) => {
      const sanitized: Record<string, BUI.TableCellValue> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined) continue;
        if (
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
        ) {
          sanitized[k] = v;
        } else {
          sanitized[k] = JSON.stringify(v);
        }
      }
      return { data: sanitized };
    });
  };

  const onRowCreated = (e: CustomEvent<BUI.RowCreatedEventDetail>) => {
    const { row } = e.detail;
    row.style.cursor = "pointer";
    row.title = "Click row to highlight & focus matching BIM elements in 3D";
    row.addEventListener("click", async () => {
      try {
        const items = await dataEnhancer.findItemsBySourceRow(
          sourceId,
          row.data
        );
        if (!OBC.ModelIdMapUtils.isEmpty(items)) {
          const highlighter = components.get(OBCF.Highlighter);
          await highlighter.highlightByID("select", items, true, true);
          const worlds = components.get(OBC.Worlds);
          const world = [...worlds.list.values()][0];
          if (world?.camera instanceof OBC.SimpleCamera) {
            await world.camera.fitToItems(items);
          }
        }
      } catch (err) {
        console.warn("[SourceData] Row selection error:", err);
      }
    });
  };

  const onTableCreated = (el?: Element) => {
    if (!el) return;
    const table = el as BUI.Table;
    table.noIndentation = true;
    table.hiddenColumns = ["_modelId", "_expressId"];
    table.loadFunction = loadFunction;
    table.loadData(true);
  };

  return BUI.html`
    <bim-table
      ${BUI.ref(onTableCreated)}
      @rowcreated=${onRowCreated}
    >
      <bim-label slot="missing-data" style="padding: 1rem; color: #94a3b8; font-size: 0.8rem;">
        No external records in "${sourceId}" yet.
      </bim-label>
    </bim-table>
  `;
};

