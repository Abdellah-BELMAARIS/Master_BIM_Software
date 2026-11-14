import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export interface ExportedModelArtifact {
  blob: Blob;
  fileName: string;
  sizeLabel: string;
  modelCount: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

/**
 * Flushes any pending FragmentsEditStudio edits on the target model(s)
 * before exporting geometry or fragment buffers.
 */
async function flushModelEdits(
  fragments: OBC.FragmentsManager,
  targetIds: string[]
): Promise<void> {
  for (const id of targetIds) {
    try {
      await fragments.core.editor.save(id);
    } catch {
      // Model may not have pending editor history; safe to continue
    }
  }
  try {
    await fragments.core.update(true);
  } catch {
    // Continue export even if core update is a no-op
  }
}

export function getLoadedModelIds(components: OBC.Components): string[] {
  const fragments = components.get(OBC.FragmentsManager);
  return Array.from(fragments.list.keys());
}

function isSceneHelperObject(obj: THREE.Object3D): boolean {
  const name = (obj.name || "").toLowerCase();
  if (
    obj instanceof THREE.Light ||
    obj instanceof THREE.Camera ||
    obj instanceof THREE.GridHelper ||
    obj instanceof THREE.AxesHelper ||
    obj instanceof THREE.Box3Helper ||
    (obj as any).isTransformControls ||
    (obj as any).isGrid ||
    name.includes("grid") ||
    name.includes("helper") ||
    name.includes("gizmo") ||
    name.includes("measurement") ||
    name.includes("clipper")
  ) {
    return true;
  }
  return false;
}

function containsRenderableMesh(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((child) => {
    if (found) return;
    if (
      (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) &&
      !isSceneHelperObject(child)
    ) {
      found = true;
    }
  });
  return found;
}

export function collectSceneModelObjects(components: OBC.Components): THREE.Object3D[] {
  try {
    const worlds = components.get(OBC.Worlds);
    const first = worlds.list.values().next();
    const world = first.done ? null : first.value;
    if (!world?.scene?.three) return [];

    return world.scene.three.children.filter(
      (child) =>
        child.visible &&
        !isSceneHelperObject(child) &&
        containsRenderableMesh(child)
    );
  } catch {
    return [];
  }
}

export function hasExportableSceneGeometry(components: OBC.Components): boolean {
  const fragments = components.get(OBC.FragmentsManager);
  if (fragments.list.size > 0) return true;
  return collectSceneModelObjects(components).length > 0;
}

function toStandardMaterial(mat: THREE.Material | THREE.Material[] | undefined): THREE.MeshStandardMaterial {
  const source = Array.isArray(mat) ? mat[0] : mat;
  const anyMat = source as any;
  const color = anyMat?.color instanceof THREE.Color ? anyMat.color.clone() : new THREE.Color(0xcbd5e1);
  const opacity = typeof anyMat?.opacity === "number" ? anyMat.opacity : 1;
  const transparent = Boolean(anyMat?.transparent) || opacity < 1;
  return new THREE.MeshStandardMaterial({
    color,
    opacity,
    transparent,
    roughness: typeof anyMat?.roughness === "number" ? anyMat.roughness : 0.65,
    metalness: typeof anyMat?.metalness === "number" ? anyMat.metalness : 0.1,
    side: source?.side ?? THREE.DoubleSide,
  });
}

function buildSanitizedGeometry(srcGeo: THREE.BufferGeometry): THREE.BufferGeometry | null {
  const posAttr = srcGeo.getAttribute("position");
  if (!posAttr || posAttr.count === 0) return null;

  const geo = new THREE.BufferGeometry();
  const posArray = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    posArray[i * 3] = posAttr.getX(i);
    posArray[i * 3 + 1] = posAttr.getY(i);
    posArray[i * 3 + 2] = posAttr.getZ(i);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));

  const normAttr = srcGeo.getAttribute("normal");
  if (normAttr && normAttr.count === posAttr.count) {
    const normArray = new Float32Array(normAttr.count * 3);
    for (let i = 0; i < normAttr.count; i++) {
      normArray[i * 3] = normAttr.getX(i);
      normArray[i * 3 + 1] = normAttr.getY(i);
      normArray[i * 3 + 2] = normAttr.getZ(i);
    }
    geo.setAttribute("normal", new THREE.BufferAttribute(normArray, 3));
  }

  if (srcGeo.index && srcGeo.index.count > 0) {
    const idxArray = new Uint32Array(srcGeo.index.count);
    for (let i = 0; i < srcGeo.index.count; i++) {
      idxArray[i] = srcGeo.index.getX(i);
    }
    geo.setIndex(new THREE.BufferAttribute(idxArray, 1));
  }

  return geo;
}

