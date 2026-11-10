import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { Ion } from "cesium";
import { GISLayer3D } from "./gis-layer-3d";
import { GISLayer2D } from "./gis-layer-2d";

export interface BimSiteAlignment {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  headingDeg: number;
}

/**
 * Module 5 — Lesson 2.3, 2.4 & 2.5: GISLayers BIM Component (Pro Edition)
 * Globally accessible That Open Engine component managing Cesium Ion authentication,
 * 3D geospatial photorealistic tiles (Google 3D & Cesium OSM), and the 2D OpenStreetMap / CartoDB Dark
 * interactive georeferencing navigation map with elevation offset and cinematic orbit.
 */
export class GISLayers extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "c345a901-b4f2-45e7-9d8a-6b89104c990a";
  enabled = true;

  readonly onDisposed = new OBC.Event<void>();

  layer3d: GISLayer3D;
  layer2d: GISLayer2D;
  bimAlignment: BimSiteAlignment = {
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    headingDeg: 0,
  };
  private _token?: string;

  constructor(components: OBC.Components) {
    super(components);
    components.add(GISLayers.uuid, this);

    // Tell Cesium where to look for static assets
    if (typeof window !== "undefined") {
      (window as any).CESIUM_BASE_URL = "/resources/cesium/";
    }

    this.layer3d = new GISLayer3D(components);
    this.layer2d = new GISLayer2D();

    // Subscribe to 2D map coordinate clicks -> update 3D GIS layer instantly!
    this.layer2d.onCoordinatesSelected.add(({ latitude, longitude }) => {
      this.layer3d.setLocation(latitude, longitude);
    });
  }

  /**
   * Synchronizes georeferencing location coordinates across both 3D scene and 2D map
   */
  setLocation(
    latitude: number,
    longitude: number,
    rotation?: number,
    elevation?: number
  ) {
    this.layer3d.setLocation(latitude, longitude, rotation, elevation);
    this.layer2d.updateMarker(latitude, longitude, true);
  }

  /**
   * Sets ground elevation offset for BIM model leveling
   */
  setElevation(elevation: number) {
    this.layer3d.setElevation(elevation);
  }

  /**
   * Toggles 360 cinematic orbit
   */
  toggleOrbit(): boolean {
    return this.layer3d.toggleOrbit();
  }

  /**
   * Aligns active IFC/Fragment models & 3D twin groups onto the Cesium terrain site origin
   */
  alignBimModels(partial: Partial<BimSiteAlignment>) {
    this.bimAlignment = { ...this.bimAlignment, ...partial };
    const { offsetX, offsetY, offsetZ, headingDeg } = this.bimAlignment;
    const rad = THREE.MathUtils.degToRad(headingDeg);

    const fragments = this.components.get(OBC.FragmentsManager);
    if (fragments.initialized && fragments.list.size > 0) {
      for (const [, model] of fragments.list) {
        if (!model?.object) continue;
        model.object.position.set(offsetX, offsetY, offsetZ);
        model.object.rotation.y = rad;
      }
      fragments.core.update(true);
    }

    const worlds = this.components.get(OBC.Worlds);
    const firstWorld = [...worlds.list.values()][0];
    if (firstWorld?.scene?.three) {
      for (const child of firstWorld.scene.three.children) {
        if (
          child instanceof THREE.Group &&
          !child.name.includes("grid") &&
          !child.name.includes("measurements") &&
          !child.name.includes("selection") &&
          child.name !== "fragments" &&
          !child.children.some((c: any) => c.isTilesGroup)
        ) {
          // Only transform non-Cesium architectural project groups
          if (child.name.includes("twin") || child.name.includes("project") || child.name.includes("env")) {
            child.position.set(offsetX, offsetY, offsetZ);
            child.rotation.y = rad;
          }
        }
      }
    }
  }

  /**
   * Computes Fragment model bounding box and snaps its bottom center to the GIS terrain origin
   */
  snapBimToTerrain() {
    const boxer = this.components.get(OBC.BoundingBoxer);
    boxer.list.clear();
    boxer.addFromModels();
    const box = boxer.get();
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      const curr = this.bimAlignment;
      this.alignBimModels({
        offsetX: Number((curr.offsetX - center.x).toFixed(2)),
        offsetY: Number((curr.offsetY - box.min.y).toFixed(2)),
        offsetZ: Number((curr.offsetZ - center.z).toFixed(2)),
      });
    }
  }

  resetBimAlignment() {
    this.alignBimModels({ offsetX: 0, offsetY: 0, offsetZ: 0, headingDeg: 0 });
  }

  /**
   * Strict getter: throws if token is missing
   */
  get token(): string {
    if (!this._token) {
      throw new Error(
        "[GISLayers] Cesium token is missing. Please enter your Cesium Ion API token in the GIS panel."
      );
    }
    return this._token;
  }

  /**
   * Setter: passes token to Cesium and updates both 3D and 2D layers automatically
   */
  set token(value: string) {
    this._token = value;
    Ion.defaultAccessToken = value;
    this.layer3d.init(value);
    this.layer2d.init(value, this.layer3d.latitude, this.layer3d.longitude);
  }

  dispose() {
    this.layer3d.dispose();
    this.layer2d.dispose();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}

export * from "./gis-layer-3d";
export * from "./gis-layer-2d";
