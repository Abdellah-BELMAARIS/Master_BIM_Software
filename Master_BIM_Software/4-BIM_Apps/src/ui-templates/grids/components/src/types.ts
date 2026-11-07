import * as BUI from "@thatopen/ui";

export type ComponentsGridElement = [
  {
    name: "viewport";
    state: {};
  }
];

export type ComponentsGridLayout = ["models"];

export type ComponentsGrid = BUI.Grid<ComponentsGridLayout, ComponentsGridElement>;

