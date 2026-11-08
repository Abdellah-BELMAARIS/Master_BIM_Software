import * as OBC from "@thatopen/components";
import { Project } from "../../classes/Project";
import {
  createWorld,
  setupIfcLoader,
  setupFragments,
  setupHighlighter,
  loadProjectModel,
  LoadedWorldModel,
} from "./src";

/**
 * Module 4 — Lessons 3.4 - 3.6: Root setupComponents Entry Point
 * Initializes OBC.Components, BIM World, FragmentsManager, IfcLoader,
 * Highlighter, and populates the project model.
 */
export const setupComponents = async (project?: Project) => {
  const components = new OBC.Components();
  const { world, viewport } = createWorld(components);
  components.init();

  // Lesson 3.4: Configure FragmentsManager and WebIFC-backed IfcLoader
  await setupFragments(components, world);
  await setupIfcLoader(components);

  // Lesson 3.5: Configure Highlighter from @thatopen/components-front
  setupHighlighter(components, world);

  let loadedModel: LoadedWorldModel | null = null;
  if (project) {
    loadedModel = await loadProjectModel(components, world, project);
  }

  return { components, world, viewport, loadedModel };
};

export * from "./src";
