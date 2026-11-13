import * as THREE from "three";
import * as OBC from "@thatopen/components";

export type MeasurementMode = "length" | "area";

export interface MeasurementRecord {
  id: string;
  mode: MeasurementMode;
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distance: number;
  area?: number;
  formattedText: string;
  line: THREE.Line;
  labelSprite: THREE.Sprite;
  markers: THREE.Mesh[];
  fillMesh?: THREE.Mesh;
}

/**
 * Creates a high-DPI billboard text badge in 3D space
 */
function createDimensionSprite(text: string, accentHex = "#38bdf8"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 94;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "rgba(19, 20, 24, 0.94)";
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3.5;

  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(8, 8, 384, 78, 14);
  } else {
    ctx.rect(8, 8, 384, 78);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 25px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 200, 47);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.8, 0.9, 1);
  return sprite;
}

/**
 * Computes exact 3D polygon area via vector triangle-fan cross products
 */
function computePolygonArea3D(points: THREE.Vector3[]): number {
  if (points.length < 3) return 0;
  const sum = new THREE.Vector3();
  const origin = points[0];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  for (let i = 1; i < points.length - 1; i++) {
    e1.subVectors(points[i], origin);
    e2.subVectors(points[i + 1], origin);
    cross.crossVectors(e1, e2);
    sum.add(cross);
  }
  return 0.5 * sum.length();
}

/**
 * Professional CAD/BIM Real-Time 3D Measurement & Area Takeoff System
 * Integrates directly into That Open Engine World (world.scene.three)
 */
export class BimMeasurementSystem {
  public enabled: boolean = false;
  public mode: MeasurementMode = "length";
  private world: OBC.World;
  private rootGroup = new THREE.Group();
  private records: MeasurementRecord[] = [];

  private activePointA: THREE.Vector3 | null = null;
  private areaPoints: THREE.Vector3[] = [];
  private areaMarkers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;
  private previewMarker: THREE.Mesh | null = null;
  private cursorMarker: THREE.Mesh;

  public onMeasurementChange?: (records: MeasurementRecord[]) => void;

  constructor(_components: OBC.Components, world: OBC.World) {
    this.world = world;
    this.rootGroup.name = "thatopen-measurements-layer";
    this.world.scene.three.add(this.rootGroup);

    const markerGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    this.cursorMarker = new THREE.Mesh(markerGeom, markerMat);
    this.cursorMarker.visible = false;
    this.rootGroup.add(this.cursorMarker);
  }

  public setMode(newMode: MeasurementMode) {
    this.mode = newMode;
    this.cancelPending();
  }

  public setEnabled(active: boolean) {
    this.enabled = active;
    this.cursorMarker.visible = false;
    if (!active) {
      this.cancelPending();
    }
  }

  public cancelPending() {
    this.activePointA = null;
    this.areaPoints = [];
    this.areaMarkers.forEach((m) => {
      this.rootGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.areaMarkers = [];

    if (this.previewLine) {
      this.rootGroup.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
    if (this.previewMarker) {
      this.rootGroup.remove(this.previewMarker);
      this.previewMarker.geometry.dispose();
      (this.previewMarker.material as THREE.Material).dispose();
      this.previewMarker = null;
    }
  }

  public handlePointerMove(hitPoint: THREE.Vector3 | null) {
    if (!this.enabled || !hitPoint) {
      this.cursorMarker.visible = false;
      return;
    }

    this.cursorMarker.visible = true;
    this.cursorMarker.position.copy(hitPoint);

    const activeChain =
      this.mode === "length"
        ? this.activePointA
          ? [this.activePointA, hitPoint]
          : null
        : this.areaPoints.length > 0
        ? [...this.areaPoints, hitPoint]
        : null;

    if (activeChain) {
      if (!this.previewLine) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints(activeChain);
        const lineMat = new THREE.LineDashedMaterial({
          color: this.mode === "area" ? 0x34d399 : 0xf59e0b,
          dashSize: 0.3,
          gapSize: 0.15,
          depthTest: false,
        });
        this.previewLine = new THREE.Line(lineGeom, lineMat);
        this.previewLine.computeLineDistances();
        this.rootGroup.add(this.previewLine);
      } else {
        this.previewLine.geometry.setFromPoints(activeChain);
        this.previewLine.computeLineDistances();
      }
    }
  }

  public commitAreaPolygon(): MeasurementRecord | null {
    if (this.areaPoints.length < 3) return null;

    const pts = [...this.areaPoints];
    const areaSqM = computePolygonArea3D(pts);
    const sqFt = areaSqM * 10.7639;
    const textLabel = `${areaSqM.toFixed(2)} m² (${sqFt.toFixed(1)} sq ft)`;

    const closedPts = [...pts, pts[0]];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(closedPts);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      depthTest: false,
    });
    const permLine = new THREE.Line(lineGeom, lineMat);
    this.rootGroup.add(permLine);

    // Translucent Triangle-Fan Polygon Fill Mesh
    const positions: number[] = [];
    for (let i = 1; i < pts.length - 1; i++) {
      positions.push(
        pts[0].x, pts[0].y + 0.02, pts[0].z,
        pts[i].x, pts[i].y + 0.02, pts[i].z,
        pts[i + 1].x, pts[i + 1].y + 0.02, pts[i + 1].z
      );
    }
    const fillGeom = new THREE.BufferGeometry();
    fillGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const fillMesh = new THREE.Mesh(fillGeom, fillMat);
    this.rootGroup.add(fillMesh);

    const centroid = new THREE.Vector3();
    pts.forEach((p) => centroid.add(p));
    centroid.divideScalar(pts.length);
    centroid.y += 0.65;

    const labelSprite = createDimensionSprite(textLabel, "#10b981");
    labelSprite.position.copy(centroid);
    this.rootGroup.add(labelSprite);

    const record: MeasurementRecord = {
      id: `area-${Date.now()}`,
      mode: "area",
      pointA: pts[0],
      pointB: pts[pts.length - 1],
      distance: 0,
      area: areaSqM,
      formattedText: textLabel,
      line: permLine,
      labelSprite,
      markers: [...this.areaMarkers],
      fillMesh,
    };

    this.records.push(record);
    this.areaMarkers = [];
    this.areaPoints = [];
    if (this.previewLine) {
      this.rootGroup.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }

    if (this.onMeasurementChange) {
      this.onMeasurementChange([...this.records]);
    }
    return record;
  }

