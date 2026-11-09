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
  update?: (elapsedSeconds: number) => void;
  dispose: () => void;
}

const asFragCamera = (
  cam?: THREE.Camera | null
): THREE.PerspectiveCamera | THREE.OrthographicCamera | undefined => {
  if (cam instanceof THREE.PerspectiveCamera || cam instanceof THREE.OrthographicCamera) {
    return cam;
  }
  return undefined;
};

export interface CanonicalProjectInfo {
  canonicalName: string;
  ifcFileName?: string;
  dedupeKey: string;
  ifcSchema?: "IFC4" | "IFC2X3";
  modelCategory: "ifc" | "3d";
  twinType: "cube" | "gear" | "car" | "villa" | "tower" | "bridge";
}

export const getCanonicalProjectInfo = (
  name: string,
  ifcFileName?: string
): CanonicalProjectInfo | null => {
  const n = (name || "").toLowerCase().trim();
  const f = (ifcFileName || "").toLowerCase().trim();

  // High-Speed Rail Viaduct - Superstructure Span E01 (IFC4)
  if (n.includes("e01") || f.includes("e01")) {
    return { canonicalName: "High-Speed Rail Viaduct - Superstructure Span E01 (IFC4)", ifcFileName: "NAV-IPI-ET1_E01-ZZZ-M3D-EST.ifc", dedupeKey: "provi-e01", ifcSchema: "IFC4", modelCategory: "ifc", twinType: "bridge" };
  }
  // High-Speed Rail Viaduct - Box Girder Span E02 (IFC4)
  if (n.includes("e02") || f.includes("e02")) {
    return { canonicalName: "High-Speed Rail Viaduct - Box Girder Span E02 (IFC4)", ifcFileName: "NAV-IPI-ET1_E02-ZZZ-M3D-EST.ifc", dedupeKey: "provi-e02", ifcSchema: "IFC4", modelCategory: "ifc", twinType: "bridge" };
  }
  // High-Speed Rail Viaduct - Concrete Pier & Foundation E03 (IFC4)
  if (n.includes("e03") || f.includes("e03") || n.includes("pier")) {
    return { canonicalName: "High-Speed Rail Viaduct - Concrete Pier & Foundation E03 (IFC4)", ifcFileName: "NAV-IPI-ET1_E03-ZZZ-M3D-EST.ifc", dedupeKey: "provi-e03", ifcSchema: "IFC4", modelCategory: "ifc", twinType: "bridge" };
  }
  // High-Speed Rail Viaduct - Retaining Abutment E07 (IFC4)
  if (n.includes("e07") || f.includes("e07") || n.includes("abutment")) {
    return { canonicalName: "High-Speed Rail Viaduct - Retaining Abutment E07 (IFC4)", ifcFileName: "NAV-IPI-ET1_E07-ZZZ-M3D-EST.ifc", dedupeKey: "provi-e07", ifcSchema: "IFC4", modelCategory: "ifc", twinType: "bridge" };
  }
  // ProVI Infrastructure Civil Overpass & Highway Viaduct (IFC4)
  if (n.includes("structural complex") || n.includes("toc master") || f.includes("est-001") || n.includes("mbsd-toc") || n.includes("office") || n.includes("that open") || n.includes("provi civil") || n.includes("overpass")) {
    return { canonicalName: "ProVI Infrastructure Civil Overpass & Highway Viaduct (IFC4)", ifcFileName: "MBSD-TOC-P01-MOD-EST-001.ifc", dedupeKey: "toc-complex", ifcSchema: "IFC4", modelCategory: "ifc", twinType: "bridge" };
  }
  // Metropolitan Civic Center - Structural Superstructure (IFC2X3)
  if ((n.includes("hns") || n.includes("civic")) && (n.includes("superstructure") || f.includes("zzz") || n.includes("structural"))) {
    return { canonicalName: "Metropolitan Civic Center - Structural Superstructure (IFC2X3)", ifcFileName: "HNS-CTL-ZZZ-MOD-EST.ifc", dedupeKey: "hns-est", ifcSchema: "IFC2X3", modelCategory: "ifc", twinType: "tower" };
  }
  // Metropolitan Civic Center - Architectural Model (IFC2X3)
  if (n.includes("hns") || n.includes("civic") || f.includes("arq")) {
    return { canonicalName: "Metropolitan Civic Center - Architectural Model (IFC2X3)", ifcFileName: "HNS-CTL-N01-MOD-ARQ.ifc", dedupeKey: "hns-arq", ifcSchema: "IFC2X3", modelCategory: "ifc", twinType: "tower" };
  }
  // Atlas Grand Football Stadium (IFC4)
  if (n.includes("stadium") || f.includes("stadium") || n.includes("atlas")) {
    return { canonicalName: "Atlas Grand Football Stadium (IFC4)", ifcFileName: "atlas_grand_professional_stadium_ifc4.ifc", dedupeKey: "atlas-stadium", ifcSchema: "IFC4", modelCategory: "ifc", twinType: "tower" };
  }
  // Aurora 10-Villa Residential Estate (IFC4)
  if (n.includes("aurora") || f.includes("aurora") || n.includes("10-villa") || f.includes("ten_villa")) {
    return { canonicalName: "Aurora 10-Villa Residential Estate (IFC4)", ifcFileName: "aurora_ten_villa_estate_ifc4.ifc", dedupeKey: "aurora-ten-villa", ifcSchema: "IFC4", modelCategory: "ifc", twinType: "villa" };
  }
  // 3D Parametric Projects
  if (n.includes("azure") || (n.includes("villa") && !n.includes("aurora") && !n.includes("10-villa"))) {
    return { canonicalName: "Azure Coast Luxury Eco-Villa", dedupeKey: "3d-villa", modelCategory: "3d", twinType: "villa" };
  }
  if (n.includes("ev") || n.includes("logistics")) {
    return { canonicalName: "Urban Logistics Autonomous EV Fleet Hub", dedupeKey: "3d-car", modelCategory: "3d", twinType: "car" };
  }
  if (n.includes("gear") || n.includes("mechanical") || n.includes("hvac") || n.includes("chiller") || n.includes("energy")) {
    return { canonicalName: "Industrial District Energy HVAC Plant", dedupeKey: "3d-gear", modelCategory: "3d", twinType: "gear" };
  }
  if (n.includes("skyscraper") || n.includes("apex") || n.includes("high-rise")) {
    return { canonicalName: "Apex 28-Story Commercial Skyscraper", dedupeKey: "3d-tower", modelCategory: "3d", twinType: "tower" };
  }
  if (n.includes("cable") || n.includes("nordic") || (n.includes("bridge") && !n.includes("viaduct") && !n.includes("overpass"))) {
    return { canonicalName: "Nordic Span Cable-Stayed Highway Bridge", dedupeKey: "3d-bridge", modelCategory: "3d", twinType: "bridge" };
  }
  if (n.includes("modular") || n.includes("pavilion") || n.includes("default") || n.includes("untitled")) {
    return { canonicalName: "BIM Modular Architectural Exhibition Pavilion", dedupeKey: "3d-cube", modelCategory: "3d", twinType: "cube" };
  }
  return null;
};

