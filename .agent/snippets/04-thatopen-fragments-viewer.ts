/**
 * Snippet 04: That Open Engine BIM World, IFC-to-Fragments Loader & Classifier (Module 4)
 * Covers Lessons 3.1 - 3.13:
 * - Creating an OBC.Components instance & SimpleWorld
 * - Configuring OBC.IfcLoader to convert .ifc files into binary .frag models
 * - Listening to FragmentsManager.onFragmentsLoaded and indexing properties
 */

import * as OBC from "@thatopen/components";

export async function createBIMViewer(container: HTMLElement) {
  const components = new OBC.Components();

  // 1. Setup BIM World (Scene, Camera, Renderer) - Lesson 3.3
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBC.SimpleRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.SimpleCamera(components);

  components.init();
  world.scene.setup();

  const grids = components.get(OBC.Grids);
  grids.create(world);

  // 2. Setup FragmentsManager & IFC Loader - Lesson 3.4
  const fragments = components.get(OBC.FragmentsManager);
  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup();

  fragments.onFragmentsLoaded.add((model) => {
    world.scene.three.add(model);
    console.log(`Loaded BIM Fragment Model: ${model.name}`, model);
  });

  // 3. Load an IFC buffer and convert to Fragments
  async function loadIfcFile(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    await ifcLoader.load(buffer);
  }

  // 4. Export binary .frag + properties JSON - Lesson 3.7
  function exportFragments(model: Awaited<ReturnType<typeof ifcLoader.load>>) {
    const fragmentBinary = fragments.export(model);
    return fragmentBinary;
  }

  return { components, world, fragments, ifcLoader, loadIfcFile, exportFragments };
}
