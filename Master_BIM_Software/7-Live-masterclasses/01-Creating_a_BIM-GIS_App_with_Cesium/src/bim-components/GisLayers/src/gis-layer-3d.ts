import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Ion } from "cesium";
import { TilesRenderer } from "3d-tiles-renderer";
import {
  CesiumIonAuthPlugin,
  TileCompressionPlugin,
  GLTFExtensionsPlugin,
  ReorientationPlugin,
  UpdateOnChangePlugin,
  UnloadTilesPlugin,
} from "3d-tiles-renderer/plugins";

export type GisAssetType = "google" | "osm" | "terrain";

export interface GisAssetInfo {
  id: string;
  name: string;
  description: string;
  type: GisAssetType;
}

export const GIS_ASSET_OPTIONS: Record<GisAssetType, GisAssetInfo> = {
  google: {
    id: "2275207",
    name: "Google Photorealistic 3D Tiles",
    description: "Realistic photographic 3D city textures, trees, river and landmarks (Matches Course Video)",
    type: "google",
  },
  osm: {
    id: "96188",
    name: "Cesium OSM Buildings",
    description: "Architectural white massing polygonal meshes",
    type: "osm",
  },
  terrain: {
    id: "1",
    name: "Cesium World Terrain",
    description: "Global high-resolution topographic terrain relief",
    type: "terrain",
  },
};

/**
 * Module 5 — Lesson 2.3, 2.4 & 2.5: GISLayer3D (Pro Edition)
 * High-fidelity 3D geospatial engine streaming Cesium Ion & Google Photorealistic 3D Tiles
 * with precision georeferencing, elevation offset alignment, camera presets, and cinematic orbit.
 */
export class GISLayer3D {
  latitude: number = 51.5007; // Default London Westminster (matches lesson video)
  longitude: number = -0.1246;
  rotation: number = 0; // Degrees (0 - 360)
  elevation: number = 0; // Elevation / Altitude offset in meters
  assetId: string = "2275207"; // Default: Google Photorealistic 3D Tiles

  isOrbiting: boolean = false;

  private _components: OBC.Components;
  private _tiles: TilesRenderer | null = null;
  private _reorientPlugin: ReorientationPlugin | null = null;
  private _enabled: boolean = false;
  private _initialized: boolean = false;
  private _isUpdating: boolean = false;
  private _token: string = "";
  private _orbitAnimationId: number | null = null;

  constructor(components: OBC.Components) {
    this._components = components;
  }

  private getWorld(): OBC.World | undefined {
    const worlds = this._components.get(OBC.Worlds);
    return [...worlds.list.values()][0];
  }

  /**
   * Updates tile streaming and LOD based on camera position and viewport resolution.
   * Throttled via requestAnimationFrame so zooming in/out never drops frames.
   */
  update() {
    if (this._isUpdating) return;
    const world = this.getWorld();
    if (!world || !this._tiles) return;

    this._isUpdating = true;
    requestAnimationFrame(() => {
      this._isUpdating = false;
      if (!this._enabled || !this._tiles) return;

      const camera = world.camera?.three as THREE.PerspectiveCamera;
      const renderer = world.renderer?.three as THREE.WebGLRenderer;

      if (camera && renderer) {
        this._tiles.setCamera(camera);
        this._tiles.setResolutionFromRenderer(camera, renderer);
      }
      this._tiles.update();
    });
  }

  /**
   * Focuses the camera onto the active 3D geospatial terrain with smooth animated transition
   */
  async focusTerrain(preset: "iso" | "plan" | "front" = "iso") {
    this.stopOrbit();
    const world = this.getWorld();
    if (!world || !world.camera || !(world.camera as any).controls) return;
    const controls = (world.camera as any).controls;

    if (preset === "plan") {
      // Top-down bird's eye view
      await controls.setLookAt(0, 750, 0.01, 0, this.elevation, 0, true);
    } else if (preset === "front") {
      // Street / human eye-level perspective
      await controls.setLookAt(0, 40 + this.elevation, 380, 0, 15 + this.elevation, 0, true);
    } else {
      // 3D ISO Axonometric Overview matching That Open Company course video framing
      await controls.setLookAt(220, 210 + this.elevation, 260, 0, 15 + this.elevation, 0, true);
    }
    this.update();
  }

  /**
   * Toggles 360-degree continuous cinematic orbit around the current georeferenced location
   */
  toggleOrbit(): boolean {
    if (this.isOrbiting) {
      this.stopOrbit();
    } else {
      this.startOrbit();
    }
    return this.isOrbiting;
  }

  startOrbit() {
    this.isOrbiting = true;
    const world = this.getWorld();
    if (!world || !world.camera || !(world.camera as any).controls) return;
    const controls = (world.camera as any).controls;

    let angle = 0;
    const radius = 320;
    const height = 180 + this.elevation;
    const speed = 0.004;

    const animate = () => {
      if (!this.isOrbiting) return;
      angle += speed;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      controls.setLookAt(x, height, z, 0, 15 + this.elevation, 0, false);
      this.update();
      this._orbitAnimationId = requestAnimationFrame(animate);
    };

    this._orbitAnimationId = requestAnimationFrame(animate);
  }

  stopOrbit() {
    this.isOrbiting = false;
    if (this._orbitAnimationId !== null) {
      cancelAnimationFrame(this._orbitAnimationId);
      this._orbitAnimationId = null;
    }
  }

