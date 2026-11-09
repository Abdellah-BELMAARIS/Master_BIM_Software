import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

/**
 * Module 5 — Lesson 2.2: Creating the GIS Screen
 * UI panel for Cesium Ion geospatial integration:
 * - Cesium Ion API token input
 * - GIS layer toggle (on/off)
 * - Georeferencing coordinates (Longitude: -180 to 180, Latitude: -90 to 90)
 * - Camera range slider (up to 10 km)
 * - Map orientation / rotation (0 to 360 degrees)
 */
export interface GISState {
  components: OBC.Components;
  token?: string;
  enabled?: boolean;
  longitude?: number;
  latitude?: number;
  cameraRange?: number;
  rotation?: number;
}

export type GisSectionState = GISState;

export const gisTemplate: BUI.StatefullComponent<GISState> = (
  state: GISState,
  update
) => {
  const { components } = state;

  // Initial values with fallback to environment token or standard coordinates
  let currentToken =
    state.token ||
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env?.VITE_CESIUM_ION_TOKEN) ||
    "";
  let isEnabled = state.enabled ?? false;
  let longitude = state.longitude ?? 0;
  let latitude = state.latitude ?? 0;
  let cameraRange = state.cameraRange ?? 5; // km (max 10 km)
  let rotation = state.rotation ?? 0; // degrees

  // Event handlers (logging to console for Lesson 2.2, ready for Cesium logic in Lesson 2.3)
  const onTokenChange = (e: Event) => {
    const input = e.target as BUI.TextInput;
    currentToken = input.value || "";
    console.log("[GIS UI] Cesium token updated:", currentToken ? `${currentToken.slice(0, 12)}...` : "(empty)");
  };

  const onGisToggle = (e: Event) => {
    const btn = e.currentTarget as BUI.Button;
    isEnabled = !isEnabled;
    if (btn) {
      btn.active = isEnabled;
    }
    console.log("[GIS UI] GIS Layer toggled:", isEnabled ? "ENABLED" : "DISABLED");
    update();
  };

  const onLongitudeChange = (e: Event) => {
    const input = e.target as BUI.NumberInput;
    longitude = Number(input.value);
    console.log("[GIS UI] Longitude changed:", longitude);
  };

  const onLatitudeChange = (e: Event) => {
    const input = e.target as BUI.NumberInput;
    latitude = Number(input.value);
    console.log("[GIS UI] Latitude changed:", latitude);
  };

  const onCameraRangeChange = (e: Event) => {
    const input = e.target as BUI.NumberInput;
    cameraRange = Number(input.value);
    console.log("[GIS UI] Camera range changed (km):", cameraRange);
  };

  const onRotationChange = (e: Event) => {
    const input = e.target as BUI.NumberInput;
    rotation = Number(input.value);
    console.log("[GIS UI] Map rotation changed (deg):", rotation);
  };

  return BUI.html`
    <bim-panel-section
      label="GIS & Geospatial Environment"
      icon="material-symbols:public"
      fixed
      style="display: flex; flex-direction: column; gap: 14px; height: 100%; overflow-y: auto; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.25); padding: 14px; box-sizing: border-box;"
    >
      <!-- Row 1: Layer Toggle & Cesium Ion Token -->
      <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
        <bim-button
          @click=${onGisToggle}
          .active=${isEnabled}
          icon="material-symbols:layers-outline"
          label=${isEnabled ? "GIS Active" : "GIS Off"}
          style="flex: 0 0 auto; --bim-button-background: ${isEnabled ? "rgba(16, 185, 129, 0.3)" : "rgba(51, 65, 85, 0.45)"}; border: 1px solid ${isEnabled ? "#10b981" : "rgba(148, 163, 184, 0.3)"};"
        ></bim-button>

        <bim-text-input
          label="Cesium Ion Token"
          placeholder="Paste Cesium Ion JWT token..."
          .value=${currentToken}
          @input=${onTokenChange}
          style="flex: 1;"
        ></bim-text-input>
      </div>

      <!-- Row 2: Geographic Coordinates (Longitude & Latitude) -->
      <div style="display: flex; gap: 10px; width: 100%;">
        <bim-number-input
          label="Longitude (°)"
          .value=${longitude}
          min="-180"
          max="180"
          step="0.0001"
          @change=${onLongitudeChange}
          style="flex: 1;"
        ></bim-number-input>

        <bim-number-input
          label="Latitude (°)"
          .value=${latitude}
          min="-90"
          max="90"
          step="0.0001"
          @change=${onLatitudeChange}
          style="flex: 1;"
        ></bim-number-input>
      </div>

      <!-- Row 3: Camera Range (Max 10 km) -->
      <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
        <bim-number-input
          slider
          label="Camera Range (km)"
          pref="km"
          .value=${cameraRange}
          min="0.5"
          max="10"
          step="0.5"
          @change=${onCameraRangeChange}
          style="width: 100%;"
        ></bim-number-input>
      </div>

      <!-- Row 4: Map Rotation -->
      <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
        <bim-number-input
          slider
          label="Map Rotation (°)"
          pref="°"
          .value=${rotation}
          min="0"
          max="360"
          step="1"
          @change=${onRotationChange}
          style="width: 100%;"
        ></bim-number-input>
      </div>

      <!-- Status Helper Info Box -->
      <div
        style="
          margin-top: auto;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px dashed rgba(56, 189, 248, 0.3);
          font-size: 0.75rem;
          color: #94a3b8;
          line-height: 1.4;
        "
      >
        <span style="color: #38bdf8; font-weight: 600;">Geospatial Context:</span>
        Streams 3D Tiles, Cesium World Terrain, and photorealistic context around your BIM IFC models.
      </div>
    </bim-panel-section>
  `;
};

// Aliases matching course naming conventions
export const gisSectionTemplate = gisTemplate;

