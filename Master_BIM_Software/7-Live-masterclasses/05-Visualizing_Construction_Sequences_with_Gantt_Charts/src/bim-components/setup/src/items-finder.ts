import * as OBC from "@thatopen/components";

/**
 * Module 4 — Lessons 3.11 & 3.12: Finding Model Items Based on Data
 * Configures OBC.ItemsFinder with curated architectural, structural, MEP,
 * and relational BIM queries, keeping query caches synced on model changes.
 */
export const setupItemsFinder = (components: OBC.Components) => {
  const finder = components.get(OBC.ItemsFinder);
  const fragments = components.get(OBC.FragmentsManager);

  const registerQuery = (name: string, params: Parameters<OBC.ItemsFinder["create"]>[1]) => {
    if (!finder.list.has(name)) {
      finder.create(name, params);
    }
  };

  // Core Discipline & Category Queries (Regex-based IFC Class matching)
  registerQuery("Walls & Enclosures", [{ categories: [/WALL/] }]);
  registerQuery("Slabs, Seating & Decks", [{ categories: [/SLAB/] }]);
  registerQuery("Foundations & Footings", [{ categories: [/FOOTING|PILE/] }]);
  registerQuery("Structural Columns & Beams", [{ categories: [/COLUMN|BEAM|MEMBER/] }]);
  registerQuery("Rebar & Ferraillage", [{ categories: [/REINFORCING|TENDON|MESH/] }]);
  registerQuery("Doors & Glazing Openings", [{ categories: [/DOOR|WINDOW|CURTAINWALL/] }]);
  registerQuery("Roofs, Stairs & Circulation", [{ categories: [/ROOF|STAIR|RAMP|RAILING/] }]);
  registerQuery("MEP & HVAC Systems", [{ categories: [/PIPE|DUCT|FLOW|CABLE|TERMINAL/] }]);
  registerQuery("Fixtures, Solar & Proxies", [{ categories: [/PROXY|FURNISHING/] }]);

  // Lesson 3.12 Relational Queries (Spatial Containment & Property Set Relations)
  registerQuery("Storeys With Building Elements", [
    {
      categories: [/STOREY/],
      relation: {
        name: "ContainsElements",
        query: {
          categories: [/WALL|SLAB|COLUMN|BEAM|DOOR|WINDOW|PROXY/],
        },
      },
    },
  ]);

  registerQuery("Items With Property Sets (IsDefinedBy)", [
    {
      categories: [/WALL|SLAB|COLUMN|BEAM|DOOR|WINDOW|PROXY/],
      relation: {
        name: "IsDefinedBy",
        query: {
          categories: [/PROPERTYSET|ELEMENTQUANTITY/],
        },
      },
    },
  ]);

  registerQuery("External Building Envelope", [
    {
      categories: [/WALL|SLAB|CURTAINWALL/],
      relation: {
        name: "IsDefinedBy",
        query: {
          attributes: {
            queries: [{ name: /^IsExternal$/i, value: true }],
          },
        },
      },
    },
  ]);

  // Reset cached query outputs whenever models are loaded or disposed
  if (fragments.initialized) {
    fragments.list.onItemSet.add(() => {
      for (const [, finderQuery] of finder.list) {
        finderQuery.clearCache();
      }
    });

    fragments.list.onItemDeleted.add(() => {
      for (const [, finderQuery] of finder.list) {
        finderQuery.clearCache();
      }
    });
  }

  return finder;
};

