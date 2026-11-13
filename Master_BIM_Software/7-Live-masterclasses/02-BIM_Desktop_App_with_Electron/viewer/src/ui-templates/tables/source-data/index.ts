import * as BUI from "@thatopen/ui";
import { DataEnhancer } from "../../../bim-components/DataEnhancer";
import { sourceDataTemplate } from "./template";
import { SourceDataState } from "./types";

export const sourceData = (state: SourceDataState) => {
  const element = BUI.Component.create<BUI.Table, SourceDataState>(
    sourceDataTemplate,
    state
  );

  const [table, update] = element;
  const enhancer = state.components.get(DataEnhancer);
  enhancer.onSourcesChanged.add(() => {
    table.loadData(true);
  });

  return [table, update] as const;
};

export * from "./types";

