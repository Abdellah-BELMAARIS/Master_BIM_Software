import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";

export type ModelerMode = "table" | "rebar";
export type RebarPattern = "column-cage" | "bent-bar" | "spiral-core";

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

const createCircleProfile = (radius: number, segments = 10): number[] => {
  const pts: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    pts.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }
  return pts;
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

/**
 * Module 6 (Lessons 2.5 – 2.7 + Rebar Assignment): Pro Parametric BIM Modeler Component.
 * Wraps `@thatopen/fragments`'s WASM-backed `GeometryEngine` (`web-ifc`) for real-time
 * parametric extrusions (with boolean profile holes), circular sweeps, structural rebar cages,
 * live material controls, engineering quantity takeoff, and raw `.frag` model authoring.
 */
export class Modeler extends OBC.Component {
  static uuid = "7c4a1290-5b8d-41b3-9d0a-3a91c8f6e104" as const;
  enabled = true;

  readonly onStateChanged = new OBC.Event<void>();
  readonly onFragmentModelBaked = new OBC.Event<FRAGS.FragmentsModel>();

  mode: ModelerMode = "table";
  tableConfig: TableModelConfig = { ...DEFAULT_TABLE_CONFIG };
  rebarConfig: RebarModelConfig = { ...DEFAULT_REBAR_CONFIG };
  takeoff: ModelerTakeoff | null = null;
  bakedModelId: string | null = null;
  isEngineReady = false;
  isBusy = false;
  hasGenerated = false;
  statusMessage = "Choose Table (2.5–2.7) or Rebar (Assignment) and generate live WASM BIM geometry.";
  statusTone: "info" | "warn" = "info";

  private ifcApi: WEBIFC.IfcAPI | null = null;
  private geometryEngine: FRAGS.GeometryEngine | null = null;
  private engineInitPromise: Promise<FRAGS.GeometryEngine> | null = null;
  private previewGroup: THREE.Group | null = null;

  constructor(components: OBC.Components) {
    super(components);
    components.add(Modeler.uuid, this);
  }

