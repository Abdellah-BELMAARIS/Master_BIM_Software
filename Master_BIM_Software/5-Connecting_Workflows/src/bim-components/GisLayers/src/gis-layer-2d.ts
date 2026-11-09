import * as OBC from "@thatopen/components";
import {
  Viewer,
  OpenStreetMapImageryProvider,
  UrlTemplateImageryProvider,
  Cartesian3,
  Cartographic,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Math as CesiumMath,
  Entity,
  SceneMode,
  Ion,
} from "cesium";

export type Map2DStyle = "dark" | "osm";

/**
 * Module 5 — Lesson 2.4 & 2.5: GISLayer2D (Pro Edition)
 * High-performance 2D interactive geospatial map using Cesium and OpenStreetMap/CartoDB Dark Matter.
 * Includes map style toggling (Dark Cyber vs OpenStreetMap), real-time telemetry readout chips,
 * and floating interactive navigation controls.
 */
export class GISLayer2D {
  container: HTMLDivElement;
  marker: Entity | null = null;
  viewer: Viewer | null = null;
  mapStyle: Map2DStyle = "dark";

  /**
   * Dispatched whenever user clicks a coordinate on the 2D map
   */
  readonly onCoordinatesSelected = new OBC.Event<{
    latitude: number;
    longitude: number;
  }>();

