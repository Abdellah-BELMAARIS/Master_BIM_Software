import * as BUI from "@thatopen/ui";
import { SmartViews } from "../../../bim-components/SmartViews";
import { SmartViewsTableData, SmartViewsTableState } from "./types";

export const smartViewsTableTemplate: BUI.StatefullComponent<
  SmartViewsTableState
> = (state) => {
  const { components } = state;
  const smartViews = components.get(SmartViews);

  const rows: BUI.TableGroupData<SmartViewsTableData>[] = [];
  for (const [id, view] of smartViews.list) {
    const colorCount =
      (view.colors?.queries?.size || 0) + (view.colors?.items?.size || 0);
    const visLabel = view.defaultVisibility ? "Show" : "Isolate";
    const summary = `${visLabel}${colorCount > 0 ? ` · ${colorCount} color${colorCount > 1 ? "s" : ""}` : ""}`;
    rows.push({
      data: {
        Name: view.name,
        Summary: summary,
        Actions: id,
        ViewId: id,
      },
    });
  }

  const onTableCreated = (el?: Element) => {
    if (!el) return;
    const table = el as BUI.Table<SmartViewsTableData>;
    table.data = rows;
  };

  return BUI.html`
    <bim-table ${BUI.ref(onTableCreated)}>
      <bim-label slot="missing-data" style="padding: 1rem; color: #94a3b8; font-size: 0.8rem;">
        No Smart Views created yet. Colorize or filter the model, then click Save View.
      </bim-label>
    </bim-table>
  `;
};

