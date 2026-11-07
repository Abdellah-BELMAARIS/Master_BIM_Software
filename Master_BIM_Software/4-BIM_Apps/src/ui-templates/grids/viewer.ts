import * as BUI from "@thatopen/ui";

/**
 * Lesson 2.4 Assignment: Strongly typed ViewerGrid definition
 */
export type ViewerGridElement = [
  "header",
  "sidebar",
  "components"
];

export type ViewerGridLayout = ["main"];

export type ViewerGrid = BUI.Grid<ViewerGridLayout, ViewerGridElement>;

