import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";

/**
 * Module 4 — Lesson 3.5: Displaying elements data
 * Configures the Highlighter component from @thatopen/components-front
 * to enable 3D element selection and dispatch selection events (ModelIdMap).
 */
export const setupHighlighter = (
  components: OBC.Components,
  world: OBC.World
) => {
  const highlighter = components.get(OBCF.Highlighter);
  highlighter.setup({ world });
  return highlighter;
};

