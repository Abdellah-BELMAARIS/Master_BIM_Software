import * as BUI from "@thatopen/ui";
import { ItemsDataState, ModelsState } from "../../../sections";

export type ComponentsGridElement = [
  {
    name: "viewport";
    state: {};
  },
  {
    name: "itemsData";
    state: ItemsDataState;
  },
  {
    name: "models";
    state: ModelsState;
  }
];

export type ComponentsGridLayout = ["models"];

export type ComponentsGrid = BUI.Grid<ComponentsGridLayout, ComponentsGridElement>;

