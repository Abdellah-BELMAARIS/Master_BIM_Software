import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";

export type ModelerMode = "element" | "rebar" | "table";
export type ElementProfileKind =
  | "solid-block"
  | "hollow-frame"
  | "steel-h"
  | "steel-c"
  | "steel-t"
  | "steel-l"
  | "circular-column";
export type RebarPattern = "column-cage" | "bent-bar" | "spiral-core";
export type PlacementMode = "origin" | "beside-model" | "selection";

export interface SelectedIfcTarget {
  modelId: string;
  localId: number;
  category: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  origin: [number, number, number];
}

export interface SelectedElementEditState {
  targetWidth: number;
  targetHeight: number;
  targetDepth: number;
  dx: number;
  dy: number;
  dz: number;
  rotYDeg: number;
  colorHex: string;
  overrideColor: boolean;
}

export interface ElementModelConfig {
  profile: ElementProfileKind;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  voidRatio: number;
  colorHex: string;
  roughness: number;
  metalness: number;
}

export interface TableModelConfig {
  panelWidth: number;
  panelHeight: number;
  panelDepth: number;
  legWidth: number;
  legHeight: number;
  legDepth: number;
  showBorder: boolean;
  borderHeight: number;
  borderDepth: number;
  borderOffset: number;
  colorHex: string;
  roughness: number;
  metalness: number;
}

export interface RebarModelConfig {
  pattern: RebarPattern;
  barDiameterMm: number;
  stirrupDiameterMm: number;
  barCount: number;
  cageWidth: number;
  cageDepth: number;
  cageHeight: number;
  hookLength: number;
  bendRadius: number;
  includeStirrups: boolean;
  stirrupSpacing: number;
  colorHex: string;
}

export interface ModelerTakeoff {
  mode: ModelerMode;
  partCount: number;
  triangleCount: number;
  volumeM3: number;
  massKg: number;
  totalLinearMeters: number;
}

const DEFAULT_ELEMENT_CONFIG: ElementModelConfig = {
  profile: "steel-h",
  width: 0.45,
  height: 3.2,
  depth: 0.45,
  thickness: 0.025,
  voidRatio: 0.55,
  colorHex: "#64748b",
  roughness: 0.35,
  metalness: 0.65,
};

const DEFAULT_TABLE_CONFIG: TableModelConfig = {
  panelWidth: 2.2,
  panelHeight: 0.1,
  panelDepth: 1.2,
  legWidth: 0.12,
  legHeight: 0.85,
  legDepth: 0.12,
  showBorder: true,
  borderHeight: 0.06,
  borderDepth: 0.05,
  borderOffset: 0.01,
  colorHex: "#8b5a2b",
  roughness: 0.45,
  metalness: 0.15,
};

const DEFAULT_REBAR_CONFIG: RebarModelConfig = {
  pattern: "column-cage",
  barDiameterMm: 18,
  stirrupDiameterMm: 10,
  barCount: 8,
  cageWidth: 0.6,
  cageDepth: 0.6,
  cageHeight: 3.0,
  hookLength: 0.22,
  bendRadius: 0.05,
  includeStirrups: true,
  stirrupSpacing: 0.25,
  colorHex: "#38bdf8",
};

const createRectProfile = (minX: number, maxX: number, minZ: number, maxZ: number, y: number): number[] => [
  minX, y, minZ,
  maxX, y, minZ,
  maxX, y, maxZ,
  minX, y, maxZ,
];

const createClosedRectDirectrix = (minX: number, maxX: number, minZ: number, maxZ: number, y: number): number[] => [
  minX, y, minZ,
  maxX, y, minZ,
  maxX, y, maxZ,
  minX, y, maxZ,
  minX, y, minZ,
];

const createCircleProfile = (radius: number, segments = 10): number[] => {
  const pts: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    pts.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }
  return pts;
};

const computePerpNormal = (directrix: number[]): [number, number, number] => {
  if (directrix.length < 6) return [0, 1, 0];
  const tangent = new THREE.Vector3(
    directrix[3] - directrix[0],
    directrix[4] - directrix[1],
    directrix[5] - directrix[2]
  );
  if (tangent.lengthSq() < 1e-10) return [0, 1, 0];
  tangent.normalize();
  const ref = Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const normal = new THREE.Vector3().crossVectors(tangent, ref).normalize();
  return [normal.x, normal.y, normal.z];
};

const polylineLengthMeters = (pts: number[]): number => {
  let len = 0;
  for (let i = 3; i < pts.length; i += 3) {
    len += Math.hypot(pts[i] - pts[i - 3], pts[i + 1] - pts[i - 2], pts[i + 2] - pts[i - 1]);
  }
  return len;
};

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "").trim();
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16) || 0;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const readAttrText = (attr: any): string => {
  if (attr === undefined || attr === null) return "";
  if (typeof attr === "object" && "value" in attr) return String(attr.value ?? "");
  return String(attr);
};

/**
 * Pro Parametric BIM Modeler Component powered by `@thatopen/fragments` `GeometryEngine` (`web-ifc`).
 * Supports Empty Workspaces and Loaded / Uploaded IFC & `.FRAG` Projects with live selection
 * inspection, exact bounding-box sizing, structural steel sections, rebar cages, in-place element
 * replacement, active-model insertion, and standalone `.frag` authoring.
 */
export class Modeler extends OBC.Component {
  static uuid = "7c4a1290-5b8d-41b3-9d0a-3a91c8f6e104" as const;
  enabled = true;

  readonly onStateChanged = new OBC.Event<void>();
  readonly onFragmentModelBaked = new OBC.Event<FRAGS.FragmentsModel>();

  mode: ModelerMode = "element";
  placementMode: PlacementMode = "origin";
  placementOffset: [number, number, number] = [0, 0, 0];
  selectedTarget: SelectedIfcTarget | null = null;
  selectedEdit: SelectedElementEditState | null = null;
  elementConfig: ElementModelConfig = { ...DEFAULT_ELEMENT_CONFIG };
  tableConfig: TableModelConfig = { ...DEFAULT_TABLE_CONFIG };
  rebarConfig: RebarModelConfig = { ...DEFAULT_REBAR_CONFIG };
  takeoff: ModelerTakeoff | null = null;
  bakedModelId: string | null = null;
  isEngineReady = false;
  isBusy = false;
  hasGenerated = false;
  statusMessage = "Select an IFC element to model at its exact size, or build from scratch.";
  statusTone: "info" | "warn" = "info";

