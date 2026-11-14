import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { DataEnhancer, unwrapIfcAttr } from "../../DataEnhancer";
import { SheetsSync } from "../../SheetsSync";
import { CypeConnector } from "../../CypeConnector";
import {
  ClashDetectionMode,
  ClashElementRecord,
  ClashPipelineMetrics,
  runFourStageClashPipeline,
} from "./clash-engine";

export type { ClashDetectionMode, ClashPipelineMetrics };

export interface ClashResultItem {
  id: string;
  modelId: string;
  bModelId?: string;
  aLocalId: number;
  bLocalId: number;
  aName: string;
  bName: string;
  aCategory: string;
  bCategory: string;
  overlapVolumeM3: number;
  severity: "high" | "medium" | "low";
  mode?: ClashDetectionMode;
  clusterId?: string;
  collisionPoint?: THREE.Vector3;
  box: THREE.Box3;
}

export interface ConstructionPhaseInfo {
  id: string;
  label: string;
  startPct: number;
  endPct: number;
  regex: string;
  color: string;
  count: number;
  estCostUsd: number;
  map: OBC.ModelIdMap;
}

/**
 * Module 5/6 Pro Suite:
 * 1. Real-Time 3D Clash Detection & Audit Markers
 * 2. 4D Construction Phasing & CapEx S-Curve Animator
 * 3. Live Element Property Override Editor & .FRAG Binary Exporter
 */
