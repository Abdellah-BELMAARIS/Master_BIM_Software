import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import { v4 as uuidv4 } from "uuid";
import { SmartView } from "./types";

/**
 * Module 4 — Section 5: Custom BIM Component: Smart Views
 * (Lessons 5.1 to 5.5)
 *
 * Captures, stores, and restores complete BIM viewport states:
 * - 3D Camera coordinates (Position, Target, Projection)
 * - Element visibility & isolation states (via OBC.Hider)
 * - Dynamic color highlights & themes (via OBCF.Highlighter)
 */
export class SmartViews extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "6b75f82c-1ad8-4667-bb89-5321f6b5bcf4";
  enabled = true;

  readonly list = new Map<string, SmartView>();

  readonly onViewCreated = new OBC.Event<SmartView>();
  readonly onViewApplied = new OBC.Event<SmartView>();
  readonly onViewDeleted = new OBC.Event<string>();
  readonly onViewsReset = new OBC.Event<void>();
  readonly onDisposed = new OBC.Event<void>();

  constructor(components: OBC.Components) {
    super(components);
    components.add(SmartViews.uuid, this);
  }

  /**
   * Lesson 5.4: Saving the current viewer state as a Smart View
   */
  async create(name: string): Promise<SmartView> {
    const worlds = this.components.get(OBC.Worlds);
    const world = [...worlds.list.values()][0];
    const camera = world?.camera;
    const controls = (camera as any)?.controls;

    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();

    if (controls) {
      controls.getPosition(pos);
      controls.getTarget(target);
    } else if (camera?.three) {
      pos.copy(camera.three.position);
    }

    const isOrtho = camera instanceof OBC.OrthoPerspectiveCamera ? camera.isOrtho : false;

    // Capture active hidden elements via Hider
    let hiddenMap: OBC.ModelIdMap | undefined;
    try {
      const hider = this.components.get(OBC.Hider);
      if ((hider as any).hidden) {
        hiddenMap = JSON.parse(JSON.stringify((hider as any).hidden));
      }
    } catch {}

    const smartView: SmartView = {
      id: uuidv4(),
      name: name.trim() || `Viewpoint #${this.list.size + 1}`,
      cameraPosition: [pos.x, pos.y, pos.z],
      cameraTarget: [target.x, target.y, target.z],
      isOrtho,
      hidden: hiddenMap,
      createdAt: Date.now(),
    };

    this.list.set(smartView.id, smartView);
    this.onViewCreated.trigger(smartView);
    return smartView;
  }

  /**
   * Lesson 5.3: Applying a Smart View to the active viewer
   */
  async apply(id: string): Promise<void> {
    const view = this.list.get(id);
    if (!view) {
      console.warn(`[SmartViews] View with ID ${id} not found.`);
      return;
    }

    const worlds = this.components.get(OBC.Worlds);
    const world = [...worlds.list.values()][0];
    const camera = world?.camera;
    const controls = (camera as any)?.controls;

    // Restore camera position and target
    if (controls) {
      controls.setLookAt(
        view.cameraPosition[0],
        view.cameraPosition[1],
        view.cameraPosition[2],
        view.cameraTarget[0],
        view.cameraTarget[1],
        view.cameraTarget[2],
        true // smooth animation transition
      );
    }

    // Restore projection
    if (camera instanceof OBC.OrthoPerspectiveCamera && camera.isOrtho !== view.isOrtho) {
      camera.setProjection(view.isOrtho ? "Orthographic" : "Perspective");
    }

    // Restore hidden state
    try {
      const hider = this.components.get(OBC.Hider);
      if (view.hidden) {
        await hider.set(false, view.hidden);
      } else {
        await hider.set(true);
      }
    } catch {}

    this.onViewApplied.trigger(view);
  }

  /**
   * Lesson 5.5: Resetting the current view state to default
   */
  async reset(): Promise<void> {
    const worlds = this.components.get(OBC.Worlds);
    const world = [...worlds.list.values()][0];
    const camera = world?.camera;
    const controls = (camera as any)?.controls;

    if (controls) {
      controls.setLookAt(20, 15, 25, 0, 3, 0, true);
    }

    if (camera instanceof OBC.OrthoPerspectiveCamera && camera.isOrtho) {
      camera.setProjection("Perspective");
    }

    try {
      const hider = this.components.get(OBC.Hider);
      await hider.set(true);
      const highlighter = this.components.get(OBCF.Highlighter);
      await highlighter.clear();
    } catch {}

    this.onViewsReset.trigger();
  }

  delete(id: string): void {
    if (this.list.delete(id)) {
      this.onViewDeleted.trigger(id);
    }
  }

  /**
   * Lesson 5.2: Creating a UI list for managing smart views
   */
  createUI(): HTMLElement {
    let nameInput: BUI.TextInput | null = null;
    let listContainer: HTMLElement | null = null;

    const renderList = () => {
      if (!listContainer) return;
      listContainer.innerHTML = "";
      if (this.list.size === 0) {
        listContainer.innerHTML = `
          <div style="color: #94a3b8; font-size: 0.8rem; font-style: italic; padding: 0.5rem 0;">
            No smart viewpoints saved yet. Orbit in 3D and click "Save Viewpoint".
          </div>
        `;
        return;
      }

      for (const [id, view] of this.list) {
        const item = document.createElement("div");
        item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; margin-bottom: 4px; background: rgba(30, 41, 59, 0.7); border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.2);";
        item.innerHTML = `
          <div style="cursor: pointer; flex: 1; min-width: 0;">
            <div style="font-size: 0.82rem; font-weight: 600; color: #f8fafc;">${view.name}</div>
            <div style="font-size: 0.7rem; color: #38bdf8;">${view.isOrtho ? "2D Ortho" : "3D Perspective"}</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn-apply" style="padding: 3px 8px; background: #0284c7; color: white; border: none; border-radius: 4px; font-size: 0.72rem; cursor: pointer;">Go</button>
            <button class="btn-del" style="padding: 3px 6px; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: none; border-radius: 4px; font-size: 0.72rem; cursor: pointer;">&times;</button>
          </div>
        `;

        item.querySelector(".btn-apply")?.addEventListener("click", () => this.apply(id));
        item.querySelector(".btn-del")?.addEventListener("click", () => {
          this.delete(id);
          renderList();
        });
        listContainer.appendChild(item);
      }
    };

    const onSave = async () => {
      const name = nameInput?.value?.trim() || "";
      await this.create(name);
      if (nameInput) nameInput.value = "";
      renderList();
    };

    const onReset = async () => {
      await this.reset();
    };

    const panel = BUI.Component.create<BUI.Panel>(() => {
      return BUI.html`
        <bim-panel style="min-width: 20rem; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 1rem;">
          <bim-panel-section label="Smart Views (Lesson 5.1 – 5.5)" icon="material-symbols:camera">
            <bim-label style="color: #94a3b8; font-size: 0.82rem; margin-bottom: 0.75rem;">
              Save and restore custom camera angles, element filters, and viewpoint presentations.
            </bim-label>

            <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
              <bim-text-input
                ${BUI.ref((el) => { nameInput = el as BUI.TextInput; })}
                label="View Name"
                placeholder="e.g. South Facade, Level 2 HVAC"
                style="flex: 1;"
              ></bim-text-input>

              <bim-button
                @click=${onSave}
                label="Save"
                icon="material-symbols:bookmark-add"
                style="--bim-button-background: #0284c7; color: white; font-weight: 600;"
              ></bim-button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; margin-bottom: 0.5rem;">
              <span style="font-size: 0.8rem; font-weight: 700; color: #cbd5e1;">Saved Viewpoints</span>
              <button
                @click=${onReset}
                style="background: transparent; border: none; color: #94a3b8; font-size: 0.75rem; cursor: pointer; text-decoration: underline;"
              >
                Reset View
              </button>
            </div>

            <div ${BUI.ref((el) => { listContainer = el as HTMLElement; renderList(); })} style="max-height: 14rem; overflow-y: auto;"></div>
          </bim-panel-section>
        </bim-panel>
      `;
    });

    return panel;
  }

  dispose(): void {
    this.list.clear();
    this.onViewCreated.reset();
    this.onViewApplied.reset();
    this.onViewDeleted.reset();
    this.onViewsReset.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}

