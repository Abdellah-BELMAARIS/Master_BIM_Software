import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { SmartViews } from "../../bim-components/SmartViews";

export interface ViewportToolbarState {
  components: OBC.Components;
  world?: OBC.World;
}

/**
 * Module 4 — Lessons 3.8 to 3.13 & 5.4: Comprehensive BIM Viewport Toolbar
 * Provides interactive BIM inspection & presentation tools:
 * 1. Lesson 3.8: Element Colorization via OBCF.Highlighter dynamic styles (+ SmartViews state sync)
 * 2. Lesson 3.9: Visibility Operations (Hide, Isolate, Show All) via OBC.Hider
 * 3. Lesson 3.10: Ghost Model X-Ray Visualization via Fragments native setGhostItems & material opacity fallback
 * 4. Lesson 3.13: Camera Focus / Frame Selection via SimpleCamera.fitToItems & BoundingBoxer
 */
export const viewportToolbarTemplate: BUI.StatefullComponent<ViewportToolbarState> = (
  state: ViewportToolbarState
) => {
  const { components } = state;
  let colorInput: BUI.ColorInput | null = null;
  let ghostButton: BUI.Button | null = null;
  let isGhostActive = false;

  // Stores original Three.js materials for 3D Parametric non-Fragment fallback meshes during Ghost mode
  const originalThreeMaterials = new Map<
    THREE.Material,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >();

  const resolveWorld = (): OBC.World | undefined => {
    if (state.world) return state.world;
    const worlds = components.get(OBC.Worlds);
    return [...worlds.list.values()][0];
  };

  // =========================================================================
  // Lesson 3.8: Colorizing Model Items (+ SmartViews currentState tracking)
  // =========================================================================
  const onApplyColor = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    if (!button || !colorInput) return;

    const hexColor = colorInput.color || colorInput.value?.color || "#3b82f6";
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;

    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("[Highlighter] Select at least one element before applying color.");
      BUI.ContextMenu.removeMenus();
      return;
    }

    button.loading = true;
    try {
      if (!highlighter.styles.has(hexColor)) {
        highlighter.styles.set(hexColor, {
          color: new THREE.Color(hexColor),
          opacity: 1,
          transparent: false,
          renderedFaces: 0,
        });
      }

      const cloned = OBC.ModelIdMapUtils.clone(selection);
      await Promise.all([
        highlighter.highlightByID(hexColor, cloned, false, false),
        highlighter.clear("select"),
      ]);

      try {
        const smartViews = components.get(SmartViews);
        smartViews.addItemsColor(cloned, hexColor);
      } catch {}
    } catch (error) {
      console.error("[Highlighter] Error applying custom color:", error);
    } finally {
      button.loading = false;
      BUI.ContextMenu.removeMenus();
    }
  };

  const onClearColors = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    if (button) button.loading = true;
    try {
      const highlighter = components.get(OBCF.Highlighter);
      await highlighter.clear();
      try {
        const smartViews = components.get(SmartViews);
        smartViews.currentState.colors = { queries: new Map(), items: new Map() };
      } catch {}
    } catch (error) {
      console.error("[Highlighter] Error clearing colors:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  // =========================================================================
  // Lesson 3.9: Visibility Operations with Fragments (Hide, Isolate, Show All)
  // =========================================================================
  const onHideSelected = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;

    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("[Hider] Select an element first to hide.");
      return;
    }

    if (button) button.loading = true;
    try {
      const hider = components.get(OBC.Hider);
      const cloned = OBC.ModelIdMapUtils.clone(selection);
      await Promise.all([hider.set(false, cloned), highlighter.clear("select")]);
      try {
        const smartViews = components.get(SmartViews);
        smartViews.recordVisibility("hide", cloned);
      } catch {}
    } catch (error) {
      console.error("[Hider] Error hiding selected elements:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  const onIsolateSelected = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;

    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("[Hider] Select an element first to isolate.");
      return;
    }

    if (button) button.loading = true;
    try {
      const hider = components.get(OBC.Hider);
      const cloned = OBC.ModelIdMapUtils.clone(selection);
      await Promise.all([hider.isolate(cloned), highlighter.clear("select")]);
      try {
        const smartViews = components.get(SmartViews);
        smartViews.recordVisibility("isolate", cloned);
      } catch {}
    } catch (error) {
      console.error("[Hider] Error isolating selected elements:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  const onShowAll = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    if (button) button.loading = true;
    try {
      const hider = components.get(OBC.Hider);
      await hider.set(true);
      try {
        const smartViews = components.get(SmartViews);
        smartViews.recordVisibility("showAll");
      } catch {}
    } catch (error) {
      console.error("[Hider] Error restoring all hidden elements:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  // =========================================================================
  // Lesson 3.10: Ghost Model Visualization Feature (X-Ray Translucent Mode)
  // Smart Toggle:
  // - If elements are selected: ghosts unselected elements (highlighting focal items).
  // - Clicking Ghost Selected directly ghosts only the active selection.
  // - Clear Ghost restores 100% normal shading.
  // =========================================================================
  const applyGhostItems = async (mode: "invert" | "selected" | "all") => {
    try {
      const fragments = components.get(OBC.FragmentsManager);
      const highlighter = components.get(OBCF.Highlighter);
      const world = resolveWorld();

      const selection = highlighter.selection.select;
      const hasSelection = selection && !OBC.ModelIdMapUtils.isEmpty(selection);

      isGhostActive = true;

      // 1. Native @thatopen/fragments GPU X-Ray Ghost Mode
      if (fragments.initialized && fragments.list.size > 0) {
        fragments.core.setGhostOpacity(0.35);
        for (const [modelId, model] of fragments.list) {
          if (!model) continue;
          const selectedLocalIds = selection?.[modelId] ? [...selection[modelId]] : [];

          if (mode === "selected") {
            // Ghost ONLY selected items (invert = false)
            if (selectedLocalIds.length > 0 && typeof model.setGhostItems === "function") {
              await model.setGhostItems(selectedLocalIds, false);
            }
          } else if (mode === "invert") {
            // Ghost everything EXCEPT selected items (invert = true)
            if (typeof model.setGhostItems === "function") {
              await model.setGhostItems(selectedLocalIds, true);
            }
          } else {
            // Ghost whole model (empty array with invert = true ghosts all)
            if (typeof model.setGhostItems === "function") {
              await model.setGhostItems([], true);
            }
          }
        }
        fragments.core.update(true);
      }

      // 2. Also support non-Fragment 3D Parametric meshes cleanly
      if (world?.scene?.three) {
        world.scene.three.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          if (obj.name.includes("grid") || (obj as any).isGrid) return;
          if ((obj as any).isLODMesh || obj.parent?.name === "fragments") return;

          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            if (!mat || originalThreeMaterials.has(mat)) continue;
            originalThreeMaterials.set(mat, {
              opacity: mat.opacity,
              transparent: mat.transparent,
              depthWrite: mat.depthWrite,
            });
            mat.transparent = true;
            mat.opacity = 0.30;
            mat.depthWrite = false;
            mat.needsUpdate = true;
          }
        });
      }

      if (ghostButton) {
        ghostButton.active = true;
        ghostButton.style.background = "rgba(56, 189, 248, 0.25)";
      }
    } catch (err) {
      console.error("[Ghost] Error applying ghost mode:", err);
    }
  };

  const clearGhostMode = () => {
    try {
      const fragments = components.get(OBC.FragmentsManager);
      const world = resolveWorld();

      isGhostActive = false;

      if (fragments.initialized) {
        for (const [, model] of fragments.list) {
          model?.clearGhost?.();
        }
        fragments.core?.update(true);
      }

      for (const [mat, saved] of originalThreeMaterials) {
        mat.opacity = saved.opacity;
        mat.transparent = saved.transparent;
        mat.depthWrite = saved.depthWrite;
        mat.needsUpdate = true;
      }
      originalThreeMaterials.clear();

      if (ghostButton) {
        ghostButton.active = false;
        ghostButton.style.background = "";
      }
    } catch (err) {
      console.error("[Ghost] Error clearing ghost mode:", err);
    }
  };

  const onToggleGhostMode = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    if (button) button.loading = true;
    try {
      if (isGhostActive) {
        clearGhostMode();
      } else {
        const highlighter = components.get(OBCF.Highlighter);
        const selection = highlighter.selection.select;
        const hasSelection = selection && !OBC.ModelIdMapUtils.isEmpty(selection);
        await applyGhostItems(hasSelection ? "invert" : "all");
      }
    } finally {
      if (button) button.loading = false;
    }
  };

  const onGhostSelectedOnly = async () => {
    BUI.ContextMenu.removeMenus();
    await applyGhostItems("selected");
  };

  const onGhostAllExceptSelected = async () => {
    BUI.ContextMenu.removeMenus();
    await applyGhostItems("invert");
  };

  const onClearGhostAction = () => {
    BUI.ContextMenu.removeMenus();
    clearGhostMode();
  };

  // =========================================================================
  // Lesson 3.13: Camera Focus & Fit to Selection / Full Model
  // =========================================================================
  const onFocusSelection = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;
    const world = resolveWorld();
    if (!world) return;

    if (button) button.loading = true;
    try {
      const hasSelection = Boolean(selection && !OBC.ModelIdMapUtils.isEmpty(selection));
      const fragments = components.get(OBC.FragmentsManager);

      if (world.camera instanceof OBC.SimpleCamera && fragments.initialized && fragments.list.size > 0) {
        await world.camera.fitToItems(hasSelection ? selection : undefined);
        if (!world.isDisposing) fragments.core.update(true);
      } else {
        const controls = (world.camera as any)?.controls;
        if (controls && world.scene?.three) {
          const bbox = new THREE.Box3();
          world.scene.three.traverse((child: any) => {
            if (child.isMesh && !child.name?.includes("grid") && !child.name?.includes("selection-box")) {
              bbox.expandByObject(child);
            }
          });
          if (!bbox.isEmpty()) {
            await controls.fitToBox(bbox, true, {
              paddingLeft: 1.25,
              paddingRight: 1.25,
              paddingTop: 1.25,
              paddingBottom: 1.25,
            });
          }
        }
      }
    } catch (error) {
      console.error("[Focus] Error fitting camera:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  return BUI.html`
    <bim-toolbar style="background: rgba(15, 23, 42, 0.90); backdrop-filter: blur(16px); border: 1px solid rgba(56, 189, 248, 0.28); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 3px 5px; pointer-events: auto; --bim-button--fz: 0.72rem; max-width: 100%; overflow-x: auto;">
      <!-- Section 1: Colorizing (Lesson 3.8) -->
      <bim-toolbar-section label="Colorize">
        <bim-button
          icon="flowbite:palette-outline"
          tooltip="Colorize Selected Items (Lesson 3.8)"
          label="Color"
        >
          <bim-context-menu>
            <div style="display: flex; flex-direction: column; gap: 0.6rem; padding: 0.75rem; min-width: 14rem; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; backdrop-filter: blur(16px);">
              <bim-color-input
                ${BUI.ref((element) => {
                  colorInput = element as BUI.ColorInput;
                })}
                label="Pick Item Color"
                color="#3b82f6"
              ></bim-color-input>
              <bim-button
                @click=${onApplyColor}
                label="Apply Color"
                icon="flowbite:check-outline"
                style="--bim-button-background: #0284c7; color: white; font-weight: 600;"
              ></bim-button>
            </div>
          </bim-context-menu>
        </bim-button>

        <bim-button
          @click=${onClearColors}
          icon="flowbite:trash-bin-outline"
          label="Reset"
          tooltip="Clear all applied color styles"
        ></bim-button>
      </bim-toolbar-section>

      <!-- Section 2: Visibility Operations (Lesson 3.9) -->
      <bim-toolbar-section label="Visibility">
        <bim-button
          @click=${onHideSelected}
          icon="flowbite:eye-slash-outline"
          label="Hide"
          tooltip="Hide selected items (Lesson 3.9)"
        ></bim-button>
        <bim-button
          @click=${onIsolateSelected}
          icon="flowbite:expand-outline"
          label="Isolate"
          tooltip="Isolate selected items (Lesson 3.9)"
        ></bim-button>
        <bim-button
          @click=${onShowAll}
          icon="flowbite:eye-outline"
          label="Show All"
          tooltip="Restore all hidden elements (Lesson 3.9)"
        ></bim-button>
      </bim-toolbar-section>

      <!-- Section 3: Visual Modes & Navigation (Lessons 3.10 & 3.13) -->
      <bim-toolbar-section label="View">
        <bim-button
          ${BUI.ref((element) => {
            ghostButton = element as BUI.Button;
          })}
          icon="flowbite:lightbulb-outline"
          label="Ghost"
          tooltip="Toggle translucent X-ray ghost mode (Lesson 3.10)"
        >
          <bim-context-menu>
            <div style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.65rem; min-width: 13rem; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; backdrop-filter: blur(16px);">
              <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Ghost / X-Ray Options</span>
              <bim-button
                @click=${onToggleGhostMode}
                label="Toggle Ghost Mode"
                icon="flowbite:lightbulb-outline"
                style="--bim-button-background: rgba(30, 41, 59, 0.85); color: #f8fafc;"
              ></bim-button>
              <bim-button
                @click=${onGhostSelectedOnly}
                label="Ghost Selected Only"
                icon="flowbite:eye-slash-outline"
                style="--bim-button-background: rgba(30, 41, 59, 0.85); color: #f8fafc;"
              ></bim-button>
              <bim-button
                @click=${onGhostAllExceptSelected}
                label="Ghost Unselected (Focus)"
                icon="flowbite:expand-outline"
                style="--bim-button-background: rgba(30, 41, 59, 0.85); color: #f8fafc;"
              ></bim-button>
              <bim-button
                @click=${onClearGhostAction}
                label="Clear Ghost Shading"
                icon="flowbite:trash-bin-outline"
                style="--bim-button-background: rgba(239, 68, 68, 0.2); color: #ef4444;"
              ></bim-button>
            </div>
          </bim-context-menu>
        </bim-button>
        <bim-button
          @click=${onFocusSelection}
          icon="solar:camera-bold"
          label="Focus"
          tooltip="Focus camera on selected items or whole model (Lesson 3.13)"
        ></bim-button>
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
