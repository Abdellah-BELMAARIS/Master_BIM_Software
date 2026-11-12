import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { queriesListTemplate } from "./template";
import { setDefaults } from "./set-defaults";
import { QueriesListState, QueriesListTableData } from "./types";

export const queriesList = (state: QueriesListState) => {
  const [table, update, currentState] = BUI.Component.create<
    BUI.Table<QueriesListTableData>,
    QueriesListState
  >(queriesListTemplate, state);

  setDefaults(state.components, table);

  const finder = state.components.get(OBC.ItemsFinder);
  finder.list.onItemSet.add(() => update());
  finder.list.onItemDeleted.add(() => update());

  return [table, update, currentState] as const;
};

export * from "./types";

