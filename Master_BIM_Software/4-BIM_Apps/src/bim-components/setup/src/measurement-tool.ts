import * as THREE from "three";
import * as OBC from "@thatopen/components";

export interface MeasurementRecord {
  id: string;
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distance: number;
  formattedText: string;
  line: THREE.Line;
  labelSprite: THREE.Sprite;
  markers: THREE.Mesh[];
}

/**
 * Creates a high-DPI billboard text badge in 3D space
 */
function createDimensionSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 90;
  const ctx = canvas.getContext("2d")!;

  // Background rounded pill
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3.5;
  
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(8, 8, 344, 74, 14);
  } else {
    ctx.rect(8, 8, 344, 74);
  }
  ctx.fill();
  ctx.stroke();

  // Text label
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 26px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 180, 45);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

/**
 * Professional CAD/BIM Real-Time 3D Measurement & Dimension System
 * Integrates directly into That Open Engine World (world.scene.three)
 */
export class BimMeasurementSystem {
  public enabled: boolean = false;
  private components: OBC.Components;
  private world: OBC.World;
  private rootGroup = new THREE.Group();
  private records: MeasurementRecord[] = [];

  private activePointA: THREE.Vector3 | null = null;
  private previewLine: THREE.Line | null = null;
  private previewMarker: THREE.Mesh | null = null;
  private cursorMarker: THREE.Mesh;

  public onMeasurementChange?: (records: MeasurementRecord[]) => void;

  constructor(components: OBC.Components, world: OBC.World) {
    this.components = components;
    this.world = world;
    this.rootGroup.name = "thatopen-measurements-layer";
    this.world.scene.three.add(this.rootGroup);

    // Glowing cursor point indicator
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

  public setEnabled(active: boolean) {
    this.enabled = active;
    this.cursorMarker.visible = false;
    if (!active) {
      this.cancelPending();
    }
  }

  public cancelPending() {
    this.activePointA = null;
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

    // If Point A is set, update dynamic guideline
    if (this.activePointA) {
      const points = [this.activePointA, hitPoint];
      if (!this.previewLine) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xf59e0b,
          dashSize: 0.3,
          gapSize: 0.15,
          depthTest: false,
        });
        this.previewLine = new THREE.Line(lineGeom, lineMat);
        this.previewLine.computeLineDistances();
        this.rootGroup.add(this.previewLine);
      } else {
        this.previewLine.geometry.setFromPoints(points);
        this.previewLine.computeLineDistances();
      }
    }
  }

  public handleClick(hitPoint: THREE.Vector3): MeasurementRecord | null {
    if (!this.enabled) return null;

    if (!this.activePointA) {
      // Step 1: Commit Point A
      this.activePointA = hitPoint.clone();

      const startMarkerGeom = new THREE.SphereGeometry(0.14, 16, 16);
      const startMarkerMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: false });
      this.previewMarker = new THREE.Mesh(startMarkerGeom, startMarkerMat);
      this.previewMarker.position.copy(this.activePointA);
      this.rootGroup.add(this.previewMarker);
      return null;
    }

    // Step 2: Commit Point B & Finalize Dimension
    const pointA = this.activePointA;
    const pointB = hitPoint.clone();
    const distance = pointA.distanceTo(pointB);

    const formattedMeters = distance.toFixed(2);
    const formattedMm = Math.round(distance * 1000).toLocaleString();
    const textLabel = `${formattedMeters} m (${formattedMm} mm)`;

    // Dimension Line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      depthTest: false,
    });
    const permanentLine = new THREE.Line(lineGeom, lineMat);
    this.rootGroup.add(permanentLine);

    // End Markers
    const endMarkerGeom = new THREE.SphereGeometry(0.14, 16, 16);
    const endMarkerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false });
    const endMarkerMesh = new THREE.Mesh(endMarkerGeom, endMarkerMat);
    endMarkerMesh.position.copy(pointB);
    this.rootGroup.add(endMarkerMesh);

    const markers = [this.previewMarker!, endMarkerMesh];

    // Midpoint Billboard Text Sprite
    const midPoint = new THREE.Vector3()
      .addVectors(pointA, pointB)
      .multiplyScalar(0.5);
    midPoint.y += 0.55; // Elevate slightly above line

    const labelSprite = createDimensionSprite(textLabel);
    labelSprite.position.copy(midPoint);
    this.rootGroup.add(labelSprite);

    const record: MeasurementRecord = {
      id: `measure-${Date.now()}`,
      pointA,
      pointB,
      distance,
      formattedText: textLabel,
      line: permanentLine,
      labelSprite,
      markers,
    };

    this.records.push(record);

    // Cleanup preview states
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