  public handleClick(hitPoint: THREE.Vector3): MeasurementRecord | null {
    if (!this.enabled) return null;

    if (this.mode === "area") {
      // Close polygon automatically when clicking near starting vertex with 3+ points
      if (this.areaPoints.length >= 3 && hitPoint.distanceTo(this.areaPoints[0]) < 1.1) {
        return this.commitAreaPolygon();
      }
      this.areaPoints.push(hitPoint.clone());
      const mGeom = new THREE.SphereGeometry(0.14, 16, 16);
      const mMat = new THREE.MeshBasicMaterial({
        color: this.areaPoints.length === 1 ? 0xf59e0b : 0x10b981,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(mGeom, mMat);
      mesh.position.copy(hitPoint);
      this.rootGroup.add(mesh);
      this.areaMarkers.push(mesh);
      return null;
    }

    // Length mode (2 points)
    if (!this.activePointA) {
      this.activePointA = hitPoint.clone();

      const startMarkerGeom = new THREE.SphereGeometry(0.14, 16, 16);
      const startMarkerMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: false });
      this.previewMarker = new THREE.Mesh(startMarkerGeom, startMarkerMat);
      this.previewMarker.position.copy(this.activePointA);
      this.rootGroup.add(this.previewMarker);
      return null;
    }

    const pointA = this.activePointA;
    const pointB = hitPoint.clone();
    const distance = pointA.distanceTo(pointB);

    const formattedMeters = distance.toFixed(2);
    const formattedMm = Math.round(distance * 1000).toLocaleString();
    const textLabel = `${formattedMeters} m (${formattedMm} mm)`;

    const lineGeom = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      depthTest: false,
    });
    const permanentLine = new THREE.Line(lineGeom, lineMat);
    this.rootGroup.add(permanentLine);

    const endMarkerGeom = new THREE.SphereGeometry(0.14, 16, 16);
    const endMarkerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });
    const endMarkerMesh = new THREE.Mesh(endMarkerGeom, endMarkerMat);
    endMarkerMesh.position.copy(pointB);
    this.rootGroup.add(endMarkerMesh);

    const markers = [this.previewMarker!, endMarkerMesh];

    const midPoint = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
    midPoint.y += 0.55;

    const labelSprite = createDimensionSprite(textLabel);
    labelSprite.position.copy(midPoint);
    this.rootGroup.add(labelSprite);

    const record: MeasurementRecord = {
      id: `measure-${Date.now()}`,
      mode: "length",
      pointA,
      pointB,
      distance,
      formattedText: textLabel,
      line: permanentLine,
      labelSprite,
      markers,
    };

    this.records.push(record);

    this.activePointA = null;
    if (this.previewLine) {
      this.rootGroup.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
    this.previewMarker = null;

    if (this.onMeasurementChange) {
      this.onMeasurementChange([...this.records]);
    }

    return record;
  }

  public clearAll() {
    this.cancelPending();
    for (const record of this.records) {
      this.rootGroup.remove(record.line);
      record.line.geometry.dispose();
      (record.line.material as THREE.Material).dispose();

      if (record.fillMesh) {
        this.rootGroup.remove(record.fillMesh);
        record.fillMesh.geometry.dispose();
        (record.fillMesh.material as THREE.Material).dispose();
      }

      this.rootGroup.remove(record.labelSprite);
      if (record.labelSprite.material.map) {
        record.labelSprite.material.map.dispose();
      }
      record.labelSprite.material.dispose();

      record.markers.forEach((m) => {
        this.rootGroup.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
    }
    this.records = [];
    if (this.onMeasurementChange) {
      this.onMeasurementChange([]);
    }
  }

  public dispose() {
    this.clearAll();
    this.world.scene.three.remove(this.rootGroup);
    this.cursorMarker.geometry.dispose();
    (this.cursorMarker.material as THREE.Material).dispose();
  }
}
