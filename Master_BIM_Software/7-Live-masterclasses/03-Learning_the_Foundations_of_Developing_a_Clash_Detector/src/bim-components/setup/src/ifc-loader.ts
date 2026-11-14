import * as OBC from "@thatopen/components";

/**
 * Module 4 — Lesson 3.4: Loading BIM Models (Fragments)
 * Configures the OBC.IfcLoader component with WebIFC WASM settings.
 */
export const setupIfcLoader = async (components: OBC.Components) => {
  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({ autoSetWasm: false });
  ifcLoader.settings.wasm = {
    path: "/",
    absolute: true,
  };
  return ifcLoader;
};