  /**
   * Switches the active Cesium Ion 3D Tiles asset and re-initializes streaming
   */
  setAsset(assetId: string) {
    if (this.assetId === assetId && this._tiles) return;
    this.assetId = assetId;
    console.log(`[GISLayer3D] Switched 3D Tiles asset to: ${assetId}`);
    if (this._token) {
      this.init(this._token);
    }
  }

  /**
   * Initializes or re-initializes the Cesium Ion 3D Tiles renderer
   */
  init(token?: string) {
    if (token) this._token = token;
    if (!this._token) {
      console.warn("[GISLayer3D] Cannot initialize without Cesium Ion token.");
      return;
    }

    // Ensure clean state: dispose previous tiles renderer if any
    if (this._tiles) {
      if (this._tiles.group.parent) {
        this._tiles.group.parent.remove(this._tiles.group);
      }
      this._tiles.dispose();
      this._tiles = null;
      this._reorientPlugin = null;
    }

    const world = this.getWorld();
    if (!world) {
      console.warn("[GISLayer3D] World not ready yet.");
      return;
    }

    // 1. Tell Cesium our Ion token
    Ion.defaultAccessToken = this._token;

    // 2. Set up Draco Loader for compressed geometry decompression
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/resources/draco/");

    // 3. Instantiate 3D Tiles Renderer with high-performance memory limits
    const tiles = new TilesRenderer();
    tiles.errorTarget = 12; // Prevents loading overwhelming micro-tiles during deep zoom
    tiles.maxDepth = 20;

    // 4. Create ReorientationPlugin to place specified lat/lon at the Three.js origin
    this._reorientPlugin = new ReorientationPlugin({
      lat: THREE.MathUtils.degToRad(this.latitude),
      lon: THREE.MathUtils.degToRad(this.longitude),
      height: this.elevation,
      azimuth: THREE.MathUtils.degToRad(this.rotation),
      up: "+y",
    });

    // 5. Register required plugins:
    // - CesiumIonAuthPlugin: authenticates with Cesium Ion
    // - GLTFExtensionsPlugin: Draco decompression
    // - ReorientationPlugin: positions tiles relative to given lat/lon & altitude
    // - TileCompressionPlugin: decompressed tiles
    // - UpdateOnChangePlugin: triggers updates on camera changes
    // - UnloadTilesPlugin: automatically evicts out-of-view tiles to maintain smooth 60 FPS
    tiles.registerPlugin(new CesiumIonAuthPlugin({ apiToken: this._token, assetId: this.assetId }));
    tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader }));
    tiles.registerPlugin(this._reorientPlugin);
    tiles.registerPlugin(new TileCompressionPlugin());
    tiles.registerPlugin(new UpdateOnChangePlugin());
    tiles.registerPlugin(new UnloadTilesPlugin({ bytesTarget: 180 * 1024 * 1024, delay: 800 }));

    // 6. Provide camera & resolution context
    const camera = world.camera.three as THREE.PerspectiveCamera;
    const renderer = world.renderer.three as THREE.WebGLRenderer;
    if (camera && renderer) {
      tiles.setCamera(camera);
      tiles.setResolutionFromRenderer(camera, renderer);
    }

    // 7. Hook camera control events
    if (world.camera && (world.camera as any).controls) {
      (world.camera as any).controls.addEventListener("update", () => {
        if (this._enabled && this._tiles) {
          this.update();
        }
      });
    }

    this._tiles = tiles;

    // 8. If already enabled, add tiles to the scene immediately
    if (this._enabled) {
      world.scene.three.add(tiles.group);
      this.update();
    }

    this._initialized = true;
    console.log(`[GISLayer3D] Successfully initialized 3D Tiles layer with Asset ${this.assetId}.`);
  }

  /**
   * Toggle visibility of 3D tiles in the Three.js scene
   */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    if (this._enabled === value) return;
    this._enabled = value;

    const world = this.getWorld();
    if (!world) return;

    if (value) {
      if (!this._initialized && this._token) {
        this.init(this._token);
      }
      if (this._tiles) {
        world.scene.three.add(this._tiles.group);
        this.update();
      }
    } else {
      this.stopOrbit();
      if (this._tiles && this._tiles.group.parent) {
        this._tiles.group.parent.remove(this._tiles.group);
      }
    }
  }

  /**
   * Updates georeferencing location coordinates, elevation and rotation
   */
  setLocation(lat: number, lon: number, rot?: number, elevation?: number) {
    this.latitude = lat;
    this.longitude = lon;
    if (rot !== undefined) this.rotation = rot;
    if (elevation !== undefined) this.elevation = elevation;

    if (this._reorientPlugin && this._tiles) {
      this._reorientPlugin.transformLatLonHeightToOrigin(
        THREE.MathUtils.degToRad(lat),
        THREE.MathUtils.degToRad(lon),
        this.elevation,
        THREE.MathUtils.degToRad(this.rotation)
      );
      this.update();
    }
  }

  /**
   * Sets ground level elevation offset (in meters) to align BIM model with GIS terrain
   */
  setElevation(elevation: number) {
    this.elevation = elevation;
    this.setLocation(this.latitude, this.longitude, this.rotation, elevation);
  }

  /**
   * Memory cleanup
   */
  dispose() {
    this.stopOrbit();
    if (this._tiles) {
      if (this._tiles.group.parent) {
        this._tiles.group.parent.remove(this._tiles.group);
      }
      this._tiles.dispose();
      this._tiles = null;
      this._reorientPlugin = null;
    }
    this._initialized = false;
  }
}
