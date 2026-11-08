import * as BUI from "@thatopen/ui";
import { SmartViews } from "../../../bim-components/SmartViews";
import { setDefaults } from "./set-defaults";
import { smartViewsTableTemplate } from "./template";
import { SmartViewsTableData, SmartViewsTableState } from "./types";

export const smartViewsTable = (state: SmartViewsTableState) => {
  const [table, update, currentState] = BUI.Component.create<
    BUI.Table<SmartViewsTableData>,
    SmartViewsTableState
  >(smartViewsTableTemplate, state);

  setDefaults(state.components, table, () => update());

  const smartViews = state.components.get(SmartViews);
  smartViews.onViewCreated.add(() => update());
  smartViews.onViewDeleted.add(() => update());
  smartViews.list.onItemSet.add(() => update());
  smartViews.list.onItemDeleted.add(() => update());

  return [table, update, currentState] as const;
};

export * from "./types";

