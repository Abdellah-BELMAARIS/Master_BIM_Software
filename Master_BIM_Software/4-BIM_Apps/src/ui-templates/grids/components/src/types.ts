import * as BUI from "@thatopen/ui";
import {
  ItemsDataState,
  ModelsState,
  QueriesSectionState,
  DataSourcesState,
  SmartViewsSectionState,
} from "../../../sections";

export type ComponentsGridElement = [
  {
    name: "viewport";
    state: { viewport?: HTMLElement };
  },
  {
    name: "itemsData";
    state: ItemsDataState;
  },
  {
    name: "models";
    state: ModelsState;
  },
  {
    name: "queries";
    state: QueriesSectionState;
  },
  {
    name: "dataSources";
    state: DataSourcesState;
  },
  {
    name: "smartViews";
    state: SmartViewsSectionState;
  }
];

export type ComponentsGridLayout = [
  "Viewer",
  "Models",
  "Queries",
  "Properties",
  "Enhance",
  "SmartViews"
];

export type ComponentsGrid = BUI.Grid<ComponentsGridLayout, ComponentsGridElement>;
