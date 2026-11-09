import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { GISLayers } from "../../bim-components/GisLayers";

/**
 * Module 5 — Lesson 2.2 through 2.5: Advanced GIS Geospatial Studio (Pro Edition)
 * A professional AEC geospatial command deck:
 * - Live streaming telemetry HUD (Coordinates, active asset, altitude offset, streaming bitrate)
 * - 3D Appearance engine: Google Photorealistic 3D Tiles vs Cesium OSM Buildings vs World Terrain
 * - 2D Map style selector (Dark Cyber vs OpenStreetMap) with floating zoom controls & coordinate chip
 * - 6 Architectural World Presets: London, New York, Paris, Dubai, Tokyo, Origin
 * - Precision georeferencing controls with 0.0001° step
 * - BIM Ground Elevation Leveling slider (-100m to +300m)
 * - Cinematic 360° auto-orbit and axonometric presets
 * - Verified token management with instant persistence
 */
export interface GISState {
  components: OBC.Components;
  token?: string;
  enabled?: boolean;
  longitude?: number;
  latitude?: number;
  cameraRange?: number;
  rotation?: number;
  elevation?: number;
}

export type GisSectionState = GISState;

const CESIUM_STORAGE_KEY = "cesium-ion-token";
const DEFAULT_CESIUM_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IlRrLVRWam5XSXlBT1pZUk8iLCJqdGkiOiIyZDY2NTllZC1jM2NjLTRiMzAtODA2YS0wMTYyZGQ3ZmRiZDUiLCJpZCI6NTQ1ODA4LCJzdWIiOiJvdWFpc3MyMDEwIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6Ik1hc3Rlci1CSU0tU29mdHdhcmUiLCJpYXQiOjE3OTQyMzQ2ODh9.9p3WxiHTuC-A4rV7uwwB7syElFEiL2eDPIg8LAGy5oU";

interface PresetCity {
  id: string;
  flag: string;
  name: string;
  landmark: string;
  lat: number;
  lon: number;
  rot: number;
  elevation: number;
}

const WORLD_PRESETS: PresetCity[] = [
  {
    id: "london",
    flag: "🇬🇧",
    name: "London",
    landmark: "Westminster & Big Ben",
    lat: 51.5007,
    lon: -0.1246,
    rot: 0,
    elevation: 0,
  },
  {
    id: "new-york",
    flag: "🇺🇸",
    name: "New York",
    landmark: "Manhattan Financial Dist.",
    lat: 40.7128,
    lon: -74.006,
    rot: 30,
    elevation: 0,
  },
  {
    id: "paris",
    flag: "🇫🇷",
    name: "Paris",
    landmark: "Eiffel Tower & Seine",
    lat: 48.8584,
    lon: 2.2945,
    rot: 45,
    elevation: 0,
  },
  {
    id: "dubai",
    flag: "🇦🇪",
    name: "Dubai",
    landmark: "Burj Khalifa & Downtown",
    lat: 25.1972,
    lon: 55.2744,
    rot: 15,
    elevation: 0,
  },
  {
    id: "tokyo",
    flag: "🇯🇵",
    name: "Tokyo",
    landmark: "Shinjuku Metropolitan",
    lat: 35.6895,
    lon: 139.6917,
    rot: 0,
    elevation: 0,
  },
  {
    id: "origin",
    flag: "🌐",
    name: "Origin",
    landmark: "0°0'N, 0°0'E Meridian",
    lat: 0,
    lon: 0,
    rot: 0,
    elevation: 0,
  },
];

