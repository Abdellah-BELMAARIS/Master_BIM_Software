import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { queriesTemplate, QueriesSectionState } from "./queries";

export interface QueryPanelState {
  components: OBC.Components;
}

/**
 * Legacy alias forwarding to the Lesson 3.12+ queriesTemplate backed by OBC.ItemsFinder.
 */
export const queryPanelTemplate: BUI.StatefullComponent<QueryPanelState> = (
  state: QueryPanelState,
  update
) => {
  return queriesTemplate(state, update as BUI.UpdateFunction<QueriesSectionState>);
};
