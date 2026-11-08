import * as THREE from "three";
import * as OBC from "@thatopen/components";

const asFragCamera = (
  cam?: THREE.Camera | null
): THREE.PerspectiveCamera | THREE.OrthographicCamera | undefined => {
  if (cam instanceof THREE.PerspectiveCamera || cam instanceof THREE.OrthographicCamera) {
    return cam;
  }
  return undefined;
};

/**
 * Module 4 — Lesson 3.4: Loading BIM Models (Fragments)
 * Initializes OBC.FragmentsManager with the version-matched multi-threaded web worker,
 * wires reactive model lifecycle events (camera assignment, scene mounting, projection sync,
 * ItemsFinder cache invalidation, and dynamic LOD flush).
 */
export const setupFragments = async (
  components: OBC.Components,
  world: OBC.World
) => {
  const fragments = components.get(OBC.FragmentsManager);

  // Initialize fragments core with version-matched worker blob URL
  if (!fragments.initialized) {
    try {
      const workerUrl = await OBC.FragmentsManager.getWorker();
      fragments.init(workerUrl);
    } catch (err) {
      console.warn("[ThatOpen] Falling back to default fragments worker:", err);
      fragments.init("");
    }
  }

  // Keep every loaded FragmentsModel synced whenever camera projection toggles (Perspective <-> Orthographic 2D Plan)
  if (world.camera instanceof OBC.OrthoPerspectiveCamera) {
    const onProjChanged = (activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera) => {
      if (!fragments.initialized || world.isDisposing) return;
      for (const [, model] of fragments.list) {
        if (model) {
          model.useCamera(activeCamera);
        }
      }
      fragments.core.update(true);
    };
    world.camera.projection.onChanged.add(onProjChanged);
    world.onDisposed.add(() => {
      try {
        (world as { _camera?: OBC.OrthoPerspectiveCamera })._camera?.projection?.onChanged?.remove(onProjChanged);
      } catch {}
    });
  }

  // Reactive model lifecycle: when a FragmentsModel is loaded into the fragments list
  fragments.list.onItemSet.add(({ value: model }) => {
    if (!model || !fragments.initialized || world.isDisposing) return;

    // 1. Assign active Three.js camera for frustum culling and multi-resolution LOD
    const cam = asFragCamera(world.camera?.three);
    if (cam) {
      model.useCamera(cam);
    }

    // 2. Add model Three.js Object3D root to world scene
    if (world.scene?.three && model.object) {
      world.scene.three.add(model.object);
    }

    // 3. Invalidate cached ItemsFinder queries so new models are immediately searchable (Lesson 3.11)
    try {
      const finder = components.get(OBC.ItemsFinder);
      for (const [, query] of finder.list) {
        query.clearCache();
      }
    } catch {}

    // 4. Trigger immediate worker flush and culling update
    if (fragments.initialized) {
      fragments.core.update(true);
    }
  });

  // Dynamic LOD & Frustum Culling on camera movement (cleaned up on world disposal)
  if (world.camera?.hasCameraControls()) {
    const onControlsUpdate = () => {
      if (!fragments.initialized || world.isDisposing) return;
      fragments.core.update();
    };
    world.camera.controls.addEventListener("update", onControlsUpdate);
    world.onDisposed.add(() => {
      try {
        (world as { _camera?: OBC.OrthoPerspectiveCamera })._camera?.controls?.removeEventListener("update", onControlsUpdate);
      } catch {}
    });
  }

  return fragments;
};
