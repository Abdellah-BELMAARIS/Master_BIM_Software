import * as BUI from "@thatopen/ui";
import {
  viewportToolbarTemplate,
  type ViewportToolbarState,
} from "../containers/viewport-toolbar";

export type { ViewportToolbarState };

/**
 * Module 4 — Lesson 3.8: Floating Viewport Grid
 *
 * Uses the `floating` attribute to overlay cleanly over the 3D WebGL canvas
 * without interfering with parent flex/grid layout flow.
 */
export const viewportGridTemplate: BUI.StatefullComponent<ViewportToolbarState> = (
  state: ViewportToolbarState
) => {
  const toolbar = BUI.Component.create<BUI.Toolbar>(() =>
    viewportToolbarTemplate(state)
  );

  return BUI.html`
    <bim-grid
      floating
      style="position: absolute; top: 62px; left: 16px; z-index: 25; pointer-events: none;"
    >
      <div style="pointer-events: auto;">
        ${toolbar}
      </div>
    </bim-grid>
  `;
};
