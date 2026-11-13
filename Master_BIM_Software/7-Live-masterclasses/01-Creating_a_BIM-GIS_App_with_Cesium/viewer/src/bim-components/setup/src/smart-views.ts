import * as OBC from "@thatopen/components";
import { SmartViews } from "../../SmartViews";

/**
 * Module 4 — Section 5 (Lesson 5.1 & 5.2): Default Smart Views Setup
 * Configures ready-to-use discipline & structural review presets powered
 * by ItemsFinder queries, Hider isolation, and Highlighter styles.
 */
export const setupSmartViews = (components: OBC.Components) => {
  const smartViews = components.get(SmartViews);

  if (!smartViews.list.has("structural-frame-xray")) {
    smartViews.register({
      id: "structural-frame-xray",
      name: "Structural Frame Isolation",
      description:
        "Isolates columns, beams & bearing walls with discipline color coding",
      defaultVisibility: false,
      visibility: {
        exceptions: {
          queries: new Set([
            "Structural Columns & Beams",
            "Walls & Enclosures",
          ]),
        },
      },
      colors: {
        queries: new Map([
          ["#38bdf8", new Set(["Structural Columns & Beams"])],
          ["#64748b", new Set(["Walls & Enclosures"])],
        ]),
      },
    });
  }

  if (!smartViews.list.has("slabs-roof-audit")) {
    smartViews.register({
      id: "slabs-roof-audit",
      name: "Slabs, Seating & Roof Envelope",
      description:
        "Highlights all floor plates, stadium bowls & roof assemblies in emerald & amber",
      defaultVisibility: true,
      colors: {
        queries: new Map([
          ["#10b981", new Set(["Slabs, Seating & Decks"])],
          ["#f59e0b", new Set(["Roofs, Stairs & Circulation"])],
        ]),
      },
    });
  }

  if (!smartViews.list.has("discipline-full-map")) {
    smartViews.register({
      id: "discipline-full-map",
      name: "Full BIM Discipline Color Map",
      description:
        "Color-codes every architectural, structural & fixture category simultaneously",
      defaultVisibility: true,
      colors: {
        queries: new Map([
          ["#3b82f6", new Set(["Walls & Enclosures"])],
          ["#10b981", new Set(["Slabs, Seating & Decks"])],
          ["#f59e0b", new Set(["Structural Columns & Beams"])],
          ["#06b6d4", new Set(["Doors & Glazing Openings"])],
          ["#a855f7", new Set(["Fixtures, Solar & Proxies"])],
        ]),
      },
    });
  }

  return smartViews;
};

