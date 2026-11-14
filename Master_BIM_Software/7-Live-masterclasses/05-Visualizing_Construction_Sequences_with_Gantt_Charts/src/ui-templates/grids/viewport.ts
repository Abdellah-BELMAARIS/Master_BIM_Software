import * as BUI from "@thatopen/ui";
import {
  viewportToolbarTemplate,
  type ViewportToolbarState,
} from "../containers/viewport-toolbar";

export type { ViewportToolbarState };

/**
 * Module 4 — Lesson 3.8 – 3.13: Floating Viewport Grid
 *
 * Uses the `floating` attribute to overlay cleanly over the 3D WebGL canvas
 * without interfering with parent flex/grid layout flow.
 */
export const viewportGridTemplate: BUI.StatefullComponent<ViewportToolbarState> = (
  state: ViewportToolbarState
) => {
  const onGridCreated = (el?: Element) => {
    if (!el) return;
    const grid = el as BUI.Grid<
      ["main"],
      [{ name: "toolbar"; state: ViewportToolbarState }]
    >;
    grid.elements = {
      toolbar: {
        template: viewportToolbarTemplate,
        initialState: state,
      },
    };
    grid.layouts = {
      main: {
        template: `
          "toolbar" auto
          / minmax(0, max-content)
        `,
      },
    };
    grid.layout = "main";
  };

  return BUI.html`
    <bim-grid
      floating
      class="toc-viewport-floating-grid"
      ${BUI.ref(onGridCreated)}
    ></bim-grid>
  `;
};