  private emit(msg?: string, tone: "info" | "warn" = "info") {
    if (msg !== undefined) {
      this.statusMessage = msg;
      this.statusTone = tone;
    }
    this.onStateChanged.trigger();
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

  async setMode(nextMode: ModelerMode): Promise<void> {
    this.mode = nextMode;
    this.emit();
    await this.rebuildActiveAssembly(true);
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
    if (this.mode === "table") {
      await this.rebuildTable(focus);
    } else {
      await this.rebuildRebar(focus);
    }
  }

  async focusPreview(): Promise<void> {
    const world = this.getWorld();
    if (!world || !this.previewGroup || this.previewGroup.children.length === 0) return;
    const controls = (world.camera as { controls?: { fitToBox: Function } })?.controls;
    if (!controls) return;
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

  clearPreview(): void {
    this.disposePreviewChildren();
    this.takeoff = null;
    this.hasGenerated = false;
    this.emit("Cleared parametric preview geometry from viewport.");
  }

  /**
   * Lesson 2.5 – 2.7: Parametric Table + Corner Legs + Hollow Border Extrusion.
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

      // 1. Tabletop panel extruded upward along +Y starting at legHeight
      const panelGeom = new THREE.BufferGeometry();
      engine.getExtrusion(panelGeom, {
        profilePoints: createRectProfile(-pw / 2, pw / 2, -pd / 2, pd / 2, lh),
        direction: [0, 1, 0],
        length: ph,
        cap: true,
      });
      this.addMeshPart(group, panelGeom, baseMat, "Table_Panel", "IFCFURNITURE");

      // 2. Four corner legs extruded from ground Y=0 up to legHeight
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

      // 3. Perimeter Trim / Border using GeometryEngine Extrusion with `profileHoles` (Lesson 2.7)
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

      const panelVol = pw * ph * pd;
      const legsVol = 4 * lw * lh * ld;
      const volumeM3 = panelVol + legsVol + borderVol;

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
        `Table generated (${this.takeoff.partCount} parts · ${this.takeoff.volumeM3.toFixed(3)} m³ · ${this.takeoff.triangleCount} tris).`
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
   * Lesson 2.7 Assignment: Pro Structural Rebar & Stirrup Cage Configurator
   * built with `FRAGS.GeometryEngine.getCircularSweep`.
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

      const c = this.rebarConfig;
      const w = Math.max(0.2, c.cageWidth);
      const d = Math.max(0.2, c.cageDepth);
      const h = Math.max(0.5, c.cageHeight);
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
        closed: boolean,
        label: string
      ) => {
        const geom = new THREE.BufferGeometry();
        engine.getCircularSweep(geom, {
          profilePoints: profile,
          directrix,
          radius: bendR,
          initNormal: [1, 0, 0],
          closed,
        });
        this.addMeshPart(group, geom, mat.clone(), label, "IFCREINFORCINGBAR");
        const len = polylineLengthMeters(directrix) + (closed ? Math.hypot(directrix[directrix.length - 3] - directrix[0], directrix[directrix.length - 2] - directrix[1], directrix[directrix.length - 1] - directrix[2]) : 0);
        totalLen += len;
        totalVol += len * Math.PI * radiusVal * radiusVal;
      };

      if (c.pattern === "bent-bar") {
        const spacing = count > 1 ? w / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
          const x = -w / 2 + i * spacing;
          // Seismic U/L bent bar with bottom base leg + vertical riser + top hook
          const directrix = [
            x, 0.04, -d / 2 + hook,
            x, 0.04, -d / 2,
            x, h, -d / 2,
            x, h, -d / 2 + d,
            x, 0.04 + hook * 0.5, -d / 2 + d,
          ];
          addRebarSweep(directrix, mainProfile, mainR, steelMat, false, `Rebar_Bent_${++partIndex}`);
        }
      } else {
        // Compute perimeter coordinates around rectangle (column-cage) or circle (spiral-core)
        const barCoords: Array<[number, number, number, number]> = [];
        if (c.pattern === "spiral-core") {
          const coreR = Math.min(w, d) / 2;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const x = Math.cos(a) * coreR;
            const z = Math.sin(a) * coreR;
            barCoords.push([x, z, -Math.cos(a), -Math.sin(a)]);
          }
        } else {
          // Distribute `count` bars evenly around the rectangular cage perimeter (corners first)
          for (let i = 0; i < count; i++) {
            const t = i / count;
            const perim = 2 * (w + d);
            let s = t * perim;
            let x = -w / 2;
            let z = -d / 2;
            let hx = 1;
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

        // Main longitudinal bars with bottom anchorage bend + top 90-degree hook
        for (const [bx, bz, hx, hz] of barCoords) {
          const directrix = [
            bx + hx * hook, 0.04, bz + hz * hook,
            bx, 0.04, bz,
            bx, h, bz,
            bx + hx * hook, h, bz + hz * hook,
          ];
          addRebarSweep(directrix, mainProfile, mainR, steelMat, false, `Rebar_Main_${++partIndex}`);
        }

        // Transverse Stirrups / Ties
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
              const stirrupPts = createRectProfile(-sx, sx, -sz, sz, y);
              addRebarSweep(stirrupPts, stirrupProfile, stirrupR, stirrupMat, true, `Stirrup_Tie_${++partIndex}`);
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
        `Rebar cage generated (${this.takeoff.partCount} bars · ${this.takeoff.totalLinearMeters.toFixed(1)} m · ${this.takeoff.massKg.toFixed(1)} kg steel).`
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
   * Bakes the current GeometryEngine Three.js assembly into a real editable `.frag`
   * Fragment Model using `FRAGS.EditUtils.newModel({ raw: true })` and Edits API requests.
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
      const modelId = `Parametric_${this.mode === "table" ? "Table" : "Rebar"}_${Date.now()}`;
      const cam = world.camera?.three as THREE.PerspectiveCamera | THREE.OrthographicCamera;
      const fragModel = await fragments.core.load(rawBytes, { modelId, camera: cam });
      world.scene.three.add(fragModel.object);
      if (cam && typeof fragModel.useCamera === "function") {
        cam.updateMatrixWorld(true);
        fragModel.useCamera(cam);
      }

      const requests: FRAGS.EditRequest[] = [];
      const ltTempId = `lt_identity_${Date.now()}`;
      requests.push({
        type: FRAGS.EditRequestType.CREATE_LOCAL_TRANSFORM,
        tempId: ltTempId,
        data: {
          position: [0, 0, 0],
          xDirection: [1, 0, 0],
          yDirection: [0, 1, 0],
        },
      });

      const stamp = Date.now();
      let idx = 0;
      for (const obj of this.previewGroup.children) {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) continue;
        idx++;
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        const colorHex = mat?.color ? `#${mat.color.getHexString()}` : "#8b5a2b";
        const { r, g, b } = hexToRgb(colorHex);
        const category = String(mesh.userData?.ifcCategory || "IFCBUILDINGELEMENTPROXY");

        const itemTempId = `item_${stamp}_${idx}`;
        const gtTempId = `gt_${stamp}_${idx}`;
        const matTempId = `mat_${stamp}_${idx}`;
        const reprTempId = `repr_${stamp}_${idx}`;
        const sampleTempId = `sample_${stamp}_${idx}`;

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
              position: [0, 0, 0],
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

      await fragments.core.editor.edit(fragModel.modelId, requests);
      await fragments.core.editor.save(fragModel.modelId);
      await fragments.core.update(true);

      this.bakedModelId = fragModel.modelId;
      this.clearPreview();
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
        this.emit(`Baked ${idx} part(s) into native FragmentsModel "${fragModel.modelId}".`);
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