  private ifcApi: WEBIFC.IfcAPI | null = null;
  private geometryEngine: FRAGS.GeometryEngine | null = null;
  private engineInitPromise: Promise<FRAGS.GeometryEngine> | null = null;
  private previewGroup: THREE.Group | null = null;
  private highlighterBound = false;

  constructor(components: OBC.Components) {
    super(components);
    components.add(Modeler.uuid, this);
    this.bindSelectionEvents();
  }

  private emit(msg?: string, tone: "info" | "warn" = "info") {
    if (msg !== undefined) {
      this.statusMessage = msg;
      this.statusTone = tone;
    }
    this.onStateChanged.trigger();
  }

  private bindSelectionEvents() {
    if (this.highlighterBound) return;
    try {
      const highlighter = this.components.get(OBCF.Highlighter);
      if (highlighter?.events?.select) {
        highlighter.events.select.onHighlight.add((map) => {
          void this.inspectSelectedIfcElement(map);
        });
        highlighter.events.select.onClear.add(() => {
          this.selectedTarget = null;
          this.emit();
        });
        this.highlighterBound = true;
      }
    } catch {}
  }

  get hasLoadedFragmentModels(): boolean {
    try {
      return this.components.get(OBC.FragmentsManager).list.size > 0;
    } catch {
      return false;
    }
  }

  refreshContext(): void {
    this.bindSelectionEvents();
    if (this.hasLoadedFragmentModels) {
      if (!this.hasGenerated && this.placementMode === "origin") {
        this.placementMode = "beside-model";
      }
      void this.inspectSelectedIfcElement();
    }
    this.emit();
  }

  private getWorld(): OBC.World | null {
    const worlds = this.components.get(OBC.Worlds);
    return [...worlds.list.values()][0] ?? null;
  }

  private async ensureEngine(): Promise<FRAGS.GeometryEngine> {
    if (this.geometryEngine) return this.geometryEngine;
    if (this.engineInitPromise) return this.engineInitPromise;

    this.engineInitPromise = (async () => {
      const api = new WEBIFC.IfcAPI();
      api.SetWasmPath("/", true);
      await api.Init();
      const engine = new FRAGS.GeometryEngine(api);
      this.ifcApi = api;
      this.geometryEngine = engine;
      this.isEngineReady = true;
      return engine;
    })().catch((err) => {
      this.engineInitPromise = null;
      throw err;
    });

    return this.engineInitPromise;
  }

  private ensurePreviewGroup(): THREE.Group | null {
    const world = this.getWorld();
    if (!world) return null;
    if (!this.previewGroup || !this.previewGroup.parent) {
      const group = new THREE.Group();
      group.name = "__ParametricModelerGroup__";
      world.scene.three.add(group);
      this.previewGroup = group;
    }
    return this.previewGroup;
  }

