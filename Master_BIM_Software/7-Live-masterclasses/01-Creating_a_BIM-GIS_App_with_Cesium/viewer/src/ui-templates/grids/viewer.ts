import * as BUI from "@thatopen/ui";
import type { ViewportContainerState } from "../containers/viewport";

/**
 * Lesson 2.4 Assignment: Strongly typed ViewerGrid definition
 */
export type ViewerGridElement = [
  {
    name: "viewport";
    state: ViewportContainerState;
  },
  "header",
  "sidebar",
  "components"
];

export type ViewerGridLayout = ["main"];

export type ViewerGrid = BUI.Grid<ViewerGridLayout, ViewerGridElement>;
