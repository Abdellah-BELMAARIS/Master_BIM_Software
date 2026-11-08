import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { normalizeIfcUnitsBytes } from "../../bim-components/setup/src/load-project-model";

export interface LoadButtonState {
  components: OBC.Components;
}

/**
 * Module 4 — Lesson 3.7: Exporting and importing Fragment models
 * Stateful UI button template featuring a nested <bim-context-menu> supporting both:
 * 1. Loading raw IFC models (.ifc) via OBC.IfcLoader (with auto-normalized STEP SI units)
 * 2. Loading pre-compiled That Open Fragments binary models (.frag) via OBC.FragmentsManager
 */
export const loadButtonTemplate: BUI.StatefullComponent<LoadButtonState> = (
  state: LoadButtonState
) => {
  const { components } = state;

  const fitCamera = async () => {
    try {
      const worlds = components.get(OBC.Worlds);
      const world = [...worlds.list.values()][0];
      if (world?.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems();
      }
    } catch {}
  };

  // 1. Native File Picker for .ifc files
  const ifcInput = document.createElement("input");
  ifcInput.type = "file";
  ifcInput.accept = ".ifc";
  ifcInput.style.display = "none";

  ifcInput.addEventListener("change", async () => {
    const file = ifcInput.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const normalized = normalizeIfcUnitsBytes(new Uint8Array(buffer));
      const modelId = file.name.replace(/\.ifc$/i, "");

      const ifcLoader = components.get(OBC.IfcLoader);
      await ifcLoader.setup({ autoSetWasm: false });
      ifcLoader.settings.wasm = { path: "/", absolute: true };
      await ifcLoader.load(normalized, true, modelId);
      await fitCamera();
    } catch (error) {
      console.error("[ThatOpen] Error loading IFC file:", error);
    } finally {
      ifcInput.value = "";
    }
  });

  // 2. Native File Picker for .frag files
  const fragInput = document.createElement("input");
  fragInput.type = "file";
  fragInput.accept = ".frag";
  fragInput.style.display = "none";

  fragInput.addEventListener("change", async () => {
    const file = fragInput.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const modelId = file.name.replace(/\.frag$/i, "");

      const fragments = components.get(OBC.FragmentsManager);
      const worlds = components.get(OBC.Worlds);
      const world = [...worlds.list.values()][0];

      const rawCam = world?.camera?.three;
      const fragCam =
        rawCam instanceof THREE.PerspectiveCamera || rawCam instanceof THREE.OrthographicCamera
          ? rawCam
          : undefined;

      await fragments.core.load(bytes, {
        modelId,
        camera: fragCam,
      });
      fragments.core.update(true);
      await fitCamera();
    } catch (error) {
      console.error("[ThatOpen] Error loading Fragments file:", error);
    } finally {
      fragInput.value = "";
    }
  });

  return BUI.html`
    <bim-button
      icon="flowbite:upload-outline"
      label="Load"
      tooltip="Import IFC or Fragment binary model"
    >
      <bim-context-menu>
        <bim-button
          @click=${() => ifcInput.click()}
          label="IFC"
          icon="solar:document-bold"
          tooltip="Import and convert raw STEP IFC model"
        ></bim-button>
        <bim-button
          @click=${() => fragInput.click()}
          label="Fragments"
          icon="solar:box-bold"
          tooltip="Import pre-compiled FlatBuffers binary Fragment model"
        ></bim-button>
      </bim-context-menu>
    </bim-button>
  `;
};
