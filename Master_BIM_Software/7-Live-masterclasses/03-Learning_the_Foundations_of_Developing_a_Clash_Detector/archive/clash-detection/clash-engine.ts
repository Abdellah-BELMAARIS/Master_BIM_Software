import * as THREE from "three";

export type ClashDetectionMode = "hard" | "clearance" | "containment";

export interface ClashElementRecord {
  key: string;
  modelId: string;
  localId: number;
  name: string;
  category: string;
  box: THREE.Box3;
  mesh?: THREE.Mesh;
}

export interface ClashPipelineMetrics {
  elementsA: number;
  elementsB: number;
  bruteForcePairs: number;
  sweepPrunePairs: number;
  aabbCandidates: number;
  verifiedClashes: number;
  clusterCount: number;
  discardedPct: number;
  durationMs: number;
}

export interface ClashCandidateResult {
  a: ClashElementRecord;
  b: ClashElementRecord;
  bModelId: string;
  mode: ClashDetectionMode;
  overlapBox: THREE.Box3;
  collisionPoint: THREE.Vector3;
  overlapVolumeM3: number;
  severity: "high" | "medium" | "low";
  clusterId: string;
}

interface SweepInterval {
  set: "A" | "B";
  index: number;
  minX: number;
  maxX: number;
}

/**
 * Stage 2: Broad-Phase 1D Sweep & Prune along the X-axis.
 * Discards all pairs whose X-projections do not overlap in O((N+M) log(N+M) + K).
 */
export function sweepAndPrune1D(
  itemsA: ClashElementRecord[],
  itemsB: ClashElementRecord[],
  padding: number
): Array<[number, number]> {
  const pad = Math.max(0, padding);
  const intervals: SweepInterval[] = [];

  for (let i = 0; i < itemsA.length; i++) {
    const b = itemsA[i].box;
    if (b.isEmpty()) continue;
    intervals.push({ set: "A", index: i, minX: b.min.x - pad, maxX: b.max.x + pad });
  }
  for (let j = 0; j < itemsB.length; j++) {
    const b = itemsB[j].box;
    if (b.isEmpty()) continue;
    intervals.push({ set: "B", index: j, minX: b.min.x - pad, maxX: b.max.x + pad });
  }

  intervals.sort((x, y) => x.minX - y.minX || (x.set === "A" ? -1 : 1));

  const activeA: SweepInterval[] = [];
  const activeB: SweepInterval[] = [];
  const pairs: Array<[number, number]> = [];
  const seen = new Set<string>();

  for (const curr of intervals) {
    if (curr.set === "A") {
      for (let k = activeB.length - 1; k >= 0; k--) {
        if (activeB[k].maxX < curr.minX) {
          activeB.splice(k, 1);
        } else {
          const idxA = curr.index;
          const idxB = activeB[k].index;
          const key = `${idxA}:${idxB}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push([idxA, idxB]);
          }
        }
      }
      activeA.push(curr);
    } else {
      for (let k = activeA.length - 1; k >= 0; k--) {
        if (activeA[k].maxX < curr.minX) {
          activeA.splice(k, 1);
        } else {
          const idxA = activeA[k].index;
          const idxB = curr.index;
          const key = `${idxA}:${idxB}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push([idxA, idxB]);
          }
        }
      }
      activeB.push(curr);
    }
  }

  return pairs;
}

function getMeshWorldTriangleBoxes(mesh: THREE.Mesh, maxTris = 240): THREE.Box3[] {
  const geom = mesh.geometry;
  const pos = geom?.getAttribute("position");
  if (!pos || pos.count < 3) return [];

  mesh.updateMatrixWorld(true);
  const index = geom.getIndex();
  const triCount = index ? Math.floor(index.count / 3) : Math.floor(pos.count / 3);
  const step = Math.max(1, Math.ceil(triCount / maxTris));

  const boxes: THREE.Box3[] = [];
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  for (let t = 0; t < triCount; t += step) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    v0.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
    v1.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
    v2.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);

    const tb = new THREE.Box3();
    tb.expandByPoint(v0);
    tb.expandByPoint(v1);
    tb.expandByPoint(v2);
    boxes.push(tb);
  }
  return boxes;
}

