import * as OBC from "@thatopen/components";
import { Ion } from "cesium";
import { GISLayer3D } from "./gis-layer-3d";
import { GISLayer2D } from "./gis-layer-2d";

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
