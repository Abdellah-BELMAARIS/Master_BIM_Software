import * as OBC from "@thatopen/components";

/**
 * Module 4 — Lesson 3.4: Loading BIM Models (Fragments)
 * Initializes OBC.FragmentsManager with the version-matched multi-threaded web worker,
 * wires reactive model lifecycle events (camera assignment, scene mounting, LOD flush),
 * and hooks camera controls for continuous level-of-detail updates.
 */
export const setupFragments = async (
  components: OBC.Components,
  world: OBC.World
) => {
  const fragments = components.get(OBC.FragmentsManager);

  // Initialize fragments core with version-matched worker blob URL
  try {
    const workerUrl = await OBC.FragmentsManager.getWorker();
    fragments.init(workerUrl);
  } catch (err) {
    console.warn("[ThatOpen] Falling back to default fragments worker:", err);
    fragments.init("");
  }

  // Reactive model lifecycle: when a FragmentsModel is loaded into the fragments list
  fragments.list.onItemSet.add(({ value: model }) => {
    // 1. Assign camera for frustum culling and multi-resolution LOD
    if (world.camera?.three) {
      model.useCamera(world.camera.three);
    }

    // 2. Add model Three.js Object3D root to world scene
    if (world.scene?.three) {
      world.scene.three.add(model.object);
    }

    // 3. Trigger immediate worker flush and culling update
    fragments.core?.update(true);
  });

  // Dynamic LOD & Frustum Culling on camera movement
  if (world.camera?.hasCameraControls()) {
    world.camera.controls.addEventListener("update", () => {
      fragments.core?.update();
    });
  }

  return fragments;
};