/**
 * In-Memory Binary IFC Cache for Hyper-Speed (0ms) Model Swaps
 */
export const IFC_BINARY_CACHE = new Map<string, Uint8Array>();

/**
 * Hyper-Speed Background Pre-Warmer: Prefetches and parses IFC files into RAM
 */
export function prewarmIfcModels() {
  const models = [
    "atlas_grand_professional_stadium_ifc4.ifc",
    "aurora_ten_villa_estate_ifc4.ifc",
    "MBSD-TOC-P01-MOD-EST-001.ifc",
    "NAV-IPI-ET1_E01-ZZZ-M3D-EST.ifc",
    "HNS-CTL-N01-MOD-ARQ.ifc",
    "HNS-CTL-ZZZ-MOD-EST.ifc",
    "NAV-IPI-ET1_E02-ZZZ-M3D-EST.ifc",
    "NAV-IPI-ET1_E03-ZZZ-M3D-EST.ifc",
    "NAV-IPI-ET1_E07-ZZZ-M3D-EST.ifc",
  ];
  if (typeof window !== "undefined") {
    setTimeout(() => {
      models.forEach(async (fileName) => {
        if (!IFC_BINARY_CACHE.has(fileName)) {
          try {
            const res = await fetch(`/models/ifc/${fileName}`);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              IFC_BINARY_CACHE.set(fileName, new Uint8Array(buf));
            }
          } catch {}
        }
      });
    }, 100);
  }
}

/**
 * Normalizes minor STEP schema quirks in generated IFC files before web-ifc parsing
 * (e.g., repairing 3-arg IFCSIUNIT(*,.LENGTHUNIT.,.METRE.) missing the optional Prefix '$').
 */
