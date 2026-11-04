/**
 * Snippet 06: MCP Server Blueprint for BIM / IFC Model Inspection & Edits (Modules 5 & 6)
 * Covers Module 5 (Section 4: Building an MCP-LLM Framework) & Module 6 (AI for BIM Developers):
 * - Exposing BIM element queries, colorization, and Fragments Edit API commands as MCP tools
 */

export interface BimMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const BIM_MCP_TOOLS: BimMcpToolDefinition[] = [
  {
    name: "query_bim_elements_by_category",
    description:
      "Find BIM elements in the loaded Fragment model by IFC category (e.g., IFCWALL, IFCSLAB, IFCWINDOW) and optional property filter.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "IFC entity class, e.g. IFCWALL" },
        propertyName: { type: "string", description: "Optional Pset property name" },
        propertyValue: { type: "string", description: "Optional value substring to match" },
      },
      required: ["category"],
    },
  },
  {
    name: "highlight_and_colorize_elements",
    description:
      "Colorize and isolate specific BIM expressIDs in the 3D viewer using That Open Engine Highlighter/Colorizer.",
    inputSchema: {
      type: "object",
      properties: {
        expressIds: { type: "array", items: { type: "number" } },
        hexColor: { type: "string", description: "Hex color code, e.g. #029ae0" },
        focusCamera: { type: "boolean", default: true },
      },
      required: ["expressIds", "hexColor"],
    },
  },
  {
    name: "edit_fragment_element_metadata",
    description:
      "Update element properties or materials using the That Open Fragments Edits API (Module 6).",
    inputSchema: {
      type: "object",
      properties: {
        expressId: { type: "number" },
        attributes: { type: "object" },
        materialHex: { type: "string" },
      },
      required: ["expressId"],
    },
  },
];