export class BimProSuite extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "9a44e821-7d34-4c19-9f51-08b2d1f77301";
  enabled = true;

  readonly onStateChanged = new OBC.Event<void>();
  readonly onClashLogRequested = new OBC.Event<ClashResultItem[]>();
  readonly onDisposed = new OBC.Event<void>();

  clashes: ClashResultItem[] = [];
  phases: ConstructionPhaseInfo[] = [];
  phaseProgress = 100;
  isPlaying4D = false;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  disciplineA = "IFCCOLUMN|IFCBEAM|IFCMEMBER|IFCFOOTING";
  disciplineB = "IFCWALL|IFCWALLSTANDARDCASE|IFCSLAB|IFCROOF|IFCPIPE|IFCDUCT";
  clashMode: ClashDetectionMode = "hard";
  toleranceMeters = -0.02;
  clusterProximityMeters = 2.5;
  clashMetrics: ClashPipelineMetrics | null = null;
  isIsolated = false;
  statusMessage = "Ready for 3D Clash QA, 4D Phasing & Property Export";
  isBusy = false;

  selectedEditTarget: {
    modelId: string;
    localId: number;
    name: string;
    category: string;
    fireRating: string;
    phaseTag: string;
    costUsd: string;
    notes: string;
  } | null = null;

  constructor(components: OBC.Components) {
    super(components);
    components.add(BimProSuite.uuid, this);
  }

  private resolveWorld(): OBC.World | undefined {
    const worlds = this.components.get(OBC.Worlds);
    return [...worlds.list.values()][0];
  }

  // =========================================================================
  // 1. Real-Time 3D Clash Detection Engine (Fragments getBoxes + Three Fallback)
  // =========================================================================
  clearClashMarkers() {
    const world = this.resolveWorld();
    if (world?.scene?.three) {
      const prev = world.scene.three.getObjectByName("__pro_clash_markers");
      if (prev) {
        prev.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
        world.scene.three.remove(prev);
      }
    }
    try {
      const hl = this.components.get(OBCF.Highlighter);
      hl.clear("__clash_a");
      hl.clear("__clash_b");
    } catch {}
    this.clashes = [];
    this.statusMessage = "Cleared 3D clash markers.";
    this.onStateChanged.trigger();
  }

  async runClashDetection(
    catA = this.disciplineA,
    catB = this.disciplineB,
    tolerance = this.toleranceMeters
  ): Promise<ClashResultItem[]> {
    this.disciplineA = catA;
    this.disciplineB = catB;
    this.toleranceMeters = tolerance;
    this.isBusy = true;
    this.statusMessage = "Scanning 3D element bounding volumes for intersections...";
    this.onStateChanged.trigger();

    this.clearClashMarkers();
    this.clashMetrics = null;

    const found: ClashResultItem[] = [];
    const fragments = this.components.get(OBC.FragmentsManager);
    const finder = this.components.get(OBC.ItemsFinder);
    const world = this.resolveWorld();

    try {
      const itemsA: ClashElementRecord[] = [];
      const itemsB: ClashElementRecord[] = [];

      if (fragments.initialized && fragments.list.size > 0) {
        const mapA = await finder.getItems([{ categories: [new RegExp(catA, "i")] }]);
        const mapB = await finder.getItems([{ categories: [new RegExp(catB, "i")] }]);

        for (const [modelId, model] of fragments.list) {
          if (!model) continue;
          const idsA = mapA[modelId] ? [...mapA[modelId]].slice(0, 350) : [];
          const idsB = mapB[modelId] ? [...mapB[modelId]].slice(0, 350) : [];
          if (idsA.length === 0 && idsB.length === 0) continue;

          const modelPos = ((model as any).object as THREE.Object3D | undefined)?.position;
          const offset = modelPos ? modelPos.clone() : new THREE.Vector3();

          const [boxesA, boxesB, dataRes] = await Promise.all([
            idsA.length > 0 ? model.getBoxes(idsA) : Promise.resolve([]),
            idsB.length > 0 ? model.getBoxes(idsB) : Promise.resolve([]),
            fragments.getData(
              { [modelId]: new Set([...idsA, ...idsB]) },
              { attributesDefault: true }
            ),
          ]);

          const metaById = new Map<number, { name: string; cat: string }>();
          for (const item of dataRes[modelId] || []) {
            const lid = Number(unwrapIfcAttr((item as any)._localId));
            const cName = unwrapIfcAttr((item as any)._category) || "IfcElement";
            const eName = unwrapIfcAttr((item as any).Name) || `${cName} #${lid}`;
            if (Number.isFinite(lid)) metaById.set(lid, { name: eName, cat: cName });
          }

          idsA.forEach((idA, idx) => {
            const b = boxesA[idx];
            if (!b || b.isEmpty()) return;
            const worldBox = b.clone().translate(offset);
            const meta = metaById.get(idA) || { name: `Element #${idA}`, cat: "Discipline A" };
            itemsA.push({
              key: `${modelId}:${idA}`,
              modelId,
              localId: idA,
              name: meta.name,
              category: meta.cat.replace(/^Ifc/i, ""),
              box: worldBox,
            });
          });

          idsB.forEach((idB, idx) => {
            const b = boxesB[idx];
            if (!b || b.isEmpty()) return;
            const worldBox = b.clone().translate(offset);
            const meta = metaById.get(idB) || { name: `Element #${idB}`, cat: "Discipline B" };
            itemsB.push({
              key: `${modelId}:${idB}`,
              modelId,
              localId: idB,
              name: meta.name,
              category: meta.cat.replace(/^Ifc/i, ""),
              box: worldBox,
            });
          });
        }
      } else if (world?.scene?.three) {
        // Fallback for built-in 3D scene models (e.g. 10-Villa, Tower, Bridge)
        const reA = new RegExp(catA, "i");
        const reB = new RegExp(catB, "i");
        let seq = 1;
        world.scene.three.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
          const name = obj.name || `Mesh_${seq}`;
          const lower = name.toLowerCase();
          if (
            lower.includes("grid") ||
            lower.includes("helper") ||
            lower.includes("__pro_clash") ||
            lower.includes("ground") ||
            lower.includes("sky")
          ) {
            return;
          }
          obj.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(obj);
          if (box.isEmpty()) return;

          const id = seq++;
          const rec: ClashElementRecord = {
            key: `scene:${id}`,
            modelId: "__scene__",
            localId: id,
            name,
            category: "3D Scene",
            box,
            mesh: obj,
          };
          const matchesA = reA.test(name);
          const matchesB = reB.test(name);
          if (matchesA) itemsA.push(rec);
          if (matchesB) itemsB.push(rec);
          if (!matchesA && !matchesB) {
            if (id % 2 === 1) itemsA.push(rec);
            else itemsB.push(rec);
          }
        });
      }

      const effectiveTolerance =
        this.clashMode === "clearance"
          ? Math.max(0.05, Math.abs(tolerance))
          : this.clashMode === "containment"
            ? 0
            : tolerance;

      const { results, metrics } = runFourStageClashPipeline(itemsA, itemsB, {
        mode: this.clashMode,
        toleranceMeters: effectiveTolerance,
        clusterProximityMeters: this.clusterProximityMeters,
        maxResults: 60,
      });

      this.clashMetrics = metrics;

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        found.push({
          id: `CL-${String(i + 1).padStart(2, "0")}`,
          modelId: r.a.modelId,
          bModelId: r.bModelId,
          aLocalId: r.a.localId,
          bLocalId: r.b.localId,
          aName: r.a.name,
          bName: r.b.name,
          aCategory: r.a.category,
          bCategory: r.b.category,
          overlapVolumeM3: r.overlapVolumeM3,
          severity: r.severity,
          mode: r.mode,
          clusterId: r.clusterId,
          collisionPoint: r.collisionPoint,
          box: r.overlapBox,
        });
      }

      // Draw crisp translucent 3D Clash Cubes + collision point markers inside World Scene
      if (world?.scene?.three && found.length > 0) {
        const markerGroup = new THREE.Group();
        markerGroup.name = "__pro_clash_markers";
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        const sphereGeom = new THREE.SphereGeometry(0.16, 12, 12);

        for (const clash of found) {
          clash.box.getSize(size);
          clash.box.getCenter(center);
          const geom = new THREE.BoxGeometry(
            Math.max(size.x, 0.25),
            Math.max(size.y, 0.25),
            Math.max(size.z, 0.25)
          );
          const colorHex = clash.severity === "high" ? 0xef4444 : 0xf59e0b;
          const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.45,
            depthTest: true,
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.copy(center);
          mesh.name = "__pro_clash_markers_item";
          markerGroup.add(mesh);

          if (clash.collisionPoint) {
            const ptMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const ptMesh = new THREE.Mesh(sphereGeom, ptMat);
            ptMesh.position.copy(clash.collisionPoint);
            ptMesh.name = "__pro_clash_markers_point";
            markerGroup.add(ptMesh);
          }
        }
        world.scene.three.add(markerGroup);
      }

      this.clashes = found;
      this.statusMessage =
        found.length > 0
          ? `4-Stage Scan (${metrics.durationMs}ms): ${found.length} ${this.clashMode} clash(es) in ${metrics.clusterCount} cluster(s) · ${metrics.discardedPct}% discarded.`
          : `Zero ${this.clashMode} clashes (${metrics.elementsA}×${metrics.elementsB} elements, ${metrics.discardedPct}% pruned in ${metrics.durationMs}ms).`;
      return found;
    } catch (err: any) {
      this.statusMessage = `Clash scan error: ${err?.message || err}`;
      return [];
    } finally {
      this.isBusy = false;
      this.onStateChanged.trigger();
    }
  }

  async focusClash(clash: ClashResultItem) {
    const hl = this.components.get(OBCF.Highlighter);
    const world = this.resolveWorld();

    if (!hl.styles.has("__clash_a")) {
      hl.styles.set("__clash_a", {
        color: new THREE.Color("#ef4444"),
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      });
    }
    if (!hl.styles.has("__clash_b")) {
      hl.styles.set("__clash_b", {
        color: new THREE.Color("#38bdf8"),
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      });
    }

    await hl.clear("__clash_a");
    await hl.clear("__clash_b");
    if (clash.modelId !== "__scene__") {
      const bModel = clash.bModelId && clash.bModelId !== "__scene__" ? clash.bModelId : clash.modelId;
      await Promise.all([
        hl.highlightByID("__clash_a", { [clash.modelId]: new Set([clash.aLocalId]) }, false, false),
        hl.highlightByID("__clash_b", { [bModel]: new Set([clash.bLocalId]) }, false, false),
      ]);
    }

    const controls = (world?.camera as { controls?: { fitToBox: Function } })?.controls;
    if (controls) {
      const padded = clash.box.clone().expandByScalar(1.8);
      await controls.fitToBox(padded, true, {
        paddingLeft: 1.3,
        paddingRight: 1.3,
        paddingTop: 1.3,
        paddingBottom: 1.3,
      });
    }

    this.statusMessage = `Inspecting ${clash.id}: ${clash.aName} vs ${clash.bName} (${clash.overlapVolumeM3} m³)`;
    this.onStateChanged.trigger();
  }

  async isolateClashPair(clash: ClashResultItem) {
    if (clash.modelId === "__scene__") {
      await this.focusClash(clash);
      return;
    }
    try {
      const hider = this.components.get(OBC.Hider);
      const bModel = clash.bModelId && clash.bModelId !== "__scene__" ? clash.bModelId : clash.modelId;
      const map: OBC.ModelIdMap =
        bModel === clash.modelId
          ? { [clash.modelId]: new Set([clash.aLocalId, clash.bLocalId]) }
          : {
              [clash.modelId]: new Set([clash.aLocalId]),
              [bModel]: new Set([clash.bLocalId]),
            };
      await hider.isolate(map);
      this.isIsolated = true;
      await this.focusClash(clash);
      this.statusMessage = `Isolated ${clash.id} pair (${clash.aName} × ${clash.bName}).`;
    } catch (err: any) {
      this.statusMessage = `Isolation failed: ${err?.message || err}`;
    }
    this.onStateChanged.trigger();
  }

  async clearClashIsolation() {
    try {
      const hider = this.components.get(OBC.Hider);
      await hider.set(true);
      this.isIsolated = false;
      this.statusMessage = "Restored full model visibility.";
    } catch {
      this.isIsolated = false;
    }
    this.onStateChanged.trigger();
  }

  async publishClashesToCype(targetClashes?: ClashResultItem[]) {
    const list = (targetClashes && targetClashes.length > 0 ? targetClashes : this.clashes).slice(0, 10);
    if (list.length === 0) {
      this.statusMessage = "Run a Clash Scan first before publishing to CYPE Issues.";
      this.onStateChanged.trigger();
      return;
    }

    this.isBusy = true;
    this.statusMessage = `Publishing ${list.length} clash(es) to CYPE Issues...`;
    this.onStateChanged.trigger();

    try {
      const cype = this.components.get(CypeConnector);
      for (const c of list) {
        const pt = c.collisionPoint
          ? ` @ (${c.collisionPoint.x.toFixed(1)}, ${c.collisionPoint.y.toFixed(1)}, ${c.collisionPoint.z.toFixed(1)})`
          : "";
        const title = `[${c.id}${c.clusterId ? `/${c.clusterId}` : ""}] ${c.aName} × ${c.bName} (${c.overlapVolumeM3} m³${pt})`;
        const disc =
          c.aCategory.toLowerCase().includes("pipe") ||
          c.aCategory.toLowerCase().includes("duct") ||
          c.bCategory.toLowerCase().includes("pipe") ||
          c.bCategory.toLowerCase().includes("duct")
            ? "MEP"
            : "Structure";
        await cype.createIssue(title, disc, c.severity);
      }
      this.statusMessage = `Published ${list.length} clash issue(s) to CYPE Issues!`;
    } catch (err: any) {
      this.statusMessage = `CYPE Issue publish failed: ${err?.message || err}`;
    } finally {
      this.isBusy = false;
      this.onStateChanged.trigger();
    }
  }

  async exportClashesToGoogleSheet() {
    if (this.clashes.length === 0) {
      this.statusMessage = "Run a Clash Scan first before exporting.";
      this.onStateChanged.trigger();
      return;
    }
    const sheetsSync = this.components.get(SheetsSync);
    const res = await sheetsSync.pushClashAuditToSheet(this.clashes);
    this.statusMessage = res.message;
    this.onStateChanged.trigger();
  }

  // =========================================================================
  // 2. 4D Construction Phasing & CapEx S-Curve Animator
  // =========================================================================
  async buildConstructionPhases(): Promise<ConstructionPhaseInfo[]> {
    const finder = this.components.get(OBC.ItemsFinder);
    const defs = [
      {
        id: "p1",
        label: "Phase 1 · Foundations & Structure",
        startPct: 0,
        endPct: 25,
        regex: "IFCFOOTING|IFCPILES|IFCCOLUMN|IFCBEAM|IFCMEMBER",
        color: "#f59e0b",
        ratePerItem: 1850,
      },
      {
        id: "p2",
        label: "Phase 2 · Core Slabs & Exterior Walls",
        startPct: 25,
        endPct: 55,
        regex: "IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCCURTAINWALL",
        color: "#38bdf8",
        ratePerItem: 1420,
      },
      {
        id: "p3",
        label: "Phase 3 · Roof, Stairs & Fenestration",
        startPct: 55,
        endPct: 80,
        regex: "IFCROOF|IFCSTAIR|IFCSTAIRFLIGHT|IFCRAILING|IFCWINDOW|IFCDOOR",
        color: "#a855f7",
        ratePerItem: 960,
      },
      {
        id: "p4",
        label: "Phase 4 · MEP, Fixtures & Site",
        startPct: 80,
        endPct: 100,
        regex: "IFCFLOW|IFCPIPE|IFCDUCT|IFCFURNISHING|IFCPLATE|IFCBUILDINGELEMENTPROXY",
        color: "#10b981",
        ratePerItem: 740,
      },
    ];

    const built: ConstructionPhaseInfo[] = [];
    for (const d of defs) {
      let map: OBC.ModelIdMap = {};
      let count = 0;
      try {
        map = await finder.getItems([{ categories: [new RegExp(d.regex, "i")] }]);
        for (const ids of Object.values(map)) count += ids.size;
      } catch {}
      built.push({
        id: d.id,
        label: d.label,
        startPct: d.startPct,
        endPct: d.endPct,
        regex: d.regex,
        color: d.color,
        count,
        estCostUsd: count * d.ratePerItem,
        map,
      });
    }

    this.phases = built;
    this.onStateChanged.trigger();
    return built;
  }

  async setPhaseProgress(pct: number) {
    this.phaseProgress = Math.max(0, Math.min(100, Math.round(pct)));
    if (this.phases.length === 0) {
      await this.buildConstructionPhases();
    }

    const hider = this.components.get(OBC.Hider);
    if (this.phaseProgress >= 100) {
      await hider.set(true);
      this.statusMessage = "4D Simulation: 100% As-Built Complete";
      this.onStateChanged.trigger();
      return;
    }

    const visibleMap: OBC.ModelIdMap = {};
    for (const p of this.phases) {
      if (this.phaseProgress > p.startPct) {
        for (const [mId, ids] of Object.entries(p.map)) {
          if (!visibleMap[mId]) visibleMap[mId] = new Set<number>();
          for (const id of ids) visibleMap[mId].add(id);
        }
      }
    }

    if (OBC.ModelIdMapUtils.isEmpty(visibleMap)) {
      await hider.set(false);
    } else {
      await hider.isolate(visibleMap);
    }

    const activePhase =
      this.phases.find((p) => this.phaseProgress > p.startPct && this.phaseProgress <= p.endPct) ||
      this.phases[0];
    this.statusMessage = `4D Timeline ${this.phaseProgress}% — ${activePhase?.label || "Initializing"}`;
    this.onStateChanged.trigger();
  }

  togglePlay4D() {
    if (this.isPlaying4D) {
      this.stopPlay4D();
      return;
    }
    this.isPlaying4D = true;
    if (this.phaseProgress >= 100) this.phaseProgress = 10;
    this.setPhaseProgress(this.phaseProgress);

    this.playTimer = setInterval(() => {
      const next = this.phaseProgress + 15;
      if (next >= 100) {
        this.setPhaseProgress(100);
        this.stopPlay4D();
      } else {
        this.setPhaseProgress(next);
      }
    }, 850);
    this.onStateChanged.trigger();
  }

  stopPlay4D() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    this.isPlaying4D = false;
    this.onStateChanged.trigger();
  }

  // =========================================================================
  // 3. Live Element Property Editor & .FRAG Binary Snapshot Exporter
  // =========================================================================
  async inspectSelectedForEdit() {
    const hl = this.components.get(OBCF.Highlighter);
    const fragments = this.components.get(OBC.FragmentsManager);
    const sel = hl.selection.select;

    if (!sel || OBC.ModelIdMapUtils.isEmpty(sel)) {
      this.statusMessage = "Select any element in the 3D viewport first, then click Pick Selected.";
      this.onStateChanged.trigger();
      return;
    }

    for (const [modelId, ids] of Object.entries(sel)) {
      const firstId = [...ids][0];
      if (firstId === undefined) continue;
      const raw = await fragments.getData({ [modelId]: new Set([firstId]) }, { attributesDefault: true });
      const item = raw[modelId]?.[0];
      const cat = item ? unwrapIfcAttr((item as any)._category) : "IfcElement";
      const name = item ? unwrapIfcAttr((item as any).Name) : `Element #${firstId}`;

      const de = this.components.get(DataEnhancer);
      const records = de.get(modelId, firstId);
      const findVal = (key: string, fallback: string) =>
        records.find((r) => r.propertyName.toLowerCase() === key.toLowerCase())?.propertyValue ||
        fallback;

      this.selectedEditTarget = {
        modelId,
        localId: firstId,
        name: name || `${cat} #${firstId}`,
        category: cat,
        fireRating: findVal("FireRating", "REI 90"),
        phaseTag: findVal("PhaseTag", "Phase 01 - Structural"),
        costUsd: findVal("CostUSD", "1850"),
        notes: findVal("InspectorNote", "Verified via Pro Studio"),
      };
      this.statusMessage = `Loaded "${this.selectedEditTarget.name}" (#${firstId}) for editing.`;
      this.onStateChanged.trigger();
      return;
    }
  }

  async saveSelectedEdits(fields: {
    fireRating: string;
    phaseTag: string;
    costUsd: string;
    notes: string;
  }) {
    if (!this.selectedEditTarget) return;
    const t = this.selectedEditTarget;
    this.selectedEditTarget = { ...t, ...fields };

    const de = this.components.get(DataEnhancer);
    const entries: Array<[string, string]> = [
      ["FireRating", fields.fireRating],
      ["PhaseTag", fields.phaseTag],
      ["CostUSD", fields.costUsd],
      ["InspectorNote", fields.notes],
    ];
    for (const [propertyName, propertyValue] of entries) {
      await de.set({
        modelId: t.modelId,
        expressId: t.localId,
        guid: `${t.modelId}_${t.localId}`,
        category: t.category,
        elementName: t.name,
        propertyName,
        propertyValue: String(propertyValue),
        discipline: "Pro Studio",
        createdAt: Date.now(),
      });
    }

    this.statusMessage = `Saved parameters for "${t.name}" (#${t.localId}) to DataEnhancer + Firestore.`;
    this.onStateChanged.trigger();
  }

  async exportFragBinary(): Promise<boolean> {
    const fragments = this.components.get(OBC.FragmentsManager);
    if (!fragments.initialized || fragments.list.size === 0) {
      this.statusMessage = "Load an IFC or .frag model before exporting binary .frag.";
      this.onStateChanged.trigger();
      return false;
    }

    let exportedCount = 0;
    for (const [modelId, model] of fragments.list) {
      if (!model || typeof model.getBuffer !== "function") continue;
      const buf = await model.getBuffer(false);
      const blob = new Blob([buf], { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const baseName = ((model as any).name || modelId || "bim-model").replace(/\.(ifc|frag)$/i, "");
      a.download = `${baseName}-pro-export.frag`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      exportedCount++;
    }

    this.statusMessage =
      exportedCount > 0
        ? `Exported ${exportedCount} compiled .frag binary file(s).`
        : "No Fragment buffer available to export.";
    this.onStateChanged.trigger();
    return exportedCount > 0;
  }

  dispose() {
    this.stopPlay4D();
    this.clearClashMarkers();
    this.onStateChanged.reset();
    this.onClashLogRequested.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}