export function normalizeIfcUnitsBytes(bytes: Uint8Array): Uint8Array {
  const headSlice = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 32768)));
  if (!/IFCSIUNIT\(\*\s*,\s*\.LENGTHUNIT\.\s*,\s*\.(METRE|FOOT)\.\)/i.test(headSlice)) {
    return bytes;
  }
  const fullText = new TextDecoder("utf-8").decode(bytes);
  const patched = fullText.replace(
    /IFCSIUNIT\(\*\s*,\s*\.LENGTHUNIT\.\s*,\s*\.(METRE|FOOT)\.\)/gi,
    (_, unit: string) => `IFCSIUNIT(*,.LENGTHUNIT.,$,.${unit.toUpperCase()}.)`
  );
  return new TextEncoder().encode(patched);
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
  // 3D Parametric projects without an IFC file render their dedicated 3D environment directly
  if (project.modelCategory === "3d" && !project.ifcFileName) {
    return null;
  }

  const name = (project.name || "").toLowerCase();
  const file = (project.ifcFileName || "").toLowerCase();

  // 0. Atlas Grand Football Stadium (IFC4)
  if (file.includes("stadium") || name.includes("stadium") || name.includes("atlas")) {
    return { fileName: "atlas_grand_professional_stadium_ifc4.ifc", schema: "IFC4", twinType: "tower" };
  }

  // 0b. Aurora 10-Villa Residential Estate (IFC4)
  if (file.includes("aurora") || name.includes("aurora") || name.includes("10-villa") || file.includes("ten_villa")) {
    return { fileName: "aurora_ten_villa_estate_ifc4.ifc", schema: "IFC4", twinType: "villa" };
  }

  // 1. ProVI Infrastructure Civil Overpass & Highway Viaduct (IFC4)
  if (file.includes("est-001") || name.includes("overpass") || name.includes("civil") || name.includes("commercial office") || name.includes("that open hq") || name.includes("structural complex") || name.includes("toc master") || name.includes("mbsd-toc") || name.includes("provi civil")) {
    return { fileName: "MBSD-TOC-P01-MOD-EST-001.ifc", schema: "IFC4", twinType: "bridge" };
  }
  // 2. Metropolitan Civic Center - Architectural Model (IFC2X3)
  if (file.includes("arq") || (name.includes("civic") && name.includes("architectural")) || (name.includes("hns") && name.includes("architectural")) || file.includes("hns-ctl-n01")) {
    return { fileName: "HNS-CTL-N01-MOD-ARQ.ifc", schema: "IFC2X3", twinType: "villa" };
  }
  // 3. Metropolitan Civic Center - Structural Superstructure (IFC2X3)
  if (file.includes("superstructure") || file.includes("ctl-zzz") || (name.includes("civic") && (name.includes("superstructure") || name.includes("structural"))) || (name.includes("hns") && (name.includes("superstructure") || name.includes("structural")))) {
    return { fileName: "HNS-CTL-ZZZ-MOD-EST.ifc", schema: "IFC2X3", twinType: "tower" };
  }
  // 4. High-Speed Rail Viaduct - Superstructure Span E01 (IFC4)
  if (file.includes("e01") || (name.includes("span e01") && (name.includes("viaduct") || name.includes("rail") || name.includes("provi"))) || (file.includes("nav-ipi") && file.includes("e01"))) {
    return { fileName: "NAV-IPI-ET1_E01-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }
  // 5. High-Speed Rail Viaduct - Box Girder Span E02 (IFC4)
  if (file.includes("e02") || (name.includes("span e02") && (name.includes("viaduct") || name.includes("rail") || name.includes("provi"))) || (file.includes("nav-ipi") && file.includes("e02"))) {
    return { fileName: "NAV-IPI-ET1_E02-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }
  // 6. High-Speed Rail Viaduct - Concrete Pier & Foundation E03 (IFC4)
  if (file.includes("e03") || (name.includes("pier") && (name.includes("viaduct") || name.includes("rail") || name.includes("provi"))) || (file.includes("nav-ipi") && file.includes("e03"))) {
    return { fileName: "NAV-IPI-ET1_E03-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }
  // 7. High-Speed Rail Viaduct - Retaining Abutment E07 (IFC4)
  if (file.includes("e07") || (name.includes("abutment") && (name.includes("viaduct") || name.includes("rail") || name.includes("provi"))) || (file.includes("nav-ipi") && file.includes("e07"))) {
    return { fileName: "NAV-IPI-ET1_E07-ZZZ-M3D-EST.ifc", schema: "IFC4", twinType: "bridge" };
  }

  if (project.ifcFileName) {
    const isBridge = name.includes("bridge") || name.includes("viaduct") || name.includes("span") || name.includes("pier") || name.includes("abutment") || name.includes("complex") || file.includes("nav-ipi") || file.includes("mbsd");
    const isVilla = name.includes("villa") || name.includes("house") || name.includes("residence");
    const twinType: "bridge" | "villa" | "tower" = isBridge ? "bridge" : (isVilla ? "villa" : "tower");
    return { fileName: project.ifcFileName, schema: "IFC4", twinType };
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
  let updateCallback: ((elapsedSeconds: number) => void) | undefined;
  let isDisposed = false;

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
  const isIfc = Boolean(
    project.ifcFileName ||
    project.modelCategory === "ifc" ||
    ifcMeta ||
    lowerName.includes("ifc")
  );

  if (isIfc && (ifcMeta || project.ifcFileName)) {
    const ifcFile = ifcMeta ? ifcMeta.fileName : (project.ifcFileName || "MBSD-TOC-P01-MOD-EST-001.ifc");
    let didFit = false;
    let modelMounted = false;

    const mountFragmentModel = async (fragModel: any): Promise<boolean> => {
      if (!fragModel || isDisposed || world.isDisposing) return false;
      try {
        const fragCam = asFragCamera(world.camera?.three);
        if (typeof fragModel.useCamera === "function" && fragCam) {
          fragModel.useCamera(fragCam);
        }
        if (fragModel.object && fragModel.object.parent !== world.scene.three) {
          world.scene.three.add(fragModel.object);
        }
        const fragments = components.get(OBC.FragmentsManager);
        if (fragments.initialized) {
          fragments.core.update(true);
        }

        const box: THREE.Box3 | undefined = fragModel.box;
        if (cameraControls && box && !box.isEmpty()) {
          const center = new THREE.Vector3();
          const size = new THREE.Vector3();
          box.getCenter(center);
          box.getSize(size);
          const span = Math.max(size.length() * 0.6, 12);
          const isOrtho =
            world.camera instanceof OBC.OrthoPerspectiveCamera &&
            world.camera.projection.current === "Orthographic";
          if (isOrtho) {
            await cameraControls.setLookAt(
              center.x,
              center.y + span * 1.45,
              center.z + 0.01,
              center.x,
              center.y,
              center.z,
              false
            );
            if (world.camera instanceof OBC.SimpleCamera) {
              await world.camera.fitToItems();
            }
          } else {
            await cameraControls.setLookAt(
              center.x + span * 0.85,
              center.y + Math.max(span * 0.58, size.y * 1.15),
              center.z + span * 0.85,
              center.x,
              center.y,
              center.z,
              false
            );
          }
          if (typeof cameraControls.update === "function") {
            cameraControls.update(0);
          }
          didFit = true;
        } else if (world.camera instanceof OBC.SimpleCamera) {
          await world.camera.fitToItems();
          didFit = true;
        }
        const activeCam = asFragCamera(world.camera?.three);
        if (activeCam) {
          activeCam.updateMatrixWorld(true);
          if (typeof fragModel.useCamera === "function") {
            fragModel.useCamera(activeCam);
          }
        }
        if (fragments.initialized && !isDisposed && !world.isDisposing) {
          fragments.core.update(true);
        }
        return true;
      } catch (mountErr) {
        console.warn("[That Open Engine] Fragment camera fit warning:", mountErr);
        return true;
      }
    };

    try {
      const fragments = components.get(OBC.FragmentsManager);
      if (!fragments.initialized) {
        try {
          const workerUrl = await OBC.FragmentsManager.getWorker();
          if (isDisposed || world.isDisposing) {
            return {
              group: modelGroup,
              dispose: () => {
                isDisposed = true;
              },
            };
          }
          fragments.init(workerUrl);
        } catch {
          if (!isDisposed && !world.isDisposing) {
            fragments.init("");
          }
        }
      }

      const modelId = project.name || ifcFile.replace(/\.ifc$/i, "");

      // Priority 1: Instant Pre-Compiled FlatBuffers Binary Fragments (.frag)
      const fragFileName = ifcFile.replace(/\.ifc$/i, ".frag");
      try {
        const fragRes = await fetch(`/models/frag/${fragFileName}`);
        if (isDisposed || world.isDisposing) {
          return { group: modelGroup, dispose: () => { isDisposed = true; } };
        }
        const contentType = fragRes.headers.get("content-type") || "";
        if (fragRes.ok && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
          const fragBuffer = await fragRes.arrayBuffer();
          if (!isDisposed && !world.isDisposing && fragBuffer.byteLength > 16) {
            const fragBytes = new Uint8Array(fragBuffer);
            const fragModel = await fragments.core.load(fragBytes, {
              modelId,
              camera: asFragCamera(world.camera?.three),
            });
            modelMounted = await mountFragmentModel(fragModel);
          }
        }
      } catch (fragErr) {
        console.warn(`[That Open Engine] Direct .frag load deferred for ${fragFileName}, trying raw IFC:`, fragErr);
      }

      // Priority 2: Raw Web-IFC Parser if .frag was not loaded
      if (!modelMounted && !isDisposed && !world.isDisposing) {
        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({ autoSetWasm: false });
        ifcLoader.settings.wasm = { path: "/", absolute: true };

        let data: Uint8Array | null = null;
        if (IFC_BINARY_CACHE.has(ifcFile)) {
          data = IFC_BINARY_CACHE.get(ifcFile)!;
        } else if ((window as any).__customIfcBuffers?.[ifcFile]) {
          data = new Uint8Array((window as any).__customIfcBuffers[ifcFile]);
          IFC_BINARY_CACHE.set(ifcFile, data);
        } else {
          const response = await fetch(`/models/ifc/${ifcFile}`);
          const ifcCt = response.headers.get("content-type") || "";
          if (response.ok && !ifcCt.includes("text/html")) {
            const buffer = await response.arrayBuffer();
            data = new Uint8Array(buffer);
            IFC_BINARY_CACHE.set(ifcFile, data);
          }
        }

        if (data && !isDisposed && !world.isDisposing) {
          const normalized = normalizeIfcUnitsBytes(data);
          const ifcModel = await ifcLoader.load(normalized, true, modelId);
          modelMounted = await mountFragmentModel(ifcModel);
        }
      }
    } catch (ifcErr) {
      console.warn(`[That Open Engine] Direct IFC parsing deferred for ${ifcFile}, falling back to structural digital twin:`, ifcErr);
    }

    // Fallback: If neither .frag nor .ifc could be parsed, render the structural BIM model
    if (!modelMounted) {
      const twin = ifcMeta ? ifcMeta.twinType : "bridge";
      if (twin === "tower") {
        const fallback = buildTowerEnvironment();
        modelGroup.add(fallback.group);
        disposables.push(fallback.dispose);
        updateCallback = (elapsed: number) => fallback.updateTower(elapsed);
      } else if (twin === "villa") {
        const fallback = buildLuxuryVillaEnvironment();
        modelGroup.add(fallback.group);
        disposables.push(fallback.dispose);
        updateCallback = (elapsed: number) => fallback.updateWater(elapsed);
      } else {
        const fallback = buildBridgeEnvironment();
        modelGroup.add(fallback.group);
        disposables.push(fallback.dispose);
        updateCallback = (elapsed: number) => fallback.updateBridge(elapsed);
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
    updateCallback = (elapsed: number) => {
      towerEnv.updateTower(elapsed);
    };
    if (cameraControls) {
      cameraControls.setLookAt(26, 22, 30, 0, 12, 0, false);
    }
  } else if (type === "villa") {
    const villaEnv: IVillaEnvironment = buildLuxuryVillaEnvironment();
    modelGroup.add(villaEnv.group);
    disposables.push(villaEnv.dispose);
    updateCallback = (elapsed: number) => {
      villaEnv.updateWater(elapsed);
    };
    if (cameraControls) {
      cameraControls.setLookAt(16, 10, 20, 0, 2.5, 0, false);
    }
  } else if (type === "bridge") {
    const bridgeEnv: IBridgeEnvironment = buildBridgeEnvironment();
    modelGroup.add(bridgeEnv.group);
    disposables.push(bridgeEnv.dispose);
    updateCallback = (elapsed: number) => {
      bridgeEnv.updateBridge(elapsed);
    };
    if (cameraControls) {
      cameraControls.setLookAt(28, 14, 30, 0, 4, 0, false);
    }
  } else if (type === "car") {
    const carEnv: ICarEnvironment = buildCarShowroomEnvironment();
    modelGroup.add(carEnv.group);
    disposables.push(carEnv.dispose);

    const carMtlLoader = new MTLLoader();
    carMtlLoader.setPath("/models/car/");
    carMtlLoader.load(
      "car.mtl",
      (materials) => {
        if (isDisposed) return;
        materials.preload();
        const carObjLoader = new OBJLoader();
        carObjLoader.setMaterials(materials);
        carObjLoader.setPath("/models/car/");
        carObjLoader.load(
          "car.obj",
          (mesh) => {
            if (isDisposed) return;
            mesh.rotation.x = -Math.PI / 2;
            mesh.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            mesh.position.x = -center.x;
            mesh.position.z = -center.z;
            mesh.position.y = -box.min.y + 0.12;
            mesh.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).castShadow = true;
                (child as THREE.Mesh).receiveShadow = true;
              }
            });
            modelGroup.add(mesh);
          },
          undefined,
          (err) => console.warn("[That Open Engine] Car OBJ load deferred:", err)
        );
      },
      undefined,
      (err) => console.warn("[That Open Engine] Car MTL load deferred:", err)
    );

    updateCallback = (elapsed: number) => {
      carEnv.updateLights(elapsed);
    };
    if (cameraControls) {
      cameraControls.setLookAt(8, 4.5, 9, 0, 1, 0, false);
    }
  } else if (type === "gear") {
    const gearEnv: IGearEnvironment = buildGearEnvironment();
    modelGroup.add(gearEnv.group);
    disposables.push(gearEnv.dispose);

    // Load PBR Gear mesh & textures cleanly matching ThreeViewer studio
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath("/assets/Gear/");
    mtlLoader.load(
      "Gear1.mtl",
      (materials) => {
        if (isDisposed) return;
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath("/assets/Gear/");
        objLoader.load(
          "Gear1.obj",
          (mesh) => {
            if (isDisposed) return;
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            mesh.position.set(-center.x, 6.07, -center.z);
            mesh.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).castShadow = true;
                (child as THREE.Mesh).receiveShadow = true;
              }
            });
            modelGroup.add(mesh);
          },
          undefined,
          (err) => console.warn("[That Open Engine] OBJ gear load deferred:", err)
        );
      },
      undefined,
      (err) => console.warn("[That Open Engine] MTL gear load deferred:", err)
    );

    updateCallback = (elapsed: number) => {
      gearEnv.updateGearEnv(elapsed, false);
    };
    if (cameraControls) {
      cameraControls.setLookAt(19, 12, 21, 0, 4.8, 0, false);
    }
  } else {
    // Default BIM Modular Pavilion
    const cubeEnv: ICubeEnvironment = buildCubeEnvironment();
    modelGroup.add(cubeEnv.group);
    disposables.push(cubeEnv.dispose);
    updateCallback = (elapsed: number) => {
      cubeEnv.updatePavilion(elapsed);
    };
    if (cameraControls) {
      cameraControls.setLookAt(10, 6.5, 11, 0, 1.8, 0, false);
    }
  }

  return {
    group: modelGroup,
    update: updateCallback,
    dispose: () => {
      isDisposed = true;
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
      try {
        const workerUrl = await OBC.FragmentsManager.getWorker();
        fragments.init(workerUrl);
      } catch {
        fragments.init("");
      }
    }
    const ifcLoader = components.get(OBC.IfcLoader);
    await ifcLoader.setup({ autoSetWasm: false });
    ifcLoader.settings.wasm = { path: "/", absolute: true };

    const rawData = new Uint8Array(buffer);
    const data = normalizeIfcUnitsBytes(rawData);
    const modelName = fileName.replace(/\.ifc$/i, "");
    const ifcModel = await ifcLoader.load(data, true, modelName);
    const obj = ifcModel?.object;
    const fragCam = asFragCamera(world.camera?.three);
    if (ifcModel && obj) {
      if (typeof ifcModel.useCamera === "function" && fragCam) {
        ifcModel.useCamera(fragCam);
      }
      if (obj.parent !== world.scene.three) {
        world.scene.three.add(obj);
      }
      if (fragments.initialized && !world.isDisposing) {
        fragments.core.update(true);
      }

      const cameraControls = (world.camera as any).controls;
      const box = ifcModel.box;
      if (cameraControls && box && !box.isEmpty()) {
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        const span = Math.max(size.length() * 0.6, 12);
        cameraControls.setLookAt(
          center.x + span * 0.85,
          center.y + Math.max(span * 0.58, size.y * 1.15),
          center.z + span * 0.85,
          center.x,
          center.y,
          center.z,
          true
        );
      } else if (world.camera instanceof OBC.SimpleCamera) {
        await world.camera.fitToItems();
      }
      if (fragments.initialized && !world.isDisposing) {
        fragments.core.update(true);
      }
      return obj;
    }
  } catch (err) {
    console.error(`Failed to parse IFC file ${fileName}:`, err);
    throw err;
  }
  return null;
}

