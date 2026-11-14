import * as OBC from "@thatopen/components";
import * as THREE from "three";

export type WalkSpeedPreset = "slow" | "normal" | "fast";

export const WALK_SPEED_MPS: Record<WalkSpeedPreset, number> = {
  slow: 2.0,
  normal: 5.0,
  fast: 12.0,
};

export class IfcWalkController {
  private components: OBC.Components;
  private world: OBC.World;
  private active = false;
  private speedMps = WALK_SPEED_MPS.normal;
  private pressedKeys = new Set<string>();
  private rafId: number | null = null;
  private lastTime = 0;
  private onExitCallback?: () => void;

  private readonly pos = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly delta = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(
    components: OBC.Components,
    world: OBC.World,
    onExit?: () => void
  ) {
    this.components = components;
    this.world = world;
    this.onExitCallback = onExit;
  }

  get isActive(): boolean {
    return this.active;
  }

  setSpeedPreset(preset: WalkSpeedPreset): void {
    this.speedMps = WALK_SPEED_MPS[preset];
  }

  setSpeedMps(speed: number): void {
    this.speedMps = Math.max(0.5, Math.min(30, speed));
  }

  async enter(placeAtEyeLevel = true): Promise<void> {
    const cam = this.world.camera;
    if (!(cam instanceof OBC.OrthoPerspectiveCamera)) return;

    if (cam.projection.current !== "Perspective") {
      await cam.projection.set("Perspective");
    }

    cam.set("FirstPerson");
    this.active = true;
    this.pressedKeys.clear();
    this.bindEvents();
    this.startLoop();

    if (placeAtEyeLevel) {
      await this.moveToModelEyeLevel();
    }
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.pressedKeys.clear();
    this.unbindEvents();
    this.stopLoop();

    const cam = this.world.camera;
    if (cam instanceof OBC.OrthoPerspectiveCamera) {
      try {
        cam.set("Orbit");
      } catch {
        // ignore if camera is disposing
      }
    }
  }

  dispose(): void {
    this.exit();
    this.onExitCallback = undefined;
  }

  async moveToModelEyeLevel(eyeHeight = 1.68): Promise<void> {
    const cam = this.world.camera;
    const controls = (cam as any)?.controls;
    if (!controls || typeof controls.setLookAt !== "function") return;

    const fragments = this.components.get(OBC.FragmentsManager);
    const box = new THREE.Box3();
    for (const [, model] of fragments.list) {
      const obj = (model as any).object as THREE.Object3D | undefined;
      if (!obj) continue;
      obj.updateMatrixWorld(true);
      const modelBox = new THREE.Box3().setFromObject(obj);
      if (!modelBox.isEmpty()) {
        box.union(modelBox);
      }
    }

    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const eyeY = box.min.y + Math.min(eyeHeight, Math.max(1.2, size.y * 0.45));
    const entryZ = box.max.z + Math.max(2.5, Math.min(size.z * 0.35, 8));

    await controls.setLookAt(
      center.x,
      eyeY,
      entryZ,
      center.x,
      eyeY,
      center.z,
      true
    );
  }

  adjustElevation(deltaMeters: number): void {
    const cam = this.world.camera;
    const controls = (cam as any)?.controls;
    if (!controls || typeof controls.getPosition !== "function") return;

    controls.getPosition(this.pos);
    controls.getTarget(this.target);
    this.pos.y += deltaMeters;
    this.target.y += deltaMeters;
    controls.setLookAt(
      this.pos.x,
      this.pos.y,
      this.pos.z,
      this.target.x,
      this.target.y,
      this.target.z,
      false
    );
  }

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.active) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable)
    ) {
      return;
    }

    const code = e.code;
    if (code === "Escape") {
      this.exit();
      this.onExitCallback?.();
      return;
    }

    if (
      code === "KeyW" ||
      code === "KeyA" ||
      code === "KeyS" ||
      code === "KeyD" ||
      code === "KeyQ" ||
      code === "KeyE" ||
      code === "KeyC" ||
      code === "Space" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "ShiftLeft" ||
      code === "ShiftRight"
    ) {
      this.pressedKeys.add(code);
      if (code === "Space" || code.startsWith("Arrow")) {
        e.preventDefault();
      }
    }
  };

  private readonly handleKeyUp = (e: KeyboardEvent): void => {
    this.pressedKeys.delete(e.code);
  };

  private readonly handleBlur = (): void => {
    this.pressedKeys.clear();
  };

  private bindEvents(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  private unbindEvents(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }

  private startLoop(): void {
    this.stopLoop();
    this.lastTime = performance.now();
    const tick = (now: number) => {
      if (!this.active) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.step(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private step(dt: number): void {
    if (this.pressedKeys.size === 0 || dt <= 0) return;

    const cam = this.world.camera;
    const controls = (cam as any)?.controls;
    if (!controls || typeof controls.getPosition !== "function") return;

    const sprint =
      this.pressedKeys.has("ShiftLeft") || this.pressedKeys.has("ShiftRight")
        ? 2.4
        : 1.0;
    const dist = this.speedMps * sprint * dt;

    cam.three.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) {
      this.forward.set(0, 0, -1);
    } else {
      this.forward.normalize();
    }
    this.right.crossVectors(this.forward, this.up).normalize();

    this.delta.set(0, 0, 0);
    if (this.pressedKeys.has("KeyW") || this.pressedKeys.has("ArrowUp")) {
      this.delta.addScaledVector(this.forward, dist);
    }
    if (this.pressedKeys.has("KeyS") || this.pressedKeys.has("ArrowDown")) {
      this.delta.addScaledVector(this.forward, -dist);
    }
    if (this.pressedKeys.has("KeyD") || this.pressedKeys.has("ArrowRight")) {
      this.delta.addScaledVector(this.right, dist);
    }
    if (this.pressedKeys.has("KeyA") || this.pressedKeys.has("ArrowLeft")) {
      this.delta.addScaledVector(this.right, -dist);
    }
    if (this.pressedKeys.has("KeyE") || this.pressedKeys.has("Space")) {
      this.delta.y += dist * 0.75;
    }
    if (this.pressedKeys.has("KeyQ") || this.pressedKeys.has("KeyC")) {
      this.delta.y -= dist * 0.75;
    }

    if (this.delta.lengthSq() === 0) return;

    controls.getPosition(this.pos);
    controls.getTarget(this.target);

    this.pos.add(this.delta);
    this.target.add(this.delta);

    controls.setLookAt(
      this.pos.x,
      this.pos.y,
      this.pos.z,
      this.target.x,
      this.target.y,
      this.target.z,
      false
    );
  }
}