  private disposePreviewChildren() {
    if (!this.previewGroup) return;
    while (this.previewGroup.children.length > 0) {
      const child = this.previewGroup.children[0] as THREE.Mesh;
      this.previewGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
  }

  private addMeshPart(
    group: THREE.Group,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
    ifcCategory: string
  ) {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { isParametricPart: true, ifcCategory };
    group.add(mesh);
  }

  async inspectSelectedIfcElement(explicitMap?: Record<string, Set<number>>): Promise<SelectedIfcTarget | null> {
    try {
      const highlighter = this.components.get(OBCF.Highlighter);
      const fragments = this.components.get(OBC.FragmentsManager);
      const selection = explicitMap ?? highlighter.selection.select;
      if (!selection) {
        this.selectedTarget = null;
        this.emit();
        return null;
      }

      for (const [modelId, idSet] of Object.entries(selection)) {
        const ids = [...(idSet as Iterable<number>)];
        if (ids.length === 0) continue;
        const model = fragments.list.get(modelId);
        if (!model) continue;

        const [boxes, itemsMap] = await Promise.all([
          model.getBoxes(ids.slice(0, 12)),
          model.getItems([ids[0]]).catch(() => new Map<number, FRAGS.RawItemData>()),
        ]);

        const combined = new THREE.Box3();
        for (const b of boxes) {
          if (b && !b.isEmpty()) combined.union(b);
        }
        if (combined.isEmpty()) continue;

        const size = combined.getSize(new THREE.Vector3());
        const center = combined.getCenter(new THREE.Vector3());
        const item = itemsMap.get(ids[0]);
        const category = item?.category || "IFCELEMENT";
        const name = readAttrText(item?.data?.Name) || `#${ids[0]}`;

        this.selectedTarget = {
          modelId,
          localId: ids[0],
          category,
          name,
          width: Math.max(0.05, Number(size.x.toFixed(2))),
          height: Math.max(0.05, Number(size.y.toFixed(2))),
          depth: Math.max(0.05, Number(size.z.toFixed(2))),
          origin: [
            Number(center.x.toFixed(2)),
            Number(combined.min.y.toFixed(2)),
            Number(center.z.toFixed(2)),
          ],
        };
        this.selectedEdit = {
          targetWidth: this.selectedTarget.width,
          targetHeight: this.selectedTarget.height,
          targetDepth: this.selectedTarget.depth,
          dx: 0,
          dy: 0,
          dz: 0,
          rotYDeg: 0,
          colorHex: this.selectedEdit?.colorHex || "#38bdf8",
          overrideColor: false,
        };
        this.emit();
        return this.selectedTarget;
      }
    } catch {}

    this.selectedTarget = null;
    this.selectedEdit = null;
    this.emit();
    return null;
  }

  updateSelectedEdit(partial: Partial<SelectedElementEditState>): void {
    if (!this.selectedEdit) return;
    this.selectedEdit = { ...this.selectedEdit, ...partial };
    this.emit();
  }

  resetSelectedEditDraft(): void {
    if (!this.selectedTarget) return;
    this.selectedEdit = {
      targetWidth: this.selectedTarget.width,
      targetHeight: this.selectedTarget.height,
      targetDepth: this.selectedTarget.depth,
      dx: 0,
      dy: 0,
      dz: 0,
      rotYDeg: 0,
      colorHex: this.selectedEdit?.colorHex || "#38bdf8",
      overrideColor: false,
    };
    this.emit("Reset selected resize/transform inputs to 1:1.");
  }

  /**
   * Resizes (independent W/H/D), translates, rotates, and/or recolors ONLY the
   * currently selected IFC element in place without spawning new unrequested models.
   */
  async applySelectedElementModification(): Promise<boolean> {
    if (!this.selectedTarget || !this.selectedEdit) {
      this.emit("Select an IFC element in 3D first.", "warn");
      return false;
    }

    const fragments = this.components.get(OBC.FragmentsManager);
    const model = fragments.list.get(this.selectedTarget.modelId);
    if (!model) {
      this.emit("Selected model is not loaded.", "warn");
      return false;
    }

    const { localId, width: w0, height: h0, depth: d0, origin } = this.selectedTarget;
    const { targetWidth, targetHeight, targetDepth, dx, dy, dz, rotYDeg, colorHex, overrideColor } =
      this.selectedEdit;

    const sx = Math.max(0.05, targetWidth / Math.max(0.02, w0));
    const sy = Math.max(0.05, targetHeight / Math.max(0.02, h0));
    const sz = Math.max(0.05, targetDepth / Math.max(0.02, d0));

    this.isBusy = true;
    this.emit(`Resizing & updating "${this.selectedTarget.name}"...`);
    try {
      const gtIds = await model.getGlobalTranformsIdsOfItems([localId]);
      if (gtIds.length === 0) {
        this.emit("Selected item has no geometry samples.", "warn");
        return false;
      }

      const [gtMap, ltMap, samples] = await Promise.all([
        model.getGlobalTransforms(gtIds),
        model.getLocalTransforms(),
        model.getSamples(),
      ]);

      const gtSet = new Set(gtIds);
      const matchedSamples = [...samples.entries()].filter(([, s]) => gtSet.has(s.item));
      if (matchedSamples.length === 0) {
        this.emit("No sample instances matched the selected element.", "warn");
        return false;
      }

      const uniqueReprIds = [...new Set(matchedSamples.map(([, s]) => s.representation))];
      const reprMap = await model.getRepresentations(uniqueReprIds);

      const anchor = new THREE.Vector3(origin[0], origin[1], origin[2]);
      const worldEdit = new THREE.Matrix4()
        .makeTranslation(anchor.x + dx, anchor.y + dy, anchor.z + dz)
        .multiply(new THREE.Matrix4().makeRotationY((rotYDeg * Math.PI) / 180))
        .multiply(new THREE.Matrix4().makeScale(sx, sy, sz))
        .multiply(new THREE.Matrix4().makeTranslation(-anchor.x, -anchor.y, -anchor.z));

      const requests: FRAGS.EditRequest[] = [];
      const stamp = Date.now();
      let matTempId: string | null = null;
      if (overrideColor) {
        matTempId = `mat_sel_${stamp}`;
        const { r, g, b } = hexToRgb(colorHex);
        requests.push({
          type: FRAGS.EditRequestType.CREATE_MATERIAL,
          tempId: matTempId,
          data: {
            r,
            g,
            b,
            a: 255,
            renderedFaces: FRAGS.RenderedFaces.TWO,
            stroke: FRAGS.Stroke.DEFAULT,
          },
        });
      }

      let sampleSeq = 0;
      const updatedGtIds = new Set<number>();

      for (const [sampleId, sample] of matchedSamples) {
        const rawRepr = reprMap.get(sample.representation);
        const gt = gtMap.get(sample.item);
        const lt = ltMap.get(sample.localTransform);

        if (
          rawRepr &&
          rawRepr.representationClass === FRAGS.RepresentationClass.SHELL &&
          rawRepr.geometry &&
          "points" in rawRepr.geometry
        ) {
          const shell = rawRepr.geometry as FRAGS.RawShell;
          const localMat = new THREE.Matrix4();
          if (gt) localMat.multiply(FRAGS.GeomsFbUtils.matrixFromTransform(gt));
          if (lt) localMat.multiply(FRAGS.GeomsFbUtils.matrixFromTransform(lt));
          const localEditMat = localMat.clone().invert().multiply(worldEdit).multiply(localMat);

          let minX = Infinity;
          let minY = Infinity;
          let minZ = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          let maxZ = -Infinity;
          const v = new THREE.Vector3();

          const scaledPoints = shell.points.map((pt) => {
            v.set(pt[0], pt[1], pt[2]).applyMatrix4(localEditMat);
            if (v.x < minX) minX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.z < minZ) minZ = v.z;
            if (v.x > maxX) maxX = v.x;
            if (v.y > maxY) maxY = v.y;
            if (v.z > maxZ) maxZ = v.z;
            return [v.x, v.y, v.z];
          });

          const reprTempId = `repr_sel_${stamp}_${++sampleSeq}`;
          requests.push({
            type: FRAGS.EditRequestType.CREATE_REPRESENTATION,
            tempId: reprTempId,
            data: {
              representationClass: rawRepr.representationClass,
              bbox:
                scaledPoints.length > 0
                  ? [minX, minY, minZ, maxX, maxY, maxZ]
                  : rawRepr.bbox,
              geometry: {
                ...shell,
                points: scaledPoints,
              },
            },
          });

          requests.push({
            type: FRAGS.EditRequestType.UPDATE_SAMPLE,
            localId: sampleId,
            data: {
              ...sample,
              representation: reprTempId,
              material: matTempId ?? sample.material,
            },
          });
        } else if (gt && !updatedGtIds.has(sample.item)) {
          updatedGtIds.add(sample.item);
          const xVec = new THREE.Vector3(...gt.xDirection).multiplyScalar(sx);
          const yVec = new THREE.Vector3(...gt.yDirection).multiplyScalar(sy);
          requests.push({
            type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
            localId: sample.item,
            data: {
              ...gt,
              position: [gt.position[0] + dx, gt.position[1] + dy, gt.position[2] + dz],
              xDirection: [xVec.x, xVec.y, xVec.z],
              yDirection: [yVec.x, yVec.y, yVec.z],
            },
          });
          if (matTempId) {
            requests.push({
              type: FRAGS.EditRequestType.UPDATE_SAMPLE,
              localId: sampleId,
              data: { ...sample, material: matTempId },
            });
          }
        }
      }

      if (requests.length === 0) {
        this.emit("No editable geometry data found on selected element.", "warn");
        return false;
      }

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      await this.inspectSelectedIfcElement();
      this.onFragmentModelBaked.trigger(model);
      this.emit(
        `Modified "${this.selectedTarget?.name || localId}" -> ${targetWidth}×${targetHeight}×${targetDepth}m.`
      );
      return true;
    } catch (err: any) {
      console.error("[Modeler] Selected element resize failed:", err);
      this.emit(`Modify failed: ${err?.message || err}`, "warn");
      return false;
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }

  private suggestProfileForCategory(category: string, target: SelectedIfcTarget): ElementProfileKind {
    const cat = category.toUpperCase();
    if (cat.includes("BEAM") || cat.includes("MEMBER")) return "steel-h";
    if (cat.includes("COLUMN")) {
      return Math.abs(target.width - target.depth) < 0.08 && target.width < 0.8
        ? "steel-h"
        : "circular-column";
    }
    if (cat.includes("WINDOW") || cat.includes("DOOR") || cat.includes("CURTAINWALL")) {
      return "hollow-frame";
    }
    return "solid-block";
  }

  /**
   * Reads the currently selected IFC element's exact 3D bounding box and applies
   * its dimensions, origin coordinates, and category-appropriate BIM profile.
   */
  async matchSelectedElement(focus = true): Promise<void> {
    const target = await this.inspectSelectedIfcElement();
    if (!target) {
      this.emit("Select an element in the 3D IFC model first.", "warn");
      return;
    }

    this.placementMode = "selection";
    this.placementOffset = [...target.origin];

    if (this.mode === "rebar") {
      const cover = 0.08;
      this.rebarConfig = {
        ...this.rebarConfig,
        cageWidth: Math.max(0.2, Number((target.width - cover).toFixed(2))),
        cageDepth: Math.max(0.2, Number((target.depth - cover).toFixed(2))),
        cageHeight: Math.max(0.4, Number((target.height - cover).toFixed(2))),
      };
      await this.rebuildRebar(focus);
      this.emit(`Rebar Cage matched to ${target.category} (${target.width}×${target.height}×${target.depth}m).`);
      return;
    }

    this.mode = "element";
    this.elementConfig = {
      ...this.elementConfig,
      profile: this.suggestProfileForCategory(target.category, target),
      width: target.width,
      height: target.height,
      depth: target.depth,
    };
    await this.rebuildElement(focus);
    this.emit(`Parametric element matched to ${target.category} "${target.name}" (${target.width}×${target.height}×${target.depth}m).`);
  }

  async resolvePlacementCoordinates(requestedMode?: PlacementMode): Promise<[number, number, number]> {
    const mode = requestedMode ?? this.placementMode;
    this.placementMode = mode;

    if (mode === "selection") {
      const target = await this.inspectSelectedIfcElement();
      if (target) {
        this.placementOffset = [...target.origin];
        return this.placementOffset;
      }
      this.emit("No 3D element selected — placed beside model / origin.", "warn");
    }

    if (mode === "beside-model") {
      const fragments = this.components.get(OBC.FragmentsManager);
      const modelBox = new THREE.Box3();
      for (const [, model] of fragments.list) {
        if (model.modelId.startsWith("Parametric_")) continue;
        if (model.box && !model.box.isEmpty()) {
          modelBox.union(model.box);
        } else if (model.object) {
          modelBox.expandByObject(model.object);
        }
      }
      if (!modelBox.isEmpty()) {
        const center = modelBox.getCenter(new THREE.Vector3());
        this.placementOffset = [
          Number((modelBox.max.x + 2.2).toFixed(2)),
          Number(modelBox.min.y.toFixed(2)),
          Number(center.z.toFixed(2)),
        ];
        return this.placementOffset;
      }
    }

    this.placementOffset = [0, 0, 0];
    return this.placementOffset;
  }

  async setPlacementMode(nextMode: PlacementMode): Promise<void> {
    await this.resolvePlacementCoordinates(nextMode);
    if (this.hasGenerated) {
      await this.rebuildActiveAssembly(true);
    } else {
      this.emit();
    }
  }

  async setMode(nextMode: ModelerMode): Promise<void> {
    this.mode = nextMode;
    this.emit();
    if (this.hasGenerated) {
      await this.rebuildActiveAssembly(true);
    }
  }

  async updateElement(partial: Partial<ElementModelConfig>, focus = false): Promise<void> {
    this.mode = "element";
    this.elementConfig = { ...this.elementConfig, ...partial };
    await this.rebuildElement(focus);
  }

  async updateTable(partial: Partial<TableModelConfig>, focus = false): Promise<void> {
    this.mode = "table";
    this.tableConfig = { ...this.tableConfig, ...partial };
    await this.rebuildTable(focus);
  }

  async updateRebar(partial: Partial<RebarModelConfig>, focus = false): Promise<void> {
    this.mode = "rebar";
    this.rebarConfig = { ...this.rebarConfig, ...partial };
    await this.rebuildRebar(focus);
  }

  async rebuildActiveAssembly(focus = false): Promise<void> {
    if (!this.hasGenerated && this.hasLoadedFragmentModels && this.placementMode === "origin") {
      await this.resolvePlacementCoordinates("beside-model");
    } else if (!this.hasGenerated) {
      await this.resolvePlacementCoordinates(this.placementMode);
    }

    if (this.mode === "element") {
      await this.rebuildElement(focus);
    } else if (this.mode === "rebar") {
      await this.rebuildRebar(focus);
    } else {
      await this.rebuildTable(focus);
    }
  }

  async focusPreview(): Promise<void> {
    const world = this.getWorld();
    if (!world || !this.previewGroup || this.previewGroup.children.length === 0) return;
    const controls = (world.camera as { controls?: { fitToBox: Function } })?.controls;
    if (!controls) return;
    this.previewGroup.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(this.previewGroup);
    if (!bbox.isEmpty()) {
      await controls.fitToBox(bbox, true, {
        paddingLeft: 1.4,
        paddingRight: 1.4,
        paddingTop: 1.2,
        paddingBottom: 1.2,
      });
    }
  }

  clearPreview(silent = false): void {
    this.disposePreviewChildren();
    this.takeoff = null;
    this.hasGenerated = false;
    if (!silent) {
      this.emit("Cleared parametric preview geometry from viewport.");
    }
  }

  /**
   * Builds structural / architectural BIM elements (Solid, Hollow Frame, Steel H/C/T/L, Circular)
   * sized to either an inspect-matched IFC selection or custom parameters.
   */
  private async rebuildElement(focus = false): Promise<void> {
    this.isBusy = true;
    try {
      const engine = await this.ensureEngine();
      const group = this.ensurePreviewGroup();
      if (!group) {
        this.emit("3D World is not ready yet.", "warn");
        return;
      }
      this.disposePreviewChildren();
      group.position.set(...this.placementOffset);

      const c = this.elementConfig;
      const w = Math.max(0.05, c.width);
      const h = Math.max(0.05, c.height);
      const d = Math.max(0.05, c.depth);
      const t = Math.min(Math.min(w, d) * 0.35, Math.max(0.008, c.thickness));

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.colorHex || "#64748b"),
        roughness: Math.max(0.05, Math.min(1, c.roughness)),
        metalness: Math.max(0, Math.min(1, c.metalness)),
        side: THREE.DoubleSide,
      });