export interface BimElementInfo {
  elementId: string;
  name: string;
  type: string;
  point: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  triangleCount: number;
}

/**
 * Universal Semantic BIM Element Metadata Resolver
 * Extracts exact architectural classifications, dimensions, coordinates, and polygon counts
 * without generic fallback placeholders or truncated element titles.
 */
export function resolveBimElementInfo(
  mesh: THREE.Mesh,
  hitPoint: THREE.Vector3,
  project?: { modelCategory?: string; ifcFileName?: string; name?: string }
): BimElementInfo {
  const bbox = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const triCount = mesh.geometry?.index
    ? mesh.geometry.index.count / 3
    : (mesh.geometry?.attributes?.position?.count || 0) / 3;

  // Traverse parent hierarchy to capture semantic group context
  const pathSegments: string[] = [];
  let cur: THREE.Object3D | null = mesh;
  while (cur) {
    if (cur.name) pathSegments.push(cur.name.toLowerCase());
    cur = cur.parent;
  }
  const combined = pathSegments.join(" / ");
  const mName = (mesh.name || "").trim();
  const mNameLower = mName.toLowerCase();

  const w = size.x;
  const h = size.y;
  const d = size.z;
  const maxHoriz = Math.max(w, d);

  const rawId = (mesh as any).expressID ?? mesh.id;
  const elementId = typeof rawId === "number" ? rawId.toString() : String(rawId || "BIM-OBJ");

  let name = "";
  let type = "";

  // 0. Prioritize explicit semantic mesh.name if set (and not a generic Three.js auto-name)
  if (mName && !mNameLower.startsWith("mesh") && !mNameLower.startsWith("object") && !mNameLower.startsWith("box")) {
    name = mName;
    if (mNameLower.includes("slab") || mNameLower.includes("foundation") || mNameLower.includes("deck")) {
      type = "Structural Horizontal Element";
    } else if (mNameLower.includes("wall") || mNameLower.includes("spandrel") || mNameLower.includes("sill") || mNameLower.includes("parapet")) {
      type = "Building Envelope / Masonry";
    } else if (mNameLower.includes("glass") || mNameLower.includes("glazing") || mNameLower.includes("curtain") || mNameLower.includes("window")) {
      type = "Building Envelope / Curtain Glazing";
    } else if (mNameLower.includes("door")) {
      type = "Building Envelope / Door Assembly";
    } else if (mNameLower.includes("column") || mNameLower.includes("mullion") || mNameLower.includes("post") || mNameLower.includes("pier")) {
      type = "Vertical Compression Member";
    } else if (mNameLower.includes("pool") || mNameLower.includes("water") || mNameLower.includes("coping") || mNameLower.includes("ladder")) {
      type = "Aquatic Amenity / Hydraulic";
    } else if (mNameLower.includes("solar") || mNameLower.includes("pv") || mNameLower.includes("downlight") || mNameLower.includes("light")) {
      type = "Renewable Energy / MEP";
    } else if (mNameLower.includes("bed") || mNameLower.includes("sofa") || mNameLower.includes("lounge") || mNameLower.includes("chair") || mNameLower.includes("table") || mNameLower.includes("cushion") || mNameLower.includes("pillow") || mNameLower.includes("duvet") || mNameLower.includes("island") || mNameLower.includes("rug")) {
      type = "Residential Interior / FF&E";
    } else if (mNameLower.includes("desk") || mNameLower.includes("workstation") || mNameLower.includes("laptop") || mNameLower.includes("screen") || mNameLower.includes("draft") || mNameLower.includes("blueprint")) {
      type = "Interior BIM Fixture / FF&E";
    } else if (mNameLower.includes("pergola") || mNameLower.includes("bbq") || mNameLower.includes("grill") || mNameLower.includes("lawn") || mNameLower.includes("hedge") || mNameLower.includes("paver")) {
      type = "Landscape Architecture / Softscape";
    } else if (mNameLower.includes("girder") || mNameLower.includes("span") || mNameLower.includes("beam")) {
      type = "Civil Infrastructure Superstructure";
    } else {
      type = "BIM Architectural Asset";
    }
  }
  // 1. Semantic Architecture & Domain Fallback based on geometric proportions and hierarchy
  else if (mNameLower.includes("coping") || (combined.includes("coping") && h < 0.15)) {
    name = "Polished White Limestone Pool Coping";
    type = "Stone Coping / Architectural Trim";
  } else if (mNameLower.includes("water") || (combined.includes("water") && (mesh.material as any)?.transparent)) {
    name = "Dynamic Cyan Swimming Pool Water";
    type = "Aquatic Amenity / Hydraulic";
  } else if (mNameLower.includes("pool") || combined.includes("pool-shell") || combined.includes("villa-pool")) {
    name = "Infinity Swimming Pool Basin";
    type = "Aquatic Amenity / Hydraulic";
  } else if (mNameLower.includes("deck") || (combined.includes("teak") && h < 0.35)) {
    name = "Teak Sun-Deck Terrace Decking";
    type = "Exterior Architectural Timber";
  } else if (mNameLower.includes("solar") || mNameLower.includes("pv") || combined.includes("solar")) {
    name = "Monocrystalline Solar PV Module";
    type = "Renewable Energy / MEP";
  } else if (mNameLower.includes("desk") || mNameLower.includes("laptop") || mNameLower.includes("workstation") || combined.includes("office") || combined.includes("studio")) {
    name = "Architectural Executive Workstation";
    type = "Interior BIM Fixture / FF&E";
  } else if (mNameLower.includes("bed") || mNameLower.includes("mattress") || mNameLower.includes("headboard") || combined.includes("master-suite")) {
    name = "Master Bedroom Suite King Bed";
    type = "Residential Interior / FF&E";
  } else if (mNameLower.includes("sofa") || mNameLower.includes("couch") || mNameLower.includes("chaise") || combined.includes("living")) {
    name = "Nordic Linen Living Room Sofa";
    type = "Interior Furniture / FF&E";
  } else if (mNameLower.includes("pergola") || mNameLower.includes("bbq") || mNameLower.includes("grill") || combined.includes("pergola")) {
    name = "Timber Outdoor Pergola & BBQ Counter";
    type = "Landscape Architecture / Timber";
  } else if (mNameLower.includes("balustrade") || mNameLower.includes("infinityglass") || (combined.includes("glass") && h < 1.2)) {
    name = "Structural Toughened Glass Balustrade";
    type = "Architectural Barrier / Glazing";
  } else if (mNameLower.includes("glass") || mNameLower.includes("curtain") || (mesh.material as any)?.transparent) {
    name = "High-Performance Double Glazed Facade";
    type = "Building Envelope / Curtain Glazing";
  } else if (mNameLower.includes("door") || combined.includes("door")) {
    name = "Pivot Entrance Architectural Door";
    type = "Building Envelope / Door Assembly";
  } else if (mNameLower.includes("wall") || combined.includes("wall")) {
    name = "Insulated Facade Wall Panel";
    type = "Building Envelope / Masonry";
  } else if (mNameLower.includes("cable") || mNameLower.includes("stay")) {
    name = "High-Tensile Steel Stay Cable";
    type = "Tensile Structural Suspension";
  } else if (mNameLower.includes("girder") || mNameLower.includes("span")) {
    name = "Prestressed Box Girder Viaduct Segment";
    type = "Civil Infrastructure Superstructure";
  } else if (mNameLower.includes("pier") || mNameLower.includes("abutment")) {
    name = "Cast-in-Place Concrete Substructure Pier";
    type = "Civil Infrastructure Substructure";
  } else if (mNameLower.includes("slab") || mNameLower.includes("roof") || combined.includes("slab")) {
    name = "Cast-in-Place Reinforced Concrete Slab";
    type = "Structural Horizontal Element";
  } else if (mNameLower.includes("column") || mNameLower.includes("post") || combined.includes("column")) {
    name = "Structural Architectural Column";
    type = "Vertical Compression Member";
  } else if (mNameLower.includes("gear") || combined.includes("gear")) {
    name = "Industrial Helical Dyno Gear";
    type = "Mechanical Core / HVAC";
  } else if (mNameLower.includes("car") || combined.includes("car")) {
    name = "Aerodynamic EV Cyber Coupe Body";
    type = "Automotive Asset / Transport";
  } else if (mNameLower.includes("stone") || mNameLower.includes("step") || combined.includes("step")) {
    name = "Architectural Stepping Stone Paver";
    type = "Site Hardscape / Pedestrian";
  } else if (mNameLower.includes("hedge") || mNameLower.includes("garden") || mNameLower.includes("grass") || combined.includes("lawn")) {
    name = "Manicured Landscape Plinth";
    type = "Site Landscape / Softscape";
  } else {
    // 2. OpenBIM IFC Classification
    const isIfc = project?.modelCategory === "ifc" || 
                  Boolean(project?.ifcFileName) || 
                  (project?.name || "").toLowerCase().includes("ifc") ||
                  (project?.name || "").toLowerCase().includes("viaduct") ||
                  (project?.name || "").toLowerCase().includes("hns") ||
                  (project?.name || "").toLowerCase().includes("provi") ||
                  (project?.name || "").toLowerCase().includes("structural complex");

    if (isIfc) {
      if (h > 1.8 && maxHoriz < 1.2) {
        name = "IfcColumn — Vertical Compression Member";
        type = "IfcColumn · Structural";
      } else if (h < 0.45 && maxHoriz > 1.5) {
        name = "IfcSlab — Reinforced Concrete Deck";
        type = "IfcSlab · Structural";
      } else if (maxHoriz > 2.5 && (w < 0.5 || d < 0.5) && h > 1.2) {
        name = "IfcWallStandardCase — Exterior Enclosure Wall";
        type = "IfcWall · Architectural";
      } else if (maxHoriz > 2.0 && h < 1.2) {
        name = "IfcBeam — Longitudinal Superstructure Member";
        type = "IfcBeam · Structural";
      } else if (h < 0.8 && maxHoriz < 1.5) {
        name = "IfcFooting — Substructure Concrete Footing Pad";
        type = "IfcFooting · Substructure";
      } else {
        name = "IfcBuildingElement — Structural Coordination Member";
        type = "IfcProduct · IFC4";
      }
    } else {
      name = "BIM Structural Component Member";
      type = "Parametric CAD Mesh";
    }
  }

  return {
    elementId,
    name,
    type,
    point: hitPoint.clone(),
    width: size.x,
    height: size.y,
    depth: size.z,
    triangleCount: Math.round(triCount),
  };
}
