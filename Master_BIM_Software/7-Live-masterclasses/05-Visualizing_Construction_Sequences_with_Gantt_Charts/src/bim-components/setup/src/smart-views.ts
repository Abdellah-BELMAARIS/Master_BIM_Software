import * as OBC from "@thatopen/components";
import { SmartViews } from "../../SmartViews";

/**
 * Module 4 — Section 5 (Lesson 5.1 & 5.2): Default Smart Views Setup
 * Configures CYPE-grade discipline, structural, ferraillage (rebar), and MEP
 * presets powered by ItemsFinder queries, Hider isolation, and Highlighter styles.
 */
export const setupSmartViews = (components: OBC.Components) => {
  const smartViews = components.get(SmartViews);

  if (!smartViews.list.has("cype-structural-rebar")) {
    smartViews.register({
      id: "cype-structural-rebar",
      name: "CYPE Structure & Ferraillage (Rebar)",
      description:
        "Isolates foundations, columns, beams, slabs & reinforcement (ferraillage) with CYPE engineering colors",
      defaultVisibility: false,
      visibility: {
        exceptions: {
          queries: new Set([
            "Foundations & Footings",
            "Structural Columns & Beams",
            "Slabs, Seating & Decks",
            "Rebar & Ferraillage",
          ]),
        },
      },
      colors: {
        queries: new Map([
          ["#e11d48", new Set(["Rebar & Ferraillage"])],
          ["#2563eb", new Set(["Structural Columns & Beams"])],
          ["#b45309", new Set(["Foundations & Footings"])],
          ["#10b981", new Set(["Slabs, Seating & Decks"])],
        ]),
      },
    });
  }

  if (!smartViews.list.has("cype-mep-coordination")) {
    smartViews.register({
      id: "cype-mep-coordination",
      name: "CYPE MEP & Services Coordination",
      description:
        "Highlights MEP piping/ducts in magenta against structural blue & muted architectural walls",
      defaultVisibility: true,
      colors: {
        queries: new Map([
          ["#ec4899", new Set(["MEP & HVAC Systems"])],
          ["#2563eb", new Set(["Structural Columns & Beams"])],
          ["#64748b", new Set(["Walls & Enclosures"])],
        ]),
      },
    });
  }

  if (!smartViews.list.has("structural-frame-xray")) {
    smartViews.register({
      id: "structural-frame-xray",
      name: "Structural Frame Isolation",
      description:
        "Isolates footings, columns, beams & bearing walls with real structural color coding",
      defaultVisibility: false,
      visibility: {
        exceptions: {
          queries: new Set([
            "Foundations & Footings",
            "Structural Columns & Beams",
            "Rebar & Ferraillage",
            "Walls & Enclosures",
          ]),
        },
      },
      colors: {
        queries: new Map([
          ["#e11d48", new Set(["Rebar & Ferraillage"])],
          ["#2563eb", new Set(["Structural Columns & Beams"])],
          ["#b45309", new Set(["Foundations & Footings"])],
          ["#64748b", new Set(["Walls & Enclosures"])],
        ]),
      },
    });
  }

  if (!smartViews.list.has("slabs-roof-audit")) {
    smartViews.register({
      id: "slabs-roof-audit",
      name: "Slabs, Decks & Roof Envelope",
      description:
        "Highlights floor plates in emerald and roof/stair circulation in violet",
      defaultVisibility: true,
      colors: {
        queries: new Map([
          ["#10b981", new Set(["Slabs, Seating & Decks"])],
          ["#8b5cf6", new Set(["Roofs, Stairs & Circulation"])],
        ]),
      },
    });
  }

  if (!smartViews.list.has("discipline-full-map")) {
    smartViews.register({
      id: "discipline-full-map",
      name: "Full BIM Discipline Color Map (CYPE Pro)",
      description:
        "Color-codes Architecture, Structure, Ferraillage (Rebar), Glazing, Roofs & MEP simultaneously",
      defaultVisibility: true,
      colors: {
        queries: new Map([
          ["#64748b", new Set(["Walls & Enclosures"])],
          ["#10b981", new Set(["Slabs, Seating & Decks"])],
          ["#b45309", new Set(["Foundations & Footings"])],
          ["#2563eb", new Set(["Structural Columns & Beams"])],
          ["#e11d48", new Set(["Rebar & Ferraillage"])],
          ["#06b6d4", new Set(["Doors & Glazing Openings"])],
          ["#8b5cf6", new Set(["Roofs, Stairs & Circulation"])],
          ["#ec4899", new Set(["MEP & HVAC Systems", "Fixtures, Solar & Proxies"])],
        ]),
      },
    });
  }

  return smartViews;
};
