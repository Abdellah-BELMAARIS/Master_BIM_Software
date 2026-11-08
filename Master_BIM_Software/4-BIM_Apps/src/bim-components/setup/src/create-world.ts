import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import {
  viewportGridTemplate,
  type ViewportToolbarState,
} from "../../../ui-templates/grids/viewport";

/**
 * Module 4 — Lesson 3.3 & 3.8: Working with BIM Worlds
 * Factory function creating a fully configured That Open Engine World:
 * - SimpleScene with automated baseline lighting
 * - OrthoPerspectiveCamera with 2D/3D projection switching & camera-controls
 * - SimpleRenderer attached to Lit <bim-viewport>
 * - Viewport resize observer
 * - SimpleRaycaster for element picking
 * - Infinite 3D CAD Grid
 * - Lesson 3.8: Floating viewport grid holding the colorizer toolbar
 */
export const createWorld = (components: OBC.Components) => {
  const worlds = components.get(OBC.Worlds);

  const world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBC.SimpleRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();

  const viewport = BUI.Component.create<BUI.Viewport>(() => {
    return BUI.html`<bim-viewport></bim-viewport>`;
  });

  world.renderer = new OBC.SimpleRenderer(components, viewport);
  world.renderer.showLogo = false;
  world.camera = new OBC.OrthoPerspectiveCamera(components);

  const onViewportResize = () => {
    if (world.isDisposing) return;
    const cam = (world as unknown as { _camera?: OBC.OrthoPerspectiveCamera })._camera;
    if (!cam || !world.renderer) return;
    try {
      world.renderer.resize();
      cam.updateAspect();
      const fragments = components.get(OBC.FragmentsManager);
      if (fragments.initialized && fragments.list.size > 0) {
        const threeCam = cam.three;
        if (threeCam instanceof THREE.PerspectiveCamera || threeCam instanceof THREE.OrthographicCamera) {
          for (const [, model] of fragments.list) {
            model?.useCamera(threeCam);
          }
        }
        fragments.core.update(true);
      }
    } catch {}
  };

  viewport.addEventListener("resize", onViewportResize);
  world.onDisposed.add(() => {
    viewport.removeEventListener("resize", onViewportResize);
  });

  components.get(OBC.Raycasters).get(world);

  const grids = components.get(OBC.Grids);
  grids.create(world);

  // Lesson 3.8 – 3.13: Floating viewport grid holding the quick-access toolbar
  try {
    const [viewportGrid] = BUI.Component.create<BUI.Grid, ViewportToolbarState>(
      viewportGridTemplate,
      { components, world }
    );
    if (viewportGrid && viewportGrid instanceof HTMLElement) {
      viewport.append(viewportGrid);
    }
  } catch (err) {
    console.warn("[createWorld] Viewport grid overlay initialization deferred:", err);
  }

  return { world, viewport };
};