  private _token: string = "";
  private _eventHandler: ScreenSpaceEventHandler | null = null;
  private _coordBadge: HTMLDivElement | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "gis-map-2d-container";
    this.container.style.width = "100%";
    this.container.style.height = "260px";
    this.container.style.minHeight = "260px";
    this.container.style.borderRadius = "10px";
    this.container.style.overflow = "hidden";
    this.container.style.position = "relative";
    this.container.style.background = "#090d16";
    this.container.style.border = "1px solid rgba(56, 189, 248, 0.35)";
    this.container.style.boxShadow = "inset 0 2px 10px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4)";

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 0.74rem; font-weight: 600; padding: 16px; text-align: center; gap: 8px;">
        <span style="font-size: 1.6rem;">🗺️</span>
        <span style="color: #f8fafc; font-weight: 700;">2D Geospatial Radar</span>
        <span style="color: #64748b; font-size: 0.70rem;">Enter Cesium Ion Token above to activate live map streaming</span>
      </div>
    `;

    // Automatically trigger Cesium canvas resize whenever container becomes visible
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        if (
          this.viewer &&
          !this.viewer.isDestroyed() &&
          this.container.clientWidth > 0 &&
          this.container.clientHeight > 0
        ) {
          this.viewer.resize();
        }
      });
      observer.observe(this.container);
    }
  }

  /**
   * Converts longitude & latitude into Cesium Cartesian3 coordinates
   * and updates the location marker on the 2D map
   */
  updateMarker(latitude: number, longitude: number, flyTo: boolean = false) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const position = Cartesian3.fromDegrees(longitude, latitude);

    if (this.marker) {
      this.marker.position = position as any;
    } else {
      this.marker = this.viewer.entities.add({
        position,
        point: {
          pixelSize: 14,
          color: Color.fromCssColorString("#38bdf8"),
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }

    // Update coordinate badge overlay
    if (this._coordBadge) {
      this._coordBadge.textContent = `📍 ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
    }

    if (flyTo) {
      this.viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(longitude, latitude, 18000),
        duration: 0.6,
      });
    }
  }

  /**
   * Sets the 2D map tile imagery style (Dark Cyber vs OpenStreetMap Standard)
   */
  setMapStyle(style: Map2DStyle) {
    this.mapStyle = style;
    if (!this.viewer || this.viewer.isDestroyed()) return;

    this.viewer.imageryLayers.removeAll();

    if (style === "dark") {
      const darkProvider = new UrlTemplateImageryProvider({
        url: "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
      });
      this.viewer.imageryLayers.addImageryProvider(darkProvider);
    } else {
      const osmProvider = new OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
      });
      this.viewer.imageryLayers.addImageryProvider(osmProvider);
    }
  }

  /**
   * Zoom controls
   */
  zoomIn() {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.viewer.camera.zoomIn(this.viewer.camera.positionCartographic.height * 0.4);
  }

  zoomOut() {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.viewer.camera.zoomOut(this.viewer.camera.positionCartographic.height * 0.4);
  }

  /**
   * Sets up and initializes the 2D Cesium viewer with OpenStreetMap/CartoDB
   */
  init(token: string, initialLat = 51.5007, initialLon = -0.1246) {
    if (!token) return;
    this._token = token;
    Ion.defaultAccessToken = token;

    // 1. Destroy existing viewer to start clean
    if (this.viewer && !this.viewer.isDestroyed()) {
      if (this._eventHandler && !this._eventHandler.isDestroyed()) {
        this._eventHandler.destroy();
        this._eventHandler = null;
      }
      this.viewer.destroy();
      this.viewer = null;
      this.marker = null;
      this._coordBadge = null;
    }

    // 2. Clear out container placeholder
    this.container.innerHTML = "";

    try {
      // 3. Create 2D Viewer with sleek controls
      const viewer = new Viewer(this.container, {
        sceneMode: SceneMode.SCENE2D,
        baseLayerPicker: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        vrButton: false,
        homeButton: false,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        geocoder: true,
      });

      // 4. Set map imagery style
      this.viewer = viewer;
      this.setMapStyle(this.mapStyle);

      // 5. Add marker for initial location
      const initialPos = Cartesian3.fromDegrees(initialLon, initialLat);
      this.marker = viewer.entities.add({
        position: initialPos,
        point: {
          pixelSize: 14,
          color: Color.fromCssColorString("#38bdf8"),
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(initialLon, initialLat, 18000),
      });

      // 6. Setup ScreenSpaceEventHandler to capture user click coordinates
      const handler = new ScreenSpaceEventHandler(viewer.canvas);
      handler.setInputAction((movement: any) => {
        const cartesian = viewer.camera.pickEllipsoid(
          movement.position,
          viewer.scene.globe.ellipsoid
        );
        if (cartesian) {
          const cartographic = Cartographic.fromCartesian(cartesian);
          const longitude = Number(
            CesiumMath.toDegrees(cartographic.longitude).toFixed(5)
          );
          const latitude = Number(
            CesiumMath.toDegrees(cartographic.latitude).toFixed(5)
          );

          if (this.marker) {
            this.marker.position = Cartesian3.fromDegrees(
              longitude,
              latitude
            ) as any;
          }

          if (this._coordBadge) {
            this._coordBadge.textContent = `📍 ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
          }

          console.log(
            `[GISLayer2D] Map clicked at lat: ${latitude}, lon: ${longitude}`
          );
          this.onCoordinatesSelected.trigger({ latitude, longitude });
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      this._eventHandler = handler;

      // 7. Attach floating telemetry chip & mini HUD controls
      const hudOverlay = document.createElement("div");
      hudOverlay.className = "gis-2d-hud-overlay";
      hudOverlay.style.position = "absolute";
      hudOverlay.style.bottom = "8px";
      hudOverlay.style.left = "8px";
      hudOverlay.style.right = "8px";
      hudOverlay.style.display = "flex";
      hudOverlay.style.alignItems = "center";
      hudOverlay.style.justifyContent = "space-between";
      hudOverlay.style.pointerEvents = "none";
      hudOverlay.style.zIndex = "25";

      const badge = document.createElement("div");
      badge.style.padding = "3px 8px";
      badge.style.borderRadius = "6px";
      badge.style.background = "rgba(15, 23, 42, 0.85)";
      badge.style.border = "1px solid rgba(56, 189, 248, 0.3)";
      badge.style.color = "#38bdf8";
      badge.style.fontSize = "0.68rem";
      badge.style.fontWeight = "700";
      badge.style.backdropFilter = "blur(8px)";
      badge.textContent = `📍 ${initialLat.toFixed(4)}°, ${initialLon.toFixed(4)}°`;
      this._coordBadge = badge;

      const controlsGroup = document.createElement("div");
      controlsGroup.style.display = "flex";
      controlsGroup.style.gap = "4px";
      controlsGroup.style.pointerEvents = "auto";

      const zoomInBtn = document.createElement("button");
      zoomInBtn.innerHTML = "+";
      zoomInBtn.title = "Zoom In";
      zoomInBtn.style.width = "24px";
      zoomInBtn.style.height = "24px";
      zoomInBtn.style.borderRadius = "4px";
      zoomInBtn.style.background = "rgba(30, 41, 59, 0.85)";
      zoomInBtn.style.border = "1px solid rgba(148, 163, 184, 0.3)";
      zoomInBtn.style.color = "#f8fafc";
      zoomInBtn.style.fontSize = "13px";
      zoomInBtn.style.fontWeight = "bold";
      zoomInBtn.style.cursor = "pointer";
      zoomInBtn.onclick = () => this.zoomIn();

      const zoomOutBtn = document.createElement("button");
      zoomOutBtn.innerHTML = "−";
      zoomOutBtn.title = "Zoom Out";
      zoomOutBtn.style.width = "24px";
      zoomOutBtn.style.height = "24px";
      zoomOutBtn.style.borderRadius = "4px";
      zoomOutBtn.style.background = "rgba(30, 41, 59, 0.85)";
      zoomOutBtn.style.border = "1px solid rgba(148, 163, 184, 0.3)";
      zoomOutBtn.style.color = "#f8fafc";
      zoomOutBtn.style.fontSize = "13px";
      zoomOutBtn.style.fontWeight = "bold";
      zoomOutBtn.style.cursor = "pointer";
      zoomOutBtn.onclick = () => this.zoomOut();

      controlsGroup.appendChild(zoomInBtn);
      controlsGroup.appendChild(zoomOutBtn);

      hudOverlay.appendChild(badge);
      hudOverlay.appendChild(controlsGroup);
      this.container.appendChild(hudOverlay);

      requestAnimationFrame(() => {
        if (this.viewer && !this.viewer.isDestroyed()) {
          this.viewer.resize();
        }
      });

      console.log(
        "[GISLayer2D] Successfully initialized 2D Cesium OpenStreetMap layer."
      );
    } catch (err) {
      console.error("[GISLayer2D] Failed to initialize 2D viewer:", err);
    }
  }

  /**
   * Cleans up 2D viewer and event handlers to avoid memory leaks
   */
  dispose() {
    if (this._eventHandler && !this._eventHandler.isDestroyed()) {
      this._eventHandler.destroy();
      this._eventHandler = null;
    }
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
      this.viewer = null;
    }
    this.marker = null;
    this._coordBadge = null;
    this.onCoordinatesSelected.reset();
  }
}
