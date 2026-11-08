import * as OBC from "@thatopen/components";
import { Project } from "../../classes/Project";
import { createWorld, loadProjectModel, LoadedWorldModel } from "./src";

/**
 * Module 4 — Lesson 3.3: Root setupComponents Entry Point
 * Initializes the root OBC.Components singleton, configures the BIM World,
 * populates the project's 3D Digital Twin / IFC model, and starts the real-time engine loop.
 */
export const setupComponents = async (project?: Project) => {
  const components = new OBC.Components();
  const { world, viewport } = createWorld(components);
  components.init();

  let loadedModel: LoadedWorldModel | null = null;
  if (project) {
    loadedModel = await loadProjectModel(components, world, project);
  }

  return { components, world, viewport, loadedModel };
};

export * from "./src";

