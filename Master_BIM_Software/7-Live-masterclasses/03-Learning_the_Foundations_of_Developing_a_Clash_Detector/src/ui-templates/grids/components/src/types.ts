import * as BUI from "@thatopen/ui";
import {
  ItemsDataState,
  ModelsState,
  QueriesSectionState,
  DataSourcesState,
  SmartViewsSectionState,
  GISState,
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
  },
  {
    name: "gis";
    state: GISState;
  }
];

export type ComponentsGridLayout = [
  "Viewer",
  "Models",
  "Queries",
  "Properties",
  "Enhance",
  "SmartViews",
  "GIS"
];

export type ComponentsGrid = BUI.Grid<ComponentsGridLayout, ComponentsGridElement>;
