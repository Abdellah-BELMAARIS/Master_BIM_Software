import React, { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";

interface NavigationCubeProps {
  world: OBC.World | null;
  onFocusExtents?: () => void;
  isDrawerOpen?: boolean;
}

/**
 * Safely access world.camera without throwing "No camera initialized!"
 */
const getSafeCamera = (world: OBC.World | null): any => {
  if (!world) return null;
  try {
    return (world as any)._camera ?? world.camera ?? null;
  } catch {
    return null;
  }
};

/**
 * World-Class 3D ViewCube & Architectural Compass Navigator
 * Features:
 * - Real-time synchronization with Three.js camera rotation matrix
 * - Clickable faces: TOP, FRONT, RIGHT, LEFT, BACK, BOTTOM
 * - Clickable axonometric isometric corners (ISO NE, NW, SE, SW)
 * - Rotating True-North compass ring with one-click North alignment
 * - Camera projection switcher (Perspective 3D <-> Orthographic CAD 2D)
 * - Navigation mode switcher (Turntable Orbit <-> First-Person Walk)
 */
export const NavigationCube: React.FC<NavigationCubeProps> = ({
  world,
  onFocusExtents,
  isDrawerOpen = false,
}) => {
  const [rotX, setRotX] = useState<number>(0);
  const [rotY, setRotY] = useState<number>(0);
  const [compassAngle, setCompassAngle] = useState<number>(0);
  const [projection, setProjection] = useState<"Perspective" | "Orthographic">("Perspective");
  const [navMode, setNavMode] = useState<"Orbit" | "FirstPerson">("Orbit");
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const reqRef = useRef<number | null>(null);

  useEffect(() => {
    let checkInterval: any = null;

    const tryInit = (): (() => void) | null => {
      const camera = getSafeCamera(world);
      if (!camera) return null;

      const controls = (camera as any).controls;
      if (!controls) return null;

      // Read initial projection
      if (camera instanceof OBC.OrthoPerspectiveCamera) {
        setProjection(camera.projection.current);
      }

      const updateOrientation = () => {
        const threeCamera = camera.three;
        if (!threeCamera) return;

        // Extract camera view direction and up vector
        const dir = new THREE.Vector3();
        threeCamera.getWorldDirection(dir);

        // Compute polar and azimuth angles for CSS 3D ViewCube
        const polar = Math.asin(-dir.y); // Vertical tilt (-PI/2 to PI/2)
        const azimuth = Math.atan2(dir.x, dir.z); // Horizontal rotation

        // Convert radians to degrees for CSS rotation
        const degX = (polar * 180) / Math.PI;
        const degY = (-azimuth * 180) / Math.PI;

        setRotX(degX);
        setRotY(degY);
        setCompassAngle(-degY);
      };

      controls.addEventListener("update", updateOrientation);
      updateOrientation();

      return () => {
        controls.removeEventListener("update", updateOrientation);
      };
    };

    let cleanupFn: (() => void) | null = tryInit();
    if (!cleanupFn) {
      checkInterval = setInterval(() => {
        cleanupFn = tryInit();
        if (cleanupFn) {
          clearInterval(checkInterval);
        }
      }, 250);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (typeof cleanupFn === "function") cleanupFn();
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [world]);

  /**
   * Smoothly animates camera to orthogonal or isometric orientation
   */
  const setViewDirection = async (
    face: "top" | "bottom" | "front" | "back" | "right" | "left" | "iso-ne" | "iso-nw" | "iso-se" | "iso-sw"
  ) => {
    const camera = getSafeCamera(world);
    const controls = (camera as any)?.controls;
    if (!controls) return;

    // Get current target
    const target = new THREE.Vector3();
    controls.getTarget(target);

    // Compute current camera distance to target
    const pos = new THREE.Vector3();
    controls.getPosition(pos);
    const distance = Math.max(pos.distanceTo(target), 8);

    const offset = new THREE.Vector3();
    switch (face) {
      case "top":
        offset.set(0, distance, 0.001);
        break;
      case "bottom":
        offset.set(0, -distance, 0.001);
        break;
      case "front":
        offset.set(0, 0, distance);
        break;
      case "back":
        offset.set(0, 0, -distance);
        break;
      case "right":
        offset.set(distance, 0, 0);
        break;
      case "left":
        offset.set(-distance, 0, 0);
        break;
      case "iso-ne": {
        const d = distance * 0.707;
        offset.set(d, d, d);
        break;
      }
      case "iso-nw": {
        const d = distance * 0.707;
        offset.set(-d, d, d);
        break;
      }
      case "iso-se": {
        const d = distance * 0.707;
        offset.set(d, d, -d);
        break;
      }
      case "iso-sw": {
        const d = distance * 0.707;
        offset.set(-d, d, -d);
        break;
      }
    }

    const newPos = target.clone().add(offset);
    await controls.setLookAt(
      newPos.x,
      newPos.y,
      newPos.z,
      target.x,
      target.y,
      target.z,
      true
    );
  };

  /**
   * Aligns camera facing directly North (Z+ / Y-up azimuth = 0)
   */
  const alignToNorth = async () => {
    const camera = getSafeCamera(world);
    const controls = (camera as any)?.controls;
    if (!controls) return;
    const target = new THREE.Vector3();
    controls.getTarget(target);
    const pos = new THREE.Vector3();
    controls.getPosition(pos);
    const distance = Math.max(pos.distanceTo(target), 8);

    // Keep same altitude (Y) but place camera on positive Z axis facing target
    const currentY = pos.y - target.y;
    const horizontalDist = Math.max(Math.sqrt(Math.max(distance * distance - currentY * currentY, 4)), 6);
    const newPos = new THREE.Vector3(target.x, target.y + currentY, target.z + horizontalDist);

    await controls.setLookAt(newPos.x, newPos.y, newPos.z, target.x, target.y, target.z, true);
  };

  const toggleProjectionMode = () => {
    const cam = getSafeCamera(world);
    if (!cam || !(cam instanceof OBC.OrthoPerspectiveCamera)) return;
    const next = projection === "Perspective" ? "Orthographic" : "Perspective";
    cam.projection.set(next);
    setProjection(next);
  };

  const toggleNavigationMode = () => {
    const cam = getSafeCamera(world);
    if (!cam || !(cam instanceof OBC.OrthoPerspectiveCamera)) return;
    const next = navMode === "Orbit" ? "FirstPerson" : "Orbit";
    try {
      cam.set(next);
      setNavMode(next);
    } catch (err) {
      console.warn("Failed to toggle navigation mode:", err);
    }
  };

  return (
    <div
      className="toc-viewcube-deck"
      style={{
        right: isDrawerOpen ? "calc(clamp(360px, 34vw, 440px) + 24px)" : "20px",
        transition: "right 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Top Mode Controls (Projection, Walk Mode, Key Help) */}
      <div className="toc-viewcube-controls-row">
        <button
          type="button"
          onClick={toggleProjectionMode}
          className={`toc-viewcube-btn ${projection === "Orthographic" ? "active" : ""}`}
          title={`Switch Camera Projection (Currently ${projection}). Press O to toggle.`}
        >
          <span className="material-icons-round" style={{ fontSize: "14px" }}>
            {projection === "Orthographic" ? "view_agenda" : "view_in_ar"}
          </span>
          <span>{projection === "Orthographic" ? "2D Ortho" : "3D Persp"}</span>
        </button>

        <button
          type="button"
          onClick={toggleNavigationMode}
          className={`toc-viewcube-btn ${navMode === "FirstPerson" ? "active" : ""}`}
          title={`Switch Mode: Turntable Orbit vs First-Person Walk (WASD)`}
        >
          <span className="material-icons-round" style={{ fontSize: "14px" }}>
            {navMode === "FirstPerson" ? "directions_walk" : "rotate_right"}
          </span>
          <span>{navMode === "FirstPerson" ? "Walk" : "Orbit"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsHelpOpen((prev) => !prev)}
          className="toc-viewcube-btn icon-only"
          title="Viewer Navigation & Keyboard Shortcuts"
        >
          <span className="material-icons-round" style={{ fontSize: "15px" }}>help_outline</span>
        </button>
      </div>

      {/* 3D Interactive CSS ViewCube */}
      <div className="toc-viewcube-viewport">
        <div
          className="toc-viewcube"
          style={{
            transform: `rotateX(${-rotX}deg) rotateY(${rotY}deg)`,
          }}
        >
          {/* 6 Orthogonal Faces */}
          <div className="cube-face top" onClick={() => setViewDirection("top")}>
            TOP
          </div>
          <div className="cube-face bottom" onClick={() => setViewDirection("bottom")}>
            BOTTOM
          </div>
          <div className="cube-face front" onClick={() => setViewDirection("front")}>
            FRONT
          </div>
          <div className="cube-face back" onClick={() => setViewDirection("back")}>
            BACK
          </div>
          <div className="cube-face right" onClick={() => setViewDirection("right")}>
            RIGHT
          </div>
          <div className="cube-face left" onClick={() => setViewDirection("left")}>
            LEFT
          </div>

          {/* 4 Isometric Corners */}
          <div className="cube-corner corner-ne" onClick={() => setViewDirection("iso-ne")} title="ISO NE" />
          <div className="cube-corner corner-nw" onClick={() => setViewDirection("iso-nw")} title="ISO NW" />
          <div className="cube-corner corner-se" onClick={() => setViewDirection("iso-se")} title="ISO SE" />
          <div className="cube-corner corner-sw" onClick={() => setViewDirection("iso-sw")} title="ISO SW" />
        </div>
      </div>

      {/* Rotating Compass Ring */}
      <div
        className="toc-viewcube-compass"
        style={{ transform: `rotate(${compassAngle}deg)` }}
        onClick={alignToNorth}
        title="Click to Align Camera to True North"
      >
        <span className="compass-mark north">N</span>
        <span className="compass-mark east">E</span>
        <span className="compass-mark south">S</span>
        <span className="compass-mark west">W</span>
        <div className="compass-needle" />
      </div>

      {/* Shortcuts Helper Modal */}
      {isHelpOpen && (
        <div className="toc-nav-shortcuts-modal">
          <div className="shortcuts-header">
            <span>Navigation Shortcuts</span>
            <button type="button" onClick={() => setIsHelpOpen(false)}>&times;</button>
          </div>
          <div className="shortcuts-grid">
            <div className="shortcut-row">
              <span className="key-badge">L-Click + Drag</span>
              <span className="key-desc">Orbit / Turntable Rotate</span>
            </div>
            <div className="shortcut-row">
              <span className="key-badge">R-Click / Shift + Drag</span>
              <span className="key-desc">Pan Camera</span>
            </div>
            <div className="shortcut-row">
              <span className="key-badge">Scroll Wheel</span>
              <span className="key-desc">Smooth Zoom In / Out</span>
            </div>
            <div className="shortcut-row">
              <span className="key-badge">Double Click</span>
              <span className="key-desc">Isolate &amp; Fit to Element</span>
            </div>
            <div className="shortcut-row">
              <span className="key-badge">W / A / S / D</span>
              <span className="key-desc">First-Person Walk</span>
            </div>
            <div className="shortcut-row">
              <span className="key-badge">Space / Shift</span>
              <span className="key-desc">Ascend / Sprint Walk</span>
            </div>
            <div className="shortcut-row">
              <span className="key-badge">O</span>
              <span className="key-desc">Toggle 3D Persp / 2D Ortho</span>
            </div>
            <div className="shortcut-row">
              <span className="key-badge">F</span>
              <span className="key-desc">Full Viewport Mode</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
