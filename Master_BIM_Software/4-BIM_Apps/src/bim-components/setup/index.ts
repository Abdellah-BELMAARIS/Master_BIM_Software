import * as OBC from "@thatopen/components";
import { createWorld } from "./src";

/**
 * Module 4 — Lesson 3.3: Root setupComponents Entry Point
 * Initializes the root OBC.Components singleton, configures the BIM World,
 * and starts the real-time engine loop.
 */
export const setupComponents = async () => {
  const components = new OBC.Components();
  const { world, viewport } = createWorld(components);
  components.init();

  return { components, world, viewport };
};

export * from "./src";