function appendSanitizedObject(sourceRoot: THREE.Object3D, exportRoot: THREE.Group): number {
  sourceRoot.updateMatrixWorld(true);
  let meshCount = 0;
  const instanceMat = new THREE.Matrix4();
  const worldMat = new THREE.Matrix4();

  sourceRoot.traverse((child) => {
    if (!child.visible || isSceneHelperObject(child)) return;

    if (child instanceof THREE.InstancedMesh && child.geometry && child.count > 0) {
      const geo = buildSanitizedGeometry(child.geometry);
      if (!geo) return;
      const mat = toStandardMaterial(child.material);
      const maxInstances = Math.min(child.count, 2000);
      for (let i = 0; i < maxInstances; i++) {
        child.getMatrixAt(i, instanceMat);
        worldMat.multiplyMatrices(child.matrixWorld, instanceMat);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = `${child.name || "Instance"}_${i}`;
        mesh.applyMatrix4(worldMat);
        exportRoot.add(mesh);
        meshCount++;
      }
      return;
    }

    if (child instanceof THREE.Mesh && child.geometry) {
      const geo = buildSanitizedGeometry(child.geometry);
      if (!geo) return;
      const mat = toStandardMaterial(child.material);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = child.name || `Mesh_${meshCount}`;
      mesh.applyMatrix4(child.matrixWorld);
      exportRoot.add(mesh);
      meshCount++;
    }
  });

  return meshCount;
}

/**
 * Exports one or all currently loaded models (Fragments/IFC or built-in 3D scene models such as 10-Villa)
 * to a binary .glb (glTF 2.0) file using Three.js GLTFExporter.
 */
export async function exportLoadedModelsToGlb(
  components: OBC.Components,
  modelId?: string,
  baseName?: string
): Promise<ExportedModelArtifact> {
  const fragments = components.get(OBC.FragmentsManager);
  const entries = Array.from(fragments.list.entries());
  const useSceneFallback = entries.length === 0 || modelId === "__scene__";

  const exportRoot = new THREE.Group();
  exportRoot.name = "MasterBIM_Export";
  let exportedCount = 0;
  let defaultTitle = "master_bim_coordination";

  if (!useSceneFallback) {
    const selected = modelId
      ? entries.filter(([id]) => id === modelId)
      : entries;
    if (selected.length === 0) {
      throw new Error(`Model "${modelId}" is no longer loaded.`);
    }

    await flushModelEdits(
      fragments,
      selected.map(([id]) => id)
    );

    for (const [, model] of selected) {
      const obj = (model as any).object as THREE.Object3D | undefined;
      if (obj) {
        exportedCount += appendSanitizedObject(obj, exportRoot);
      }
    }
    defaultTitle = selected.length === 1 ? selected[0][0] : "master_bim_coordination";
  } else {
    const sceneObjects = collectSceneModelObjects(components);
    if (sceneObjects.length === 0) {
      throw new Error("Load or open a 3D / IFC model before exporting.");
    }
    for (const obj of sceneObjects) {
      exportedCount += appendSanitizedObject(obj, exportRoot);
    }
    defaultTitle = sceneObjects[0]?.name || "master_bim_3d_scene";
  }

  if (exportRoot.children.length === 0 || exportedCount === 0) {
    throw new Error("No exportable 3D meshes were found in the active 3D scene.");
  }

  const exporter = new GLTFExporter();
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      exportRoot,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          const json = JSON.stringify(result);
          resolve(new TextEncoder().encode(json).buffer);
        }
      },
      (error) => reject(error),
      { binary: true, onlyVisible: false }
    );
  });

  const blob = new Blob([arrayBuffer], { type: "model/gltf-binary" });
  const rawTitle = baseName?.trim() || defaultTitle;
  const fileName = `${sanitizeFileName(rawTitle)}.glb`;

  return {
    blob,
    fileName,
    sizeLabel: formatSize(blob.size),
    modelCount: exportedCount,
  };
}

/**
 * Saves pending Fragments edits and exports the selected model as a .frag binary.
 */
export async function exportLoadedModelToFrag(
  components: OBC.Components,
  modelId?: string,
  baseName?: string
): Promise<ExportedModelArtifact> {
  const fragments = components.get(OBC.FragmentsManager);
  const entries = Array.from(fragments.list.entries());
  if (entries.length === 0) {
    throw new Error("Load at least one 3D / IFC model before exporting.");
  }

  const target = modelId
    ? entries.find(([id]) => id === modelId)
    : entries[0];
  if (!target) {
    throw new Error(`Model "${modelId}" is no longer loaded.`);
  }

  const [targetId, model] = target;
  await flushModelEdits(fragments, [targetId]);

  const buffer = await model.getBuffer(false);
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const rawTitle = baseName?.trim() || targetId;
  const fileName = `${sanitizeFileName(rawTitle)}.frag`;

  return {
    blob,
    fileName,
    sizeLabel: formatSize(blob.size),
    modelCount: 1,
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
