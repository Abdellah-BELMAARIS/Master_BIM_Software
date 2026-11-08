import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { Project } from "../../../classes/Project";
import { buildTowerEnvironment, ITowerEnvironment } from "../../../react-components/three/TowerEnvironment";
import { buildLuxuryVillaEnvironment, IVillaEnvironment } from "../../../react-components/three/VillaEnvironment";
import { buildCarShowroomEnvironment, ICarEnvironment } from "../../../react-components/three/CarEnvironment";
import { buildBridgeEnvironment, IBridgeEnvironment } from "../../../react-components/three/BridgeEnvironment";
import { buildGearEnvironment, IGearEnvironment } from "../../../react-components/three/GearEnvironment";
import { buildCubeEnvironment, ICubeEnvironment } from "../../../react-components/three/CubeEnvironment";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

export interface LoadedWorldModel {
  group: THREE.Group;
  update?: (delta: number) => void;
  dispose: () => void;
}

/**
 * Maps project metadata to its exact That Open Company IFC file name,
 * IFC STEP schema version, and corresponding architectural/engineering digital twin type.
 */
export function getProjectIfcFile(project: { name: string; ifcFileName?: string; modelCategory?: string }): {
  fileName: string;
  schema: "IFC4" | "IFC2X3";
  twinType: "tower" | "villa" | "bridge";
} | null {
  const name = (project.name || "").toLowerCase();
  const file = (project.ifcFileName || "").toLowerCase();

  // 1. That Open Company - Structural Complex (IFC4)
  if (file.includes("est-001") || name.includes("structural complex") || name.includes("toc master") || name.includes("mbsd-toc")) {
    return { fileName: "MBSD-TOC-P01-MOD-EST-001.ifc", schema: "IFC4", twinType: "tower" };
  }
  // 2. HNS Central Pavilion - Architectural Model (IFC2X3)
  if (file.includes("arq") || name.includes("architectural") || name.includes("hns-ctl-n01")) {
    return { fileName: "HNS-CTL-N01-MOD-ARQ.ifc", schema: "IFC2X3", twinType: "villa" };
  }
  // 3. HNS Central Pavilion - Structural Superstructure (IFC2X3)
  if (file.includes("superstructure") || file.includes("ctl-zzz") || name.includes("superstructure") || name.includes("hns-ctl-zzz")) {
    return { fileName: "HNS-CTL-ZZZ-MOD-EST.ifc", schema: "IFC2X3", twinType: "tower" };
  }
  // 4. ProVI Infrastructure - Viaduct Alignment Span E01 (IFC4)
  if (file.includes("e01") || name.includes("span e01") || (name.includes("provi") && name.includes("e01"))) {
    return { fileName: "NAV-IPI-ET1_E01-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }
  // 5. ProVI Infrastructure - Viaduct Box Girder Span E02 (IFC4)
  if (file.includes("e02") || name.includes("span e02") || (name.includes("provi") && name.includes("e02"))) {
    return { fileName: "NAV-IPI-ET1_E02-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }
  // 6. ProVI Infrastructure - Viaduct Pier & Foundation E03 (IFC4)
  if (file.includes("e03") || name.includes("pier") || (name.includes("provi") && name.includes("e03"))) {
    return { fileName: "NAV-IPI-ET1_E03-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }
  // 7. ProVI Infrastructure - Viaduct Abutment & Retaining Wall E07 (IFC4)
  if (file.includes("e07") || name.includes("abutment") || (name.includes("provi") && name.includes("e07"))) {
    return { fileName: "NAV-IPI-ET1_E07-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }
  if (project.ifcFileName) {
    return { fileName: project.ifcFileName, schema: "IFC4", twinType: "tower" };
  }
  return null;
}

/**
 * Loads and mounts the active project's 3D Digital Twin or OpenBIM IFC model
 * directly inside That Open Engine's SimpleScene (world.scene.three).
 *
 * Ensures each BIM World has its dedicated, fully furnished 3D model
 * instead of an empty CAD grid.
 */
export async function loadProjectModel(
  components: OBC.Components,
  world: OBC.World,
  project: Project
): Promise<LoadedWorldModel> {
  const modelGroup = new THREE.Group();
  modelGroup.name = `bim-model-${project.id}`;
  world.scene.three.add(modelGroup);

  const disposables: (() => void)[] = [];
  let updateCallback: ((delta: number) => void) | undefined;

  // Determine model type
  const lowerName = project.name.toLowerCase();
  let type = project.modelType;
  if (!type || type === "cube") {
    if (lowerName.includes("tower") || lowerName.includes("skyscraper") || lowerName.includes("apex")) type = "tower";
    else if (lowerName.includes("bridge") || lowerName.includes("span") || lowerName.includes("viaduct") || lowerName.includes("nordic")) type = "bridge";
    else if (lowerName.includes("villa") || lowerName.includes("residence") || lowerName.includes("azure")) type = "villa";
    else if (lowerName.includes("car") || lowerName.includes("coupe") || lowerName.includes("vehic")) type = "car";
    else if (lowerName.includes("gear") || lowerName.includes("hvac") || lowerName.includes("dyno")) type = "gear";
  }

  const cameraControls = (world.camera as any).controls;

  // =========================================================================
  // 1. IFC OPENBIM MODELS (LOAD VIA THAT OPEN ENGINE IFC LOADER)
  // =========================================================================
  const ifcMeta = getProjectIfcFile(project);
  if (ifcMeta || project.ifcFileName || project.modelCategory === "ifc") {
    const ifcFile = ifcMeta ? ifcMeta.fileName : (project.ifcFileName || "MBSD-TOC-P01-MOD-EST-001.ifc");
    let didFit = false;
    try {
      const fragments = components.get(OBC.FragmentsManager);
      if (!fragments.initialized) {
        await fragments.init();
      }
      const ifcLoader = components.get(OBC.IfcLoader);
      await ifcLoader.setup({ autoSetWasm: false });
      ifcLoader.settings.wasm = { path: "/", absolute: true };

      const response = await fetch(`/models/ifc/${ifcFile}`);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        const ifcModel = await ifcLoader.load(data, true, project.name);
        const ifcObj = (ifcModel as any)?.object || (ifcModel as any)?.root || (ifcModel as any)?.mesh || ifcModel;
        if (ifcObj && ifcObj instanceof THREE.Object3D) {
          modelGroup.add(ifcObj);
          if ((world as any).meshes) {
            (world as any).meshes.add(ifcObj);
          }
          if (cameraControls) {
            const bbox = new THREE.Box3().setFromObject(ifcObj);
            if (!bbox.isEmpty()) {
              cameraControls.fitToBox(bbox, true, { paddingLeft: 1.2, paddingRight: 1.2, paddingTop: 1.2, paddingBottom: 1.2 });
              didFit = true;
            }
          }
        }
      }
    } catch (ifcErr) {
      console.warn(`[That Open Engine] Direct IFC parsing deferred for ${ifcFile}, falling back to structural digital twin:`, ifcErr);
      const twin = ifcMeta ? ifcMeta.twinType : "tower";
      if (twin === "tower") {
        const fallback = buildTowerEnvironment();
        modelGroup.add(fallback.group);
        disposables.push(fallback.dispose);
        updateCallback = (delta: number) => fallback.updateTraffic(delta);
      } else if (twin === "villa") {
        const fallback = buildLuxuryVillaEnvironment();
        modelGroup.add(fallback.group);
        disposables.push(fallback.dispose);
        updateCallback = (delta: number) => fallback.updateWater(delta);
      } else {
        const fallback = buildBridgeEnvironment();
        modelGroup.add(fallback.group);
        disposables.push(fallback.dispose);
        updateCallback = (delta: number) => fallback.updateBridge(delta);
      }
    }

    if (cameraControls && !didFit) {
      cameraControls.setLookAt(24, 16, 26, 0, 6, 0, false);
    }
  }
  // =========================================================================
  // 2. 3D PARAMETRIC DIGITAL TWINS
  // =========================================================================
  else if (type === "tower") {
    const towerEnv: ITowerEnvironment = buildTowerEnvironment();
    modelGroup.add(towerEnv.group);
    disposables.push(towerEnv.dispose);
    updateCallback = (delta: number) => {
      towerEnv.updateTraffic(delta);
    };
    if (cameraControls) {
      cameraControls.setLookAt(22, 16, 26, 0, 10, 0, false);
    }
  } else if (type === "villa") {
    const villaEnv: IVillaEnvironment = buildLuxuryVillaEnvironment();
    modelGroup.add(villaEnv.group);
    disposables.push(villaEnv.dispose);
    updateCallback = (delta: number) => {
      villaEnv.updateWater(delta);
    };
    if (cameraControls) {
      cameraControls.setLookAt(16, 10, 20, 0, 2.5, 0, false);
    }
  } else if (type === "bridge") {
    const bridgeEnv: IBridgeEnvironment = buildBridgeEnvironment();
    modelGroup.add(bridgeEnv.group);
    disposables.push(bridgeEnv.dispose);
    updateCallback = (delta: number) => {
      bridgeEnv.updateBridge(delta);
    };
    if (cameraControls) {
      cameraControls.setLookAt(28, 14, 30, 0, 4, 0, false);
    }
  } else if (type === "car") {
    const carEnv: ICarEnvironment = buildCarShowroomEnvironment();
    modelGroup.add(carEnv.group);
    disposables.push(carEnv.dispose);
    updateCallback = (delta: number) => {
      carEnv.updateTurntable(delta);
    };
    if (cameraControls) {
      cameraControls.setLookAt(8, 4.5, 9, 0, 1, 0, false);
    }
  } else if (type === "gear") {
    const gearEnv: IGearEnvironment = buildGearEnvironment();
    modelGroup.add(gearEnv.group);
    disposables.push(gearEnv.dispose);

    // Try loading realistic OBJ / MTL Gear mesh if available
    const mtlLoader = new MTLLoader();
    mtlLoader.load(
      "/assets/Gear/Gear1.mtl",
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
          "/assets/Gear/Gear1.obj",
          (mesh) => {
            mesh.scale.set(0.08, 0.08, 0.08);
            mesh.position.set(0, 2.8, 0);
            modelGroup.add(mesh);
          },
          undefined,
          (err) => console.warn("[That Open Engine] OBJ gear load deferred:", err)
        );
      },
      undefined,
      (err) => console.warn("[That Open Engine] MTL gear load deferred:", err)
    );

    updateCallback = (delta: number) => {
      gearEnv.updateGears(delta);
    };
    if (cameraControls) {
      cameraControls.setLookAt(12, 8, 14, 0, 2, 0, false);
    }
  } else {
    // Default BIM Modular Pavilion
    const cubeEnv: ICubeEnvironment = buildCubeEnvironment();
    modelGroup.add(cubeEnv.group);
    disposables.push(cubeEnv.dispose);
    if (cameraControls) {
      cameraControls.setLookAt(14, 10, 16, 0, 2, 0, false);
    }
  }

  return {
    group: modelGroup,
    update: updateCallback,
    dispose: () => {
      for (const d of disposables) {
        try {
          d();
        } catch {}
      }
      world.scene.three.remove(modelGroup);
    },
  };
}


/**
 * Loads an arbitrary IFC file from an ArrayBuffer (e.g. from local file upload)
 * directly into That Open Engine's SimpleScene.
 */
export async function loadIfcFromBuffer(
  components: OBC.Components,
  world: OBC.World,
  buffer: ArrayBuffer,
  fileName: string
): Promise<THREE.Object3D | null> {
  try {
    const fragments = components.get(OBC.FragmentsManager);
    if (!fragments.initialized) {
      await fragments.init();
    }
    const ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup({ autoSetWasm: false });
    ifcLoader.settings.wasm = { path: "/", absolute: true };

    const data = new Uint8Array(buffer);
    const ifcModel = await ifcLoader.load(data, true, fileName);
    const obj = (ifcModel as any)?.object || (ifcModel as any)?.root || (ifcModel as any)?.mesh || ifcModel;
    if (obj && obj instanceof THREE.Object3D) {
      world.scene.three.add(obj);
      if ((world as any).meshes) {
        (world as any).meshes.add(obj);
      }

      // Focus camera on loaded IFC model
      const cameraControls = (world.camera as any).controls;
      if (cameraControls) {
        const box = new THREE.Box3().setFromObject(obj);
        if (!box.isEmpty()) {
          cameraControls.fitToBox(box, true, { paddingLeft: 1.5, paddingRight: 1.5, paddingTop: 1.5, paddingBottom: 1.5 });
        }
      }
      return obj;
    }
  } catch (err) {
    console.error(`Failed to parse IFC file ${fileName}:`, err);
    throw err;
  }
  return null;
}
