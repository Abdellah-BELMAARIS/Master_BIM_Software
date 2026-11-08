import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export interface LoadButtonState {
  components: OBC.Components;
}

/**
 * Module 4 — Lesson 3.7: Exporting and importing Fragment models
 * Stateful UI button template featuring a nested <bim-context-menu> supporting both:
 * 1. Loading raw IFC models (.ifc) via OBC.IfcLoader
 * 2. Loading pre-compiled That Open Fragments binary models (.frag) via OBC.FragmentsManager
 */
export const loadButtonTemplate: BUI.StatefullComponent<LoadButtonState> = (
  state: LoadButtonState
) => {
  const { components } = state;

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
      const bytes = new Uint8Array(buffer);

      const ifcLoader = components.get(OBC.IfcLoader);
      await ifcLoader.load(bytes);
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

      const fragments = components.get(OBC.FragmentsManager);
      if (typeof (fragments as any).load === "function") {
        await (fragments as any).load(bytes);
      } else if (fragments.core) {
        const modelId = file.name.replace(".frag", "");
        const model = await fragments.core.load(bytes, { modelId });
        const worlds = components.get(OBC.Worlds);
        const world = [...worlds.list.values()][0];
        if (world && model) {
          if (model.object) world.scene.three.add(model.object);
          if (typeof model.useCamera === "function" && world.camera?.three) {
            model.useCamera(world.camera.three);
          }
          fragments.core.update(true);
        }
      }
    } catch (error) {
      console.error("[ThatOpen] Error loading Fragments file:", error);
    } finally {
      fragInput.value = "";
    }
  });

  const onLoadIfc = () => {
    ifcInput.click();
  };

  const onLoadFrag = () => {
    fragInput.click();
  };

  return BUI.html`
    <bim-button
      icon="flowbite:upload-outline"
      label="Load"
      tooltip="Import IFC or Fragment binary model"
    >
      <bim-context-menu>
        <bim-button
          @click=${onLoadIfc}
          label="IFC"
          icon="solar:document-bold"
          tooltip="Import and convert raw STEP IFC model"
        ></bim-button>
        <bim-button
          @click=${onLoadFrag}
          label="Fragments"
          icon="solar:box-bold"
          tooltip="Import pre-compiled FlatBuffers binary Fragment model"
        ></bim-button>
      </bim-context-menu>
    </bim-button>
  `;
};