      const geom = new THREE.BufferGeometry();
      const profileMap: Record<string, FRAGS.ProfileType> = {
        "steel-h": FRAGS.ProfileType.H,
        "steel-c": FRAGS.ProfileType.C,
        "steel-t": FRAGS.ProfileType.T,
        "steel-l": FRAGS.ProfileType.L,
      };

      let volumeM3 = w * h * d;
      let partCategory = this.selectedTarget?.category || "IFCBUILDINGELEMENTPROXY";

      if (c.profile in profileMap) {
        const rotXZ = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
        const pts2d = engine.getProfilePoints({
          type: profileMap[c.profile],
          width: w,
          depth: d,
          thickness: t,
          flangeThickness: t * 1.25,
          hasFillet: false,
        });
        const flatPts = engine.transformPoints(pts2d, rotXZ);
        engine.getExtrusion(geom, {
          profilePoints: flatPts,
          direction: [0, 1, 0],
          length: h,
          cap: true,
        });
        volumeM3 = (2 * w * t + Math.max(0, d - 2 * t) * t) * h;
        if (!this.selectedTarget) partCategory = "IFCBEAM";
      } else if (c.profile === "hollow-frame") {
        const ratio = Math.max(0.2, Math.min(0.85, c.voidRatio));
        const holeW = w * ratio;
        const holeD = d * ratio;
        engine.getExtrusion(geom, {
          profilePoints: createRectProfile(-w / 2, w / 2, -d / 2, d / 2, 0),
          profileHoles: [createRectProfile(-holeW / 2, holeW / 2, -holeD / 2, holeD / 2, 0)],
          direction: [0, 1, 0],
          length: h,
          cap: true,
        });
        volumeM3 = (w * d - holeW * holeD) * h;
      } else if (c.profile === "circular-column") {
        const r = Math.min(w, d) / 2;
        engine.getExtrusion(geom, {
          profilePoints: createCircleProfile(r, 24),
          direction: [0, 1, 0],
          length: h,
          cap: true,
        });
        volumeM3 = Math.PI * r * r * h;
        if (!this.selectedTarget) partCategory = "IFCCOLUMN";
      } else {
        engine.getExtrusion(geom, {
          profilePoints: createRectProfile(-w / 2, w / 2, -d / 2, d / 2, 0),
          direction: [0, 1, 0],
          length: h,
          cap: true,
        });
      }

