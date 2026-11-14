import * as OBC from "@thatopen/components";
import { DataEnhancer, unwrapIfcAttr } from "../../DataEnhancer";

/**
 * Module 4 — Section 4 (Lessons 4.2 – 4.5): DataEnhancer Source Registry
 * Wires local JSON Technical Specifications, BIM Quality & Cost Matrix,
 * and live Cloud Firestore Field Inspection Logs.
 */
export const setupDataEnhancer = (
  components: OBC.Components,
  projectId?: string
) => {
  const enhancer = components.get(DataEnhancer);
  enhancer.projectId = projectId;

  // Source 1: Technical Specifications JSON Dataset matched by IFC Category
  enhancer.sources.set("Technical Specifications & Standards", {
    name: "Technical Specifications & Standards",
    description:
      "ISO 19650 / Eurocode technical datasheets, fire ratings, thermal U-values, and unit rates matched by IFC category.",
    data: async () => {
      const response = await fetch("/data/technical-specifications.json");
      if (!response.ok) return [];
      const rows = await response.json();
      return Array.isArray(rows) ? rows : [];
    },
    matcher: (attributes, data) => {
      const category = unwrapIfcAttr((attributes as any)._category).toUpperCase();
      if (!category) return [];
      const exact = data.filter(
        (row) => String(row.Category || "").toUpperCase() === category
      );
      if (exact.length > 0) return exact;
      if (category.startsWith("IFCWALL")) {
        return data.filter((row) => String(row.Category || "").toUpperCase() === "IFCWALL");
      }
      return [];
    },
  });

  // Source 2: BIM Quality & Cost Matrix (Discipline KPI & Verification Rules)
  enhancer.sources.set("BIM Quality & Cost Matrix", {
    name: "BIM Quality & Cost Matrix",
    description:
      "BIM coordination checklists, Uniclass / Uniformat cost packages, and inspection gates per element family.",
    data: async () => [
      {
        PackageId: "PKG-STR-01",
        Category: "IFCSLAB",
        Discipline: "Structural Engineering",
        Checklist: "Verify reinforcement cover, camber & opening penetrations",
        LOD: "LOD 350",
        InspectionGate: "Pour Readiness Review",
      },
      {
        PackageId: "PKG-STR-02",
        Category: "IFCCOLUMN|IFCBEAM|IFCFOOTING",
        Discipline: "Structural Framing",
        Checklist: "Check column grid alignment, steel splice torque & base plates",
        LOD: "LOD 350",
        InspectionGate: "Primary Frame Sign-Off",
      },
      {
        PackageId: "PKG-ARC-01",
        Category: "IFCWALL|IFCWALLSTANDARDCASE",
        Discipline: "Architecture & Envelope",
        Checklist: "Validate fire compartmentation rating & acoustic seal continuity",
        LOD: "LOD 300",
        InspectionGate: "Envelope Weather-Tight",
      },
      {
        PackageId: "PKG-ARC-02",
        Category: "IFCDOOR|IFCWINDOW",
        Discipline: "Openings & Facades",
        Checklist: "Confirm clear egress width, hardware schedule & solar SHGC",
        LOD: "LOD 350",
        InspectionGate: "Glazing Commissioning",
      },
      {
        PackageId: "PKG-MEP-01",
        Category: "IFCBUILDINGELEMENTPROXY",
        Discipline: "Specialty Equipment & FF&E",
        Checklist: "Audit fixture coordinates, MEP rough-in clearance & asset tags",
        LOD: "LOD 300",
        InspectionGate: "Site Handover COBie",
      },
    ],
    matcher: (attributes, data) => {
      const category = unwrapIfcAttr((attributes as any)._category).toUpperCase();
      if (!category) return [];
      return data.filter((row) => {
        const patterns = String(row.Category || "").toUpperCase().split("|");
        return patterns.some((pat) => category === pat.trim());
      });
    },
  });

  // Source 3: Cloud Firestore Field Logs & Custom Element Parameters (Lesson 4.5)
  enhancer.sources.set("Cloud Field Logs & Inspections", {
    name: "Cloud Field Logs & Inspections",
    description:
      "Project-specific custom parameters, RFI notes, and site QA records synchronized with Cloud Firestore.",
    data: async () => {
      const records = await enhancer.loadProjectData(enhancer.projectId);
      return records.map((rec) => ({
        Property: rec.propertyName,
        Value: rec.propertyValue,
        Element: rec.elementName || `#${rec.expressId}`,
        Category: rec.category || "IFC Element",
        Discipline: rec.discipline || "Specification",
        Author: rec.author || "Abdellah B.",
        GUID: rec.guid || "",
        _modelId: rec.modelId,
        _expressId: rec.expressId,
      }));
    },
    matcher: (attributes, data) => {
      const localId = Number(unwrapIfcAttr((attributes as any)._localId));
      const guid = unwrapIfcAttr((attributes as any)._guid);
      return data.filter(
        (row) =>
          (guid && row.GUID && row.GUID === guid) ||
          (Number.isFinite(localId) && Number(row._expressId) === localId)
      );
    },
  });

  return enhancer;
};

