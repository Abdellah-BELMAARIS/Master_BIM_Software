import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { QueriesListState, QueriesListTableData } from "./types";

export const queriesListTemplate: BUI.StatefullComponent<QueriesListState> = (
  state
) => {
  const { components } = state;
  const finder = components.get(OBC.ItemsFinder);

  const rows: BUI.TableGroupData<QueriesListTableData>[] = [];
  for (const [name] of finder.list) {
    rows.push({
      data: {
        Name: name,
        Actions: name,
      },
    });
  }

  const onTableCreated = (el?: Element) => {
    if (!el) return;
    const table = el as BUI.Table<QueriesListTableData>;
    table.data = rows;
  };

  return BUI.html`
    <bim-table ${BUI.ref(onTableCreated)}></bim-table>
  `;
};