function verifyMeshTriangleProximity(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh,
  overlapBox: THREE.Box3,
  padding: number
): boolean {
  const testZone = overlapBox.clone().expandByScalar(Math.max(0.02, padding));
  const trisA = getMeshWorldTriangleBoxes(meshA).filter((b) => testZone.intersectsBox(b));
  if (trisA.length === 0) return false;
  const trisB = getMeshWorldTriangleBoxes(meshB).filter((b) => testZone.intersectsBox(b));
  if (trisB.length === 0) return false;

  for (const bA of trisA) {
    const expandedA = padding > 0 ? bA.clone().expandByScalar(padding) : bA;
    for (const bB of trisB) {
      if (expandedA.intersectsBox(bB)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Executes the 4-stage Clash Detection Pipeline:
 * 1. AABB Extraction (pre-supplied)
 * 2. Broad-Phase 1D Sweep & Prune
 * 3. Full 3D AABB Overlap / Containment Filter
 * 4. Narrow-Phase Verification & Proximity Clustering
 */
export function runFourStageClashPipeline(
  itemsA: ClashElementRecord[],
  itemsB: ClashElementRecord[],
  options: {
    mode: ClashDetectionMode;
    toleranceMeters: number;
    clusterProximityMeters?: number;
    maxResults?: number;
  }
): { results: ClashCandidateResult[]; metrics: ClashPipelineMetrics } {
  const startMs = performance.now();
  const mode = options.mode;
  const rawTolerance = options.toleranceMeters;
  const clearancePad = mode === "clearance" ? Math.max(0.01, rawTolerance) : mode === "hard" ? rawTolerance : 0;
  const maxResults = options.maxResults ?? 60;
  const clusterRadius = options.clusterProximityMeters ?? 2.5;

  const bruteForcePairs = itemsA.length * itemsB.length;
  const sweepPairs = sweepAndPrune1D(itemsA, itemsB, Math.max(0, clearancePad));

  let aabbCandidates = 0;
  const verified: Omit<ClashCandidateResult, "clusterId">[] = [];
  const sz = new THREE.Vector3();

  for (const [i, j] of sweepPairs) {
    if (verified.length >= maxResults) break;
    const itemA = itemsA[i];
    const itemB = itemsB[j];
    if (itemA.modelId === itemB.modelId && itemA.localId === itemB.localId) continue;

    if (mode === "containment") {
      const aInB = itemB.box.containsBox(itemA.box);
      const bInA = itemA.box.containsBox(itemB.box);
      if (!aInB && !bInA) continue;
      aabbCandidates++;

      const inner = aInB ? itemA.box : itemB.box;
      inner.getSize(sz);
      const vol = Number((sz.x * sz.y * sz.z).toFixed(3));
      if (vol <= 0.001) continue;

      const center = new THREE.Vector3();
      inner.getCenter(center);

      verified.push({
        a: itemA,
        b: itemB,
        bModelId: itemB.modelId,
        mode,
        overlapBox: inner.clone(),
        collisionPoint: center,
        overlapVolumeM3: vol,
        severity: "high",
      });
      continue;
    }

    const testA =
      clearancePad !== 0 ? itemA.box.clone().expandByScalar(clearancePad) : itemA.box;
    if (testA.isEmpty() || !testA.intersectsBox(itemB.box)) continue;
    aabbCandidates++;

    const overlap = testA.clone().intersect(itemB.box);
    if (overlap.isEmpty()) continue;

    overlap.getSize(sz);
    const vol = Number((sz.x * sz.y * sz.z).toFixed(3));
    if (vol <= 0.001) continue;

    if (itemA.mesh && itemB.mesh) {
      const meshHit = verifyMeshTriangleProximity(
        itemA.mesh,
        itemB.mesh,
        overlap,
        Math.max(0, clearancePad)
      );
      if (!meshHit) continue;
    }

    const center = new THREE.Vector3();
    overlap.getCenter(center);

    verified.push({
      a: itemA,
      b: itemB,
      bModelId: itemB.modelId,
      mode,
      overlapBox: overlap,
      collisionPoint: center,
      overlapVolumeM3: vol,
      severity: vol > 0.25 ? "high" : vol > 0.05 ? "medium" : "low",
    });
  }

  // Stage 4b: Group verified clashes by 3D spatial proximity
  const clusterCenters: THREE.Vector3[] = [];
  const results: ClashCandidateResult[] = verified.map((item) => {
    let clusterIdx = clusterCenters.findIndex(
      (c) => c.distanceTo(item.collisionPoint) <= clusterRadius
    );
    if (clusterIdx === -1) {
      clusterIdx = clusterCenters.length;
      clusterCenters.push(item.collisionPoint.clone());
    }
    return {
      ...item,
      clusterId: `C${clusterIdx + 1}`,
    };
  });

  const discardedPct =
    bruteForcePairs > 0
      ? Number((((bruteForcePairs - verified.length) / bruteForcePairs) * 100).toFixed(1))
      : 100;

  return {
    results,
    metrics: {
      elementsA: itemsA.length,
      elementsB: itemsB.length,
      bruteForcePairs,
      sweepPrunePairs: sweepPairs.length,
      aabbCandidates,
      verifiedClashes: results.length,
      clusterCount: clusterCenters.length,
      discardedPct,
      durationMs: Math.max(1, Math.round(performance.now() - startMs)),
    },
  };
}