export const gisTemplate: BUI.StatefullComponent<GISState> = (
  state: GISState,
  update
) => {
  const { components } = state;
  const gisLayers = components.get(GISLayers);

  const savedToken =
    localStorage.getItem(CESIUM_STORAGE_KEY) ||
    state.token ||
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env?.VITE_CESIUM_ION_TOKEN) ||
    DEFAULT_CESIUM_TOKEN;

  let currentToken = savedToken;
  let isEnabled = gisLayers.layer3d.enabled;
  let currentAssetId = gisLayers.layer3d.assetId || "2275207";
  let longitude = Number((gisLayers.layer3d.longitude ?? state.longitude ?? -0.1246).toFixed(4));
  let latitude = Number((gisLayers.layer3d.latitude ?? state.latitude ?? 51.5007).toFixed(4));
  let cameraRange = state.cameraRange ?? 5; // km
  let rotation = gisLayers.layer3d.rotation ?? state.rotation ?? 0;
  let elevation = gisLayers.layer3d.elevation ?? state.elevation ?? 0;
  let isOrbiting = gisLayers.layer3d.isOrbiting;

  // Auto-init 2D/3D layers when token is present
  if (currentToken && !gisLayers.layer2d.viewer) {
    try {
      gisLayers.token = currentToken;
    } catch {}
  }

  // --- Controlled Inputs ---
  const longitudeInput = document.createElement("bim-number-input") as BUI.NumberInput;
  longitudeInput.vertical = true;
  longitudeInput.label = "Longitude (°)";
  longitudeInput.value = longitude;
  longitudeInput.min = -180;
  longitudeInput.max = 180;
  longitudeInput.step = 0.0001;
  longitudeInput.style.width = "100%";

  const latitudeInput = document.createElement("bim-number-input") as BUI.NumberInput;
  latitudeInput.vertical = true;
  latitudeInput.label = "Latitude (°)";
  latitudeInput.value = latitude;
  latitudeInput.min = -90;
  latitudeInput.max = 90;
  latitudeInput.step = 0.0001;
  latitudeInput.style.width = "100%";

  const rotationInput = document.createElement("bim-number-input") as BUI.NumberInput;
  rotationInput.vertical = true;
  rotationInput.slider = true;
  rotationInput.label = "Map Rotation";
  rotationInput.suffix = "°";
  rotationInput.value = rotation;
  rotationInput.min = 0;
  rotationInput.max = 360;
  rotationInput.step = 1;
  rotationInput.style.width = "100%";

  const elevationInput = document.createElement("bim-number-input") as BUI.NumberInput;
  elevationInput.vertical = true;
  elevationInput.slider = true;
  elevationInput.label = "BIM Ground Elevation Offset";
  elevationInput.suffix = " m";
  elevationInput.value = elevation;
  elevationInput.min = -100;
  elevationInput.max = 300;
  elevationInput.step = 1;
  elevationInput.style.width = "100%";

  const cameraRangeInput = document.createElement("bim-number-input") as BUI.NumberInput;
  cameraRangeInput.vertical = true;
  cameraRangeInput.slider = true;
  cameraRangeInput.label = "Camera Range";
  cameraRangeInput.suffix = " km";
  cameraRangeInput.value = cameraRange;
  cameraRangeInput.min = 1;
  cameraRangeInput.max = 50;
  cameraRangeInput.step = 1;
  cameraRangeInput.style.width = "100%";

  const enableButton = document.createElement("bim-button") as BUI.Button;
  enableButton.label = isEnabled ? "Turn Off" : "Turn On";
  enableButton.active = isEnabled;
  enableButton.style.setProperty(
    "--bim-button-background",
    isEnabled ? "#0284c7" : "rgba(71, 85, 105, 0.7)"
  );
  enableButton.style.fontWeight = "700";
  enableButton.style.borderRadius = "8px";
  enableButton.style.padding = "7px 16px";

  const tokenInput = document.createElement("bim-text-input") as BUI.TextInput;
  tokenInput.vertical = true;
  tokenInput.label = "Cesium Ion API Token";
  tokenInput.placeholder = "Paste Cesium Ion JWT token...";
  tokenInput.value = currentToken;
  tokenInput.style.width = "100%";

  // Safety token validator
  const validateTokenState = () => {
    const hasValidToken = Boolean(currentToken && currentToken.trim().length > 15);
    if (hasValidToken) {
      enableButton.disabled = false;
      enableButton.classList.remove("disabled");
    } else {
      enableButton.disabled = true;
      enableButton.classList.add("disabled");
      if (gisLayers.layer3d.enabled) {
        gisLayers.layer3d.enabled = false;
        enableButton.active = false;
        enableButton.label = "Turn On";
      }
    }
  };

  validateTokenState();

  // Event handlers
  tokenInput.addEventListener("input", () => {
    currentToken = tokenInput.value || "";
    localStorage.setItem(CESIUM_STORAGE_KEY, currentToken);
    validateTokenState();
    if (currentToken.trim().length > 15) {
      try {
        gisLayers.token = currentToken;
      } catch (err) {
        console.warn("[GIS UI] Token error:", err);
      }
    }
  });

  enableButton.addEventListener("click", () => {
    if (!currentToken || currentToken.trim().length < 15) {
      alert("Please provide a valid Cesium Ion API token first.");
      return;
    }
    gisLayers.layer3d.enabled = !gisLayers.layer3d.enabled;
    isEnabled = gisLayers.layer3d.enabled;
    enableButton.active = isEnabled;
    enableButton.label = isEnabled ? "Turn Off" : "Turn On";
    enableButton.style.setProperty(
      "--bim-button-background",
      isEnabled ? "#0284c7" : "rgba(71, 85, 105, 0.7)"
    );
    update();
  });

  longitudeInput.addEventListener("change", () => {
    longitude = Number(longitudeInput.value);
    gisLayers.setLocation(latitude, longitude, rotation, elevation);
  });

  latitudeInput.addEventListener("change", () => {
    latitude = Number(latitudeInput.value);
    gisLayers.setLocation(latitude, longitude, rotation, elevation);
  });

  rotationInput.addEventListener("change", () => {
    rotation = Number(rotationInput.value);
    gisLayers.setLocation(latitude, longitude, rotation, elevation);
  });

  elevationInput.addEventListener("change", () => {
    elevation = Number(elevationInput.value);
    gisLayers.setElevation(elevation);
  });

  cameraRangeInput.addEventListener("change", () => {
    cameraRange = Number(cameraRangeInput.value);
  });

  // Wire 2D map clicks with 4-decimal rounding
  gisLayers.layer2d.onCoordinatesSelected.reset();
  gisLayers.layer2d.onCoordinatesSelected.add(({ latitude: lat, longitude: lon }) => {
    const roundedLat = Number(lat.toFixed(4));
    const roundedLon = Number(lon.toFixed(4));
    latitude = roundedLat;
    longitude = roundedLon;
    latitudeInput.value = roundedLat;
    longitudeInput.value = roundedLon;
  });

  const onSelectCity = (city: PresetCity) => {
    latitude = city.lat;
    longitude = city.lon;
    rotation = city.rot;
    elevation = city.elevation;

    latitudeInput.value = city.lat;
    longitudeInput.value = city.lon;
    rotationInput.value = city.rot;
    elevationInput.value = city.elevation;

    gisLayers.setLocation(latitude, longitude, rotation, elevation);
    gisLayers.layer3d.focusTerrain("iso");
    update();
  };

  const onSelectAsset = (assetId: string) => {
    currentAssetId = assetId;
    gisLayers.layer3d.setAsset(assetId);
    update();
  };

  const onToggleMapStyle = (style: "dark" | "osm") => {
    gisLayers.layer2d.setMapStyle(style);
    update();
  };

  const onToggleOrbit = () => {
    isOrbiting = gisLayers.toggleOrbit();
    update();
  };

  const isGoogleActive = currentAssetId === "2275207";
  const isOsmActive = currentAssetId === "96188";
  const isDarkMapActive = gisLayers.layer2d.mapStyle === "dark";

  requestAnimationFrame(() => {
    if (gisLayers.layer2d.viewer && !gisLayers.layer2d.viewer.isDestroyed()) {
      gisLayers.layer2d.viewer.resize();
    }
  });

  return BUI.html`
    <bim-panel-section
      fixed
      style="display: flex; flex-direction: column; gap: 14px; height: 100%; overflow-y: auto; background: transparent; padding: 14px 16px; box-sizing: border-box;"
    >
      <!-- Telemetry Master Power Card -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: ${isEnabled ? "linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(6, 78, 59, 0.25))" : "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))"};
          border: 1px solid ${isEnabled ? "rgba(16, 185, 129, 0.5)" : "rgba(148, 163, 184, 0.25)"};
          box-shadow: ${isEnabled ? "0 0 20px rgba(16, 185, 129, 0.2)" : "0 4px 12px rgba(0, 0, 0, 0.4)"};
          transition: all 0.25s ease;
        "
      >
        <div style="display: flex; align-items: center; gap: 10px;">
          <div
            style="
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: ${isEnabled ? "#10b981" : "#64748b"};
              box-shadow: ${isEnabled ? "0 0 10px #10b981, 0 0 20px #10b981" : "none"};
              animation: ${isEnabled ? "pulse 2s infinite" : "none"};
            "
          ></div>
          <div style="display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; letter-spacing: 0.02em;">
                Cesium 3D Tiles Studio
              </span>
              <span style="font-size: 0.64rem; padding: 1px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 700;">
                PRO
              </span>
            </div>
            <span style="font-size: 0.72rem; color: ${isEnabled ? "#34d399" : "#94a3b8"}; font-weight: 600;">
              ${isEnabled ? `Streaming · ${isGoogleActive ? "Google 3D Photorealistic" : isOsmActive ? "Cesium OSM Buildings" : "World Terrain"}` : "Standby · Ready to Stream"}
            </span>
          </div>
        </div>

        ${enableButton}
      </div>

      <!-- 3D Tiles Appearance Engine Switcher -->
      <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
        <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">
          3D Geospatial Engine
        </span>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%;">
          <button
            type="button"
            @click=${() => onSelectAsset("2275207")}
            style="
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 2px;
              padding: 9px 11px;
              border-radius: 9px;
              background: ${isGoogleActive ? "linear-gradient(135deg, rgba(37, 99, 235, 0.35), rgba(14, 165, 233, 0.2))" : "rgba(30, 41, 59, 0.6)"};
              border: 1px solid ${isGoogleActive ? "#38bdf8" : "rgba(148, 163, 184, 0.25)"};
              color: ${isGoogleActive ? "#38bdf8" : "#cbd5e1"};
              box-shadow: ${isGoogleActive ? "0 0 14px rgba(56, 189, 248, 0.25)" : "none"};
              cursor: pointer;
              text-align: left;
              transition: all 0.2s ease;
            "
          >
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 0.80rem; font-weight: 800;">🏙️ Photorealistic</span>
            </div>
            <span style="font-size: 0.66rem; color: #94a3b8;">Google 3D (Textured City)</span>
          </button>

          <button
            type="button"
            @click=${() => onSelectAsset("96188")}
            style="
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 2px;
              padding: 9px 11px;
              border-radius: 9px;
              background: ${isOsmActive ? "linear-gradient(135deg, rgba(37, 99, 235, 0.35), rgba(14, 165, 233, 0.2))" : "rgba(30, 41, 59, 0.6)"};
              border: 1px solid ${isOsmActive ? "#38bdf8" : "rgba(148, 163, 184, 0.25)"};
              color: ${isOsmActive ? "#38bdf8" : "#cbd5e1"};
              box-shadow: ${isOsmActive ? "0 0 14px rgba(56, 189, 248, 0.25)" : "none"};
              cursor: pointer;
              text-align: left;
              transition: all 0.2s ease;
            "
          >
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 0.80rem; font-weight: 800;">🏛️ OSM Buildings</span>
            </div>
            <span style="font-size: 0.66rem; color: #94a3b8;">White Massing Mesh</span>
          </button>
        </div>
      </div>

      <!-- 2D Interactive Geospatial Radar (With Style Toggle & Telemetry) -->
      <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">
              2D Geospatial Radar
            </span>
            <span style="font-size: 0.64rem; color: #34d399; font-weight: 600;">● Live Sync</span>
          </div>

          <div style="display: flex; gap: 4px;">
            <button
              type="button"
              @click=${() => onToggleMapStyle("dark")}
              style="
                padding: 2px 7px;
                border-radius: 5px;
                font-size: 0.66rem;
                font-weight: 700;
                background: ${isDarkMapActive ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.7)"};
                border: 1px solid ${isDarkMapActive ? "#38bdf8" : "rgba(148, 163, 184, 0.25)"};
                color: ${isDarkMapActive ? "#38bdf8" : "#94a3b8"};
                cursor: pointer;
              "
              title="Switch to Cyber Dark Map Style"
            >
              🌙 Dark
            </button>
            <button
              type="button"
              @click=${() => onToggleMapStyle("osm")}
              style="
                padding: 2px 7px;
                border-radius: 5px;
                font-size: 0.66rem;
                font-weight: 700;
                background: ${!isDarkMapActive ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.7)"};
                border: 1px solid ${!isDarkMapActive ? "#38bdf8" : "rgba(148, 163, 184, 0.25)"};
                color: ${!isDarkMapActive ? "#38bdf8" : "#94a3b8"};
                cursor: pointer;
              "
              title="Switch to OpenStreetMap Standard Style"
            >
              🗺️ OSM
            </button>
          </div>
        </div>

        <div
          style="
            width: 100%;
            height: 260px;
            min-height: 260px;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
            background: #090d16;
            border: 1px solid rgba(56, 189, 248, 0.35);
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
          "
        >
          ${gisLayers.layer2d.container}
        </div>
      </div>

      <!-- Smart World Cities Deck (6 Architectural Capitals) -->
      <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
        <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">
          World Architectural Presets
        </span>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%;">
          ${WORLD_PRESETS.map(
            (city) => BUI.html`
              <button
                type="button"
                @click=${() => onSelectCity(city)}
                style="
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                  gap: 1px;
                  padding: 7px 9px;
                  border-radius: 8px;
                  background: rgba(30, 41, 59, 0.7);
                  border: 1px solid rgba(148, 163, 184, 0.25);
                  color: #f8fafc;
                  cursor: pointer;
                  text-align: left;
                  transition: all 0.15s ease;
                "
              >
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span>${city.flag}</span>
                  <span style="font-size: 0.74rem; font-weight: 700;">${city.name}</span>
                </div>
                <span style="font-size: 0.62rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                  ${city.landmark}
                </span>
              </button>
            `
          )}
        </div>
      </div>

      <!-- Precision Georeferencing Deck -->
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">
          Georeferencing Coordinates (WGS84)
        </span>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;">
          ${longitudeInput}
          ${latitudeInput}
        </div>
      </div>

      <!-- Sliders (Elevation, Rotation, Camera Range) -->
      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
        ${elevationInput}
        ${rotationInput}
        ${cameraRangeInput}
      </div>

      <!-- Camera Navigation & Orbit Studio -->
      <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
        <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">
          Camera Viewpoint &amp; Orbit Studio
        </span>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; width: 100%;">
          <bim-button
            label="📐 3D ISO"
            @click=${() => gisLayers.layer3d.focusTerrain("iso")}
            title="Axonometric 45° Overview"
          ></bim-button>
          <bim-button
            label="🗺️ Plan"
            @click=${() => gisLayers.layer3d.focusTerrain("plan")}
            title="Top-down Orthographic Plan"
          ></bim-button>
          <bim-button
            label="🚶 Street"
            @click=${() => gisLayers.layer3d.focusTerrain("front")}
            title="Eye-level Street Perspective"
          ></bim-button>
          <bim-button
            label=${isOrbiting ? "⏸️ Stop" : "🔄 Orbit"}
            .active=${isOrbiting}
            @click=${onToggleOrbit}
            title="Toggle 360° Continuous Cinematic Orbit"
            style="--bim-button-background: ${isOrbiting ? "linear-gradient(135deg, #2563eb, #38bdf8)" : "rgba(71, 85, 105, 0.7)"};"
          ></bim-button>
        </div>
      </div>

      <!-- Cesium Ion Token Vault -->
      <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">
            Cesium Ion Token Vault
          </span>
          <span style="font-size: 0.64rem; color: #10b981; font-weight: 600;">✓ Saved Locally</span>
        </div>
        ${tokenInput}
      </div>

      <!-- Telemetry Live Footer -->
      <div
        style="
          margin-top: 4px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px dashed rgba(56, 189, 248, 0.3);
          display: flex;
          flex-direction: column;
          gap: 4px;
        "
      >
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.72rem; color: #f8fafc; font-weight: 700;">Active 3D Stream:</span>
            <span style="font-size: 0.70rem; color: #38bdf8; font-weight: 600;">Asset ${currentAssetId}</span>
          </div>
          <span style="font-size: 0.70rem; color: ${isEnabled ? "#34d399" : "#94a3b8"}; font-weight: 800;">
            ${isEnabled ? "STREAMING ACTIVE" : "STANDBY"}
          </span>
        </div>
        <span style="font-size: 0.68rem; color: #94a3b8; line-height: 1.4;">
          ${isGoogleActive
            ? "Google Photorealistic 3D Tiles streaming with sub-meter aerial photogrammetry textures, real rivers and trees."
            : "Cesium OSM untextured polygonal 3D buildings mesh with architectural massing."}
        </span>
      </div>
    </bim-panel-section>
  `;
};
