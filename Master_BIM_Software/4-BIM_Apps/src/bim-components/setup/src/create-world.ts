import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";

/**
 * Module 4 — Lesson 3.3: Working with BIM Worlds
 * Factory function creating a fully configured That Open Engine World:
 * - SimpleScene with automated baseline lighting
 * - OrthoPerspectiveCamera with 2D/3D projection switching & camera-controls
 * - SimpleRenderer attached to Lit <bim-viewport>
 * - Viewport resize observer
 * - SimpleRaycaster for element picking
 * - Infinite 3D CAD Grid
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
  world.camera = new OBC.OrthoPerspectiveCamera(components);

  viewport.addEventListener("resize", () => {
    world.renderer?.resize();
    world.camera.updateAspect();
  });

  components.get(OBC.Raycasters).get(world);

  const grids = components.get(OBC.Grids);
  grids.create(world);

  return { world, viewport };
};

