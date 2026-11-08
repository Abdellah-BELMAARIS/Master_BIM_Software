import * as OBC from "@thatopen/components";
import { Project } from "../../classes/Project";
import {
  createWorld,
  setupIfcLoader,
  setupFragments,
  setupHighlighter,
  setupItemsFinder,
  setupDataEnhancer,
  setupSmartViews,
  loadProjectModel,
  LoadedWorldModel,
} from "./src";

/**
 * Module 4 — Lessons 3.4 – 5.5: Root setupComponents Entry Point
 * Initializes OBC.Components, BIM World, FragmentsManager, IfcLoader,
 * Highlighter, ItemsFinder, DataEnhancer, SmartViews, and loads the project model.
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

  // Lessons 3.11 & 3.12: Configure ItemsFinder with curated BIM & relational queries
  setupItemsFinder(components);

  // Section 4 (Lessons 4.1 – 4.5): Configure DataEnhancer with JSON, QA/Cost & Firestore sources
  setupDataEnhancer(components, project?.id);

  // Section 5 (Lessons 5.1 – 5.5): Configure SmartViews presets & current state tracking
  setupSmartViews(components);

  let loadedModel: LoadedWorldModel | null = null;
  if (project) {
    loadedModel = await loadProjectModel(components, world, project);
  }

  return { components, world, viewport, loadedModel };
};

export * from "./src";
