import * as OBC from "@thatopen/components";
import * as THREE from "three";

export function getPrimaryWorld(components: OBC.Components): OBC.World | null {
  try {
    const worlds = components.get(OBC.Worlds);
    const first = worlds.list.values().next();
    return first.done ? null : first.value;
  } catch {
    return null;
  }
}

export async function fitAllModelsCamera(
  components: OBC.Components,
  world?: OBC.World | null
): Promise<void> {
  const targetWorld = world ?? getPrimaryWorld(components);
  if (!targetWorld || targetWorld.isDisposing) return;

  const fragments = components.get(OBC.FragmentsManager);
  if (fragments.list.size === 0) return;

  const combinedBox = new THREE.Box3();
  for (const [, model] of fragments.list) {
    const obj = (model as any).object as THREE.Object3D | undefined;
    if (!obj) continue;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) {
      combinedBox.union(box);
    }
  }

  if (combinedBox.isEmpty()) {
    if (targetWorld.camera instanceof OBC.SimpleCamera) {
      await targetWorld.camera.fitToItems();
    }
    return;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  combinedBox.getCenter(center);
  combinedBox.getSize(size);
  const span = Math.max(size.length() * 0.65, 14);

  const cameraControls = (targetWorld.camera as any).controls;
  if (cameraControls && typeof cameraControls.setLookAt === "function") {
    cameraControls.setLookAt(
      center.x + span * 0.85,
      center.y + Math.max(span * 0.58, size.y * 1.15),
      center.z + span * 0.85,
      center.x,
      center.y,
      center.z,
      true
    );
  } else if (targetWorld.camera instanceof OBC.SimpleCamera) {
    await targetWorld.camera.fitToItems();
  }
}

export async function arrangeModelsInGrid(
  components: OBC.Components,
  world?: OBC.World | null,
  gapMeters = 8
): Promise<number> {
  const fragments = components.get(OBC.FragmentsManager);
  const entries = Array.from(fragments.list.entries());
  if (entries.length === 0) return 0;

  if (entries.length === 1) {
    const [, onlyModel] = entries[0];
    const obj = (onlyModel as any).object as THREE.Object3D | undefined;
    if (obj) {
      obj.position.set(0, 0, 0);
      obj.updateMatrixWorld(true);
    }
    if (fragments.initialized) {
      fragments.core.update(true);
    }
    await fitAllModelsCamera(components, world);
    return 1;
  }

  type ModelMetrics = {
    obj: THREE.Object3D;
    sizeX: number;
    sizeZ: number;
    localCenterX: number;
    localCenterZ: number;
  };

  const metrics: ModelMetrics[] = [];
  for (const [, model] of entries) {
    const obj = (model as any).object as THREE.Object3D | undefined;
    if (!obj) continue;
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    if (!box.isEmpty()) {
      box.getSize(size);
      box.getCenter(center);
    }
    metrics.push({
      obj,
      sizeX: Math.max(size.x, 4),
      sizeZ: Math.max(size.z, 4),
      localCenterX: center.x,
      localCenterZ: center.z,
    });
  }

  if (metrics.length === 0) return 0;

  const cols = Math.ceil(Math.sqrt(metrics.length));
  const rows = Math.ceil(metrics.length / cols);

  const colWidths = new Array<number>(cols).fill(0);
  const rowDepths = new Array<number>(rows).fill(0);

  metrics.forEach((m, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    colWidths[col] = Math.max(colWidths[col], m.sizeX);
    rowDepths[row] = Math.max(rowDepths[row], m.sizeZ);
  });

  const totalWidth =
    colWidths.reduce((sum, w) => sum + w, 0) + gapMeters * Math.max(0, cols - 1);
  const totalDepth =
    rowDepths.reduce((sum, d) => sum + d, 0) + gapMeters * Math.max(0, rows - 1);

  const colCenters: number[] = [];
  let cursorX = -totalWidth / 2;
  for (let c = 0; c < cols; c++) {
    colCenters.push(cursorX + colWidths[c] / 2);
    cursorX += colWidths[c] + gapMeters;
  }

  const rowCenters: number[] = [];
  let cursorZ = -totalDepth / 2;
  for (let r = 0; r < rows; r++) {
    rowCenters.push(cursorZ + rowDepths[r] / 2);
    cursorZ += rowDepths[r] + gapMeters;
  }

  metrics.forEach((m, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const targetX = colCenters[col] - m.localCenterX;
    const targetZ = rowCenters[row] - m.localCenterZ;
    m.obj.position.set(targetX, 0, targetZ);
    m.obj.updateMatrixWorld(true);
  });

  if (fragments.initialized) {
    fragments.core.update(true);
  }
  await fitAllModelsCamera(components, world);
  return metrics.length;
}

export async function resetModelsOrigin(
  components: OBC.Components,
  world?: OBC.World | null
): Promise<number> {
  const fragments = components.get(OBC.FragmentsManager);
  let count = 0;
  for (const [, model] of fragments.list) {
    const obj = (model as any).object as THREE.Object3D | undefined;
    if (!obj) continue;
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld(true);
    count++;
  }
  if (fragments.initialized) {
    fragments.core.update(true);
  }
  if (count > 0) {
    await fitAllModelsCamera(components, world);
  }
  return count;
}

export async function removeModelById(
  components: OBC.Components,
  modelId: string
): Promise<boolean> {
  const fragments = components.get(OBC.FragmentsManager);
  const model = fragments.list.get(modelId);
  if (!model) return false;

  try {
    await fragments.core.disposeModel(modelId);
  } catch {
    const obj = (model as any).object as THREE.Object3D | undefined;
    obj?.removeFromParent();
    try {
      (model as any).dispose?.();
    } catch {
      // ignore dispose errors on fallback
    }
    fragments.list.delete(modelId);
  }

  if (fragments.initialized) {
    fragments.core.update(true);
  }
  return true;
}

export async function clearAllModels(components: OBC.Components): Promise<number> {
  const fragments = components.get(OBC.FragmentsManager);
  const ids = Array.from(fragments.list.keys());
  let removed = 0;
  for (const id of ids) {
    if (await removeModelById(components, id)) {
      removed++;
    }
  }
  if (fragments.initialized) {
    fragments.core.update(true);
  }
  return removed;
}