      this.addMeshPart(group, geom, mat, `Parametric_${c.profile}`, partCategory);

      const triCount = geom.index ? geom.index.count / 3 : geom.attributes.position.count / 3;
      const density = c.profile.startsWith("steel-") ? 7850 : 2400;

      this.hasGenerated = true;
      this.takeoff = {
        mode: "element",
        partCount: 1,
        triangleCount: Math.round(triCount),
        volumeM3,
        massKg: volumeM3 * density,
        totalLinearMeters: h,
      };
      this.emit(
        `Element built (${w.toFixed(2)}×${h.toFixed(2)}×${d.toFixed(2)}m · ${volumeM3.toFixed(3)} m³).`
      );

      if (focus) await this.focusPreview();
    } catch (err: any) {
      console.error("[Modeler] Element build failed:", err);
      this.emit(`Element build failed: ${err?.message || err}`, "warn");
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }

  /**
   * Parametric Table + Corner Legs + Hollow Border Extrusion (`profileHoles`).
   */
  private async rebuildTable(focus = false): Promise<void> {
    this.isBusy = true;
    try {
      const engine = await this.ensureEngine();
      const group = this.ensurePreviewGroup();
      if (!group) {
        this.emit("3D World is not ready yet.", "warn");
        return;
      }
      this.disposePreviewChildren();
      group.position.set(...this.placementOffset);

      const c = this.tableConfig;
      const pw = Math.max(0.4, c.panelWidth);
      const ph = Math.max(0.02, c.panelHeight);
      const pd = Math.max(0.4, c.panelDepth);
      const lw = Math.min(pw * 0.35, Math.max(0.04, c.legWidth));
      const lh = Math.max(0.2, c.legHeight);
      const ld = Math.min(pd * 0.35, Math.max(0.04, c.legDepth));

      const baseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.colorHex || "#8b5a2b"),
        roughness: Math.max(0.05, Math.min(1, c.roughness)),
        metalness: Math.max(0, Math.min(1, c.metalness)),
        side: THREE.DoubleSide,
      });

      const borderMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.colorHex || "#8b5a2b").multiplyScalar(0.75),
        roughness: Math.max(0.05, Math.min(1, c.roughness * 0.85)),
        metalness: Math.max(0, Math.min(1, c.metalness + 0.08)),
        side: THREE.DoubleSide,
      });

      const panelGeom = new THREE.BufferGeometry();
      engine.getExtrusion(panelGeom, {
        profilePoints: createRectProfile(-pw / 2, pw / 2, -pd / 2, pd / 2, lh),
        direction: [0, 1, 0],
        length: ph,
        cap: true,
      });
      this.addMeshPart(group, panelGeom, baseMat, "Table_Panel", "IFCFURNITURE");

      const halfSpanX = Math.max(0.05, pw / 2 - lw * 0.75);
      const halfSpanZ = Math.max(0.05, pd / 2 - ld * 0.75);
      const legCenters: Array<[number, number]> = [
        [-halfSpanX, -halfSpanZ],
        [halfSpanX, -halfSpanZ],
        [halfSpanX, halfSpanZ],
        [-halfSpanX, halfSpanZ],
      ];

      legCenters.forEach(([cx, cz], idx) => {
        const legGeom = new THREE.BufferGeometry();
        engine.getExtrusion(legGeom, {
          profilePoints: createRectProfile(cx - lw / 2, cx + lw / 2, cz - ld / 2, cz + ld / 2, 0),
          direction: [0, 1, 0],
          length: lh,
          cap: true,
        });
        this.addMeshPart(group, legGeom, baseMat.clone(), `Table_Leg_${idx + 1}`, "IFCFURNITURE");
      });

      let borderVol = 0;
      if (c.showBorder) {
        const bh = Math.max(0.015, c.borderHeight);
        const bd = Math.max(0.015, c.borderDepth);
        const offset = Math.max(-0.1, Math.min(0.15, c.borderOffset));
        const outerHalfX = pw / 2 + offset + bd;
        const outerHalfZ = pd / 2 + offset + bd;
        const innerHalfX = Math.max(0.1, outerHalfX - bd);
        const innerHalfZ = Math.max(0.1, outerHalfZ - bd);

        const borderGeom = new THREE.BufferGeometry();
        engine.getExtrusion(borderGeom, {
          profilePoints: createRectProfile(-outerHalfX, outerHalfX, -outerHalfZ, outerHalfZ, lh + ph - bh * 0.35),
          profileHoles: [createRectProfile(-innerHalfX, innerHalfX, -innerHalfZ, innerHalfZ, lh + ph - bh * 0.35)],
          direction: [0, 1, 0],
          length: bh,
          cap: true,
        });
        this.addMeshPart(group, borderGeom, borderMat, "Table_Border_Frame", "IFCFURNITURE");
        borderVol = (outerHalfX * 2 * outerHalfZ * 2 - innerHalfX * 2 * innerHalfZ * 2) * bh;
      }

      let triCount = 0;
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const g = (obj as THREE.Mesh).geometry;
          triCount += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        }
      });

      const volumeM3 = pw * ph * pd + 4 * lw * lh * ld + borderVol;

      this.hasGenerated = true;
      this.takeoff = {
        mode: "table",
        partCount: group.children.length,
        triangleCount: Math.round(triCount),
        volumeM3,
        massKg: volumeM3 * 650,
        totalLinearMeters: 2 * (pw + pd) + 4 * lh,
      };
      this.emit(
        `Table built (${this.takeoff.partCount} parts · ${this.takeoff.volumeM3.toFixed(3)} m³ · ${this.takeoff.triangleCount} tris).`
      );

      if (focus) await this.focusPreview();
    } catch (err: any) {
      console.error("[Modeler] Table generation failed:", err);
      this.emit(`Table generation failed: ${err?.message || err}`, "warn");
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }

  /**
   * Structural Rebar & Stirrup Cage Configurator using `getCircularSweep` & `getSweep` fallback.
   */
  private async rebuildRebar(focus = false): Promise<void> {
    this.isBusy = true;
    try {
      const engine = await this.ensureEngine();
      const group = this.ensurePreviewGroup();
      if (!group) {
        this.emit("3D World is not ready yet.", "warn");
        return;
      }
      this.disposePreviewChildren();
      group.position.set(...this.placementOffset);

      const c = this.rebarConfig;
      const w = Math.max(0.2, c.cageWidth);
      const d = Math.max(0.2, c.cageDepth);
      const h = Math.max(0.4, c.cageHeight);
      const hook = Math.max(0.05, c.hookLength);
      const bendR = Math.max(0.02, c.bendRadius);
      const mainR = Math.max(0.004, c.barDiameterMm / 2000);
      const stirrupR = Math.max(0.003, c.stirrupDiameterMm / 2000);
      const count = Math.max(2, Math.min(24, Math.round(c.barCount)));

      const mainProfile = createCircleProfile(mainR, 10);
      const stirrupProfile = createCircleProfile(stirrupR, 8);

      const steelMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.colorHex || "#38bdf8"),
        roughness: 0.32,
        metalness: 0.72,
        side: THREE.DoubleSide,
      });

      const stirrupMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#f59e0b"),
        roughness: 0.38,
        metalness: 0.65,
        side: THREE.DoubleSide,
      });

      let totalLen = 0;
      let totalVol = 0;
      let partIndex = 0;

      const addRebarSweep = (
        directrix: number[],
        profile: number[],
        radiusVal: number,
        mat: THREE.Material,
        closedLoop: boolean,
        label: string
      ) => {
        const perpNormal = computePerpNormal(directrix);
        const geom = new THREE.BufferGeometry();
        engine.getCircularSweep(geom, {
          profilePoints: profile,
          directrix,
          radius: bendR,
          initNormal: perpNormal,
          closed: closedLoop,
        });

        if (!geom.attributes.position || geom.attributes.position.count === 0) {
          engine.getSweep(geom, {
            profilePoints: profile,
            curvePoints: directrix,
            startNormal: perpNormal,
            close: closedLoop,
            optimize: true,
          });
        }

        if (geom.attributes.position && geom.attributes.position.count > 0) {
          this.addMeshPart(group, geom, mat.clone(), label, "IFCREINFORCINGBAR");
          const len =
            polylineLengthMeters(directrix) +
            (closedLoop && directrix.length >= 6
              ? Math.hypot(
                  directrix[directrix.length - 3] - directrix[0],
                  directrix[directrix.length - 2] - directrix[1],
                  directrix[directrix.length - 1] - directrix[2]
                )
              : 0);
          totalLen += len;
          totalVol += len * Math.PI * radiusVal * radiusVal;
        } else {
          geom.dispose();
        }
      };

      if (c.pattern === "bent-bar") {
        const spacing = count > 1 ? w / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
          const x = -w / 2 + i * spacing;
          const directrix = [
            x, 0.04, -d / 2 + hook,
            x, 0.04, -d / 2,
            x, h, -d / 2,
            x, h, d / 2,
            x, Math.min(h * 0.5, 0.04 + hook), d / 2,
          ];
          addRebarSweep(directrix, mainProfile, mainR, steelMat, false, `Rebar_Bent_${++partIndex}`);
        }
      } else {
        const barCoords: Array<[number, number, number, number]> = [];
        if (c.pattern === "spiral-core") {
          const coreR = Math.min(w, d) / 2;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            barCoords.push([Math.cos(a) * coreR, Math.sin(a) * coreR, -Math.cos(a), -Math.sin(a)]);
          }
        } else {
          for (let i = 0; i < count; i++) {
            const t = i / count;
            const perim = 2 * (w + d);
            const s = t * perim;
            let x = -w / 2;
            let z = -d / 2;
            let hx = 0;
            let hz = 1;
            if (s < w) {
              x = -w / 2 + s;
              z = -d / 2;
              hx = 0;
              hz = 1;
            } else if (s < w + d) {
              x = w / 2;
              z = -d / 2 + (s - w);
              hx = -1;
              hz = 0;
            } else if (s < 2 * w + d) {
              x = w / 2 - (s - w - d);
              z = d / 2;
              hx = 0;
              hz = -1;
            } else {
              x = -w / 2;
              z = d / 2 - (s - 2 * w - d);
              hx = 1;
              hz = 0;
            }
            barCoords.push([x, z, hx, hz]);
          }
        }

        for (const [bx, bz, hx, hz] of barCoords) {
          const directrix = [
            bx + hx * hook, 0.04, bz + hz * hook,
            bx, 0.04, bz,
            bx, h, bz,
            bx + hx * hook, h, bz + hz * hook,
          ];
          addRebarSweep(directrix, mainProfile, mainR, steelMat, false, `Rebar_Main_${++partIndex}`);
        }

        if (c.includeStirrups) {
          const step = Math.max(0.08, c.stirrupSpacing);
          const margin = mainR + stirrupR + 0.005;
          const sx = w / 2 + margin;
          const sz = d / 2 + margin;
          for (let y = 0.12; y <= h - 0.1; y += step) {
            if (c.pattern === "spiral-core") {
              const hoopR = Math.min(w, d) / 2 + margin;
              const segs = 16;
              const hoopPts: number[] = [];
              for (let s = 0; s < segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                hoopPts.push(Math.cos(a) * hoopR, y, Math.sin(a) * hoopR);
              }
              addRebarSweep(hoopPts, stirrupProfile, stirrupR, stirrupMat, true, `Stirrup_Hoop_${++partIndex}`);
            } else {
              const stirrupPts = createClosedRectDirectrix(-sx, sx, -sz, sz, y);
              addRebarSweep(stirrupPts, stirrupProfile, stirrupR, stirrupMat, false, `Stirrup_Tie_${++partIndex}`);
            }
          }
        }
      }

      let triCount = 0;
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const g = (obj as THREE.Mesh).geometry;
          triCount += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        }
      });

      this.hasGenerated = true;
      this.takeoff = {
        mode: "rebar",
        partCount: group.children.length,
        triangleCount: Math.round(triCount),
        volumeM3: totalVol,
        massKg: totalVol * 7850,
        totalLinearMeters: totalLen,
      };
      this.emit(
        `Rebar cage built (${this.takeoff.partCount} bars · ${this.takeoff.totalLinearMeters.toFixed(1)} m · ${this.takeoff.massKg.toFixed(1)} kg steel).`
      );

      if (focus) await this.focusPreview();
    } catch (err: any) {
      console.error("[Modeler] Rebar generation failed:", err);
      this.emit(`Rebar generation failed: ${err?.message || err}`, "warn");
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }

  /**
   * Directly replaces the currently selected IFC element's geometry inside its active
   * `FragmentsModel` using inverse global+local sample transform alignment.
   */
  async replaceSelectedElementGeometry(): Promise<boolean> {
    if (!this.selectedTarget) {
      this.emit("Select an IFC element in 3D first before replacing its geometry.", "warn");
      return false;
    }

    if (!this.previewGroup || this.previewGroup.children.length === 0) {
      await this.rebuildActiveAssembly(false);
    }
    const mesh = this.previewGroup?.children[0] as THREE.Mesh | undefined;
    if (!mesh || !mesh.geometry) return false;

    const fragments = this.components.get(OBC.FragmentsManager);
    const model = fragments.list.get(this.selectedTarget.modelId);
    if (!model) {
      this.emit("Target FragmentsModel is no longer loaded.", "warn");
      return false;
    }

    this.isBusy = true;
    try {
      const gtIds = await model.getGlobalTranformsIdsOfItems([this.selectedTarget.localId]);
      if (gtIds.length === 0) {
        this.emit("Selected item has no geometry sample instances to replace.", "warn");
        return false;
      }

      const [gtMap, ltMap, samples] = await Promise.all([
        model.getGlobalTransforms(gtIds),
        model.getLocalTransforms(),
        model.getSamples(),
      ]);

      const gtSet = new Set(gtIds);
      const matchedSamples = [...samples.entries()].filter(([, s]) => gtSet.has(s.item));
      if (matchedSamples.length === 0) {
        this.emit("No sample entries matched the selected IFC element.", "warn");
        return false;
      }

      const [px, py, pz] = this.placementOffset;
      const worldMat = new THREE.Matrix4().makeTranslation(px, py, pz);
      const firstSample = matchedSamples[0][1];
      const gt = gtMap.get(firstSample.item);
      const lt = ltMap.get(firstSample.localTransform);
      const localMat = new THREE.Matrix4();
      if (gt) localMat.multiply(FRAGS.GeomsFbUtils.matrixFromTransform(gt));
      if (lt) localMat.multiply(FRAGS.GeomsFbUtils.matrixFromTransform(lt));
      const invLocal = localMat.clone().invert();
      const targetSpaceMat = invLocal.multiply(worldMat);

      const transformedGeom = mesh.geometry.clone();
      transformedGeom.applyMatrix4(targetSpaceMat);
      const rawRepr = FRAGS.GeomsFbUtils.representationFromGeometry(transformedGeom);
      transformedGeom.dispose();

      const stamp = Date.now();
      const reprTempId = `repr_rep_${stamp}`;
      const matTempId = `mat_rep_${stamp}`;
      const stdMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const hex = stdMat?.color ? `#${stdMat.color.getHexString()}` : "#64748b";
      const { r, g, b } = hexToRgb(hex);

      const requests: FRAGS.EditRequest[] = [
        {
          type: FRAGS.EditRequestType.CREATE_REPRESENTATION,
          tempId: reprTempId,
          data: rawRepr,
        },
        {
          type: FRAGS.EditRequestType.CREATE_MATERIAL,
          tempId: matTempId,
          data: {
            r,
            g,
            b,
            a: 255,
            renderedFaces: FRAGS.RenderedFaces.TWO,
            stroke: FRAGS.Stroke.DEFAULT,
          },
        },
        ...matchedSamples.map(
          ([sampleId, sample]): FRAGS.UpdateSampleRequest => ({
            type: FRAGS.EditRequestType.UPDATE_SAMPLE,
            localId: sampleId,
            data: {
              ...sample,
              representation: reprTempId,
              material: matTempId,
            },
          })
        ),
      ];

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      this.clearPreview(true);
      this.onFragmentModelBaked.trigger(model);
      this.emit(
        `Replaced "${this.selectedTarget.name}" geometry (${matchedSamples.length} sample instance(s) updated).`
      );
      return true;
    } catch (err: any) {
      console.error("[Modeler] Replace selected failed:", err);
      this.emit(`Replace failed: ${err?.message || err}`, "warn");
      return false;
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }

  private buildRequestsFromPreview(group: THREE.Group): FRAGS.EditRequest[] {
    const requests: FRAGS.EditRequest[] = [];
    const stamp = Date.now();
    const ltTempId = `lt_mod_${stamp}`;
    const [px, py, pz] = this.placementOffset;

    requests.push({
      type: FRAGS.EditRequestType.CREATE_LOCAL_TRANSFORM,
      tempId: ltTempId,
      data: {
        position: [0, 0, 0],
        xDirection: [1, 0, 0],
        yDirection: [0, 1, 0],
      },
    });

    let idx = 0;
    for (const obj of group.children) {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) continue;
      idx++;
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const colorHex = mat?.color ? `#${mat.color.getHexString()}` : "#8b5a2b";
      const { r, g, b } = hexToRgb(colorHex);
      const category = String(mesh.userData?.ifcCategory || "IFCBUILDINGELEMENTPROXY");

      const itemTempId = `item_mod_${stamp}_${idx}`;
      const gtTempId = `gt_mod_${stamp}_${idx}`;
      const matTempId = `mat_mod_${stamp}_${idx}`;
      const reprTempId = `repr_mod_${stamp}_${idx}`;
      const sampleTempId = `sample_mod_${stamp}_${idx}`;

      const rawRepr = FRAGS.GeomsFbUtils.representationFromGeometry(mesh.geometry);

      requests.push(
        {
          type: FRAGS.EditRequestType.CREATE_ITEM,
          tempId: itemTempId,
          data: {
            category,
            data: {
              Name: { value: mesh.name || `ParametricPart_${idx}`, type: "IFCLABEL" },
            },
          },
        },
        {
          type: FRAGS.EditRequestType.CREATE_GLOBAL_TRANSFORM,
          tempId: gtTempId,
          data: {
            itemId: itemTempId,
            position: [px, py, pz],
            xDirection: [1, 0, 0],
            yDirection: [0, 1, 0],
          },
        },
        {
          type: FRAGS.EditRequestType.CREATE_MATERIAL,
          tempId: matTempId,
          data: {
            r,
            g,
            b,
            a: 255,
            renderedFaces: FRAGS.RenderedFaces.TWO,
            stroke: FRAGS.Stroke.DEFAULT,
          },
        },
        {
          type: FRAGS.EditRequestType.CREATE_REPRESENTATION,
          tempId: reprTempId,
          data: rawRepr,
        },
        {
          type: FRAGS.EditRequestType.CREATE_SAMPLE,
          tempId: sampleTempId,
          data: {
            item: gtTempId,
            localTransform: ltTempId,
            material: matTempId,
            representation: reprTempId,
          },
        }
      );
    }

    return requests;
  }

  /**
   * Injects the generated parametric assembly directly into an already loaded IFC / FRAG model
   * (undoable via Edit Studio history).
   */
  async insertIntoActiveModel(): Promise<boolean> {
    const fragments = this.components.get(OBC.FragmentsManager);
    const activeModel =
      (this.selectedTarget && fragments.list.get(this.selectedTarget.modelId)) ||
      fragments.list.values().next().value;
    if (!activeModel) {
      this.emit("No loaded IFC / FRAG model in viewport. Use 'Bake .FRAG Model' on Empty projects.", "warn");
      return false;
    }

    if (!this.previewGroup || this.previewGroup.children.length === 0) {
      await this.rebuildActiveAssembly(false);
    }
    if (!this.previewGroup || this.previewGroup.children.length === 0) return false;

    this.isBusy = true;
    this.emit(`Inserting ${this.previewGroup.children.length} parts into "${activeModel.modelId}"...`);
    try {
      const requests = this.buildRequestsFromPreview(this.previewGroup);
      const count = this.previewGroup.children.length;
      await fragments.core.editor.edit(activeModel.modelId, requests);
      await fragments.core.update(true);
      this.clearPreview(true);
      this.onFragmentModelBaked.trigger(activeModel);
      this.emit(`Inserted ${count} parametric parts into "${activeModel.modelId}".`);
      return true;
    } catch (err: any) {
      console.error("[Modeler] Active model insertion failed:", err);
      this.emit(`Insert failed: ${err?.message || err}`, "warn");
      return false;
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }

  /**
   * Creates a standalone editable `.frag` Fragment Model from scratch using
   * `FRAGS.EditUtils.newModel({ raw: true })` (works cleanly in Empty and IFC projects).
   */
  async bakeToFragmentsModel(downloadAfterBake = false): Promise<FRAGS.FragmentsModel | null> {
    if (!this.previewGroup || this.previewGroup.children.length === 0) {
      await this.rebuildActiveAssembly(false);
    }
    if (!this.previewGroup || this.previewGroup.children.length === 0) {
      this.emit("Generate geometry first before baking to .FRAG.", "warn");
      return null;
    }

    const world = this.getWorld();
    if (!world) return null;

    this.isBusy = true;
    this.emit("Authoring parametric geometry into native .FRAG schema...");
    try {
      const fragments = this.components.get(OBC.FragmentsManager);
      if (!fragments.initialized) {
        const workerUrl = await OBC.FragmentsManager.getWorker();
        fragments.init(workerUrl);
      }

      const rawBytes = FRAGS.EditUtils.newModel({ raw: true });
      const label =
        this.mode === "element" ? "Element" : this.mode === "rebar" ? "Rebar" : "Table";
      const modelId = `Parametric_${label}_${Date.now()}`;
      const cam = world.camera?.three as THREE.PerspectiveCamera | THREE.OrthographicCamera;
      const fragModel = await fragments.core.load(rawBytes, { modelId, camera: cam });
      world.scene.three.add(fragModel.object);
      if (cam && typeof fragModel.useCamera === "function") {
        cam.updateMatrixWorld(true);
        fragModel.useCamera(cam);
      }

      const partCount = this.previewGroup.children.length;
      const requests = this.buildRequestsFromPreview(this.previewGroup);

      await fragments.core.editor.edit(fragModel.modelId, requests);
      await fragments.core.editor.save(fragModel.modelId);
      await fragments.core.update(true);

      this.bakedModelId = fragModel.modelId;
      this.clearPreview(true);
      this.onFragmentModelBaked.trigger(fragModel);

      if (downloadAfterBake) {
        const buffer = await fragModel.getBuffer(false);
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fragModel.modelId}.frag`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.emit(`Baked & exported ${fragModel.modelId}.frag (${(buffer.byteLength / 1024).toFixed(1)} KB).`);
      } else {
        this.emit(`Baked ${partCount} part(s) into FragmentsModel "${fragModel.modelId}".`);
      }
      return fragModel;
    } catch (err: any) {
      console.error("[Modeler] Failed baking .FRAG model:", err);
      this.emit(`Bake to .FRAG failed: ${err?.message || err}`, "warn");
      return null;
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }
}
