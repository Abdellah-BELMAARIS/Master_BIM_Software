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
  // Lesson 3.8 & Mini Challenge: Colorizing Model Items + Quick Preset Palette
  // =========================================================================
  const PRESET_COLORS = [
    { label: "Steel Blue", color: "#2563eb" },
    { label: "Emerald Green", color: "#10b981" },
    { label: "Crimson Red", color: "#ef4444" },
    { label: "Amber Orange", color: "#f59e0b" },
    { label: "Purple Orchid", color: "#a855f7" },
    { label: "Cyan Aqua", color: "#06b6d4" },
    { label: "Charcoal Slate", color: "#475569" },
    { label: "Pure White", color: "#ffffff" },
  ];

  const applyColorDirectly = async (hexColor: string) => {
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;

    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("[Highlighter] Select at least one element before applying color.");
      BUI.ContextMenu.removeMenus();
      return;
    }

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
      } catch { }
    } catch (error) {
      console.error("[Highlighter] Error applying color:", error);
    } finally {
      BUI.ContextMenu.removeMenus();
    }
  };

  const onApplyColor = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    if (!button || !colorInput) return;

    const hexColor = colorInput.color || colorInput.value?.color || "#3b82f6";
    button.loading = true;
    try {
      await applyColorDirectly(hexColor);
    } finally {
      button.loading = false;
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
      } catch { }
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
      } catch { }
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
      } catch { }
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
      } catch { }
    } catch (error) {
      console.error("[Hider] Error restoring all hidden elements:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  // =========================================================================
  // Architectural X-Ray Translucency & Visual Focus Engine
  // - If elements are selected:
  //   * "Ghost Selected Only" applies translucent shader exclusively to the selection.
  //   * "Ghost Unselected (Focus)" makes background context translucent while focal items stay opaque.
  // - If no elements selected:
  //   * "Toggle Translucent X-Ray" renders the full model structure in translucent engineering glass.
  // - "Restore Normal Shading" resets GPU ghost textures and Three.js materials.
  // =========================================================================
  const applyGhostItems = async (mode: "invert" | "selected" | "all") => {
    try {
      const fragments = components.get(OBC.FragmentsManager);
      const highlighter = components.get(OBCF.Highlighter);
      const world = resolveWorld();

      const selection = highlighter.selection.select;
      const hasSelection = selection && !OBC.ModelIdMapUtils.isEmpty(selection);

      // If user asks for "selected" but nothing is selected, gracefully switch to full model x-ray
      const effectiveMode: "invert" | "selected" | "all" =
        mode === "selected" && !hasSelection ? "all" : mode;

      isGhostActive = true;

      // 1. Native @thatopen/fragments GPU X-Ray Ghost Mode
      if (fragments.initialized && fragments.list.size > 0) {
        fragments.core.setGhostOpacity(0.28);
        for (const [modelId, model] of fragments.list) {
          if (!model) continue;
          const selectedLocalIds = selection?.[modelId] ? [...selection[modelId]] : [];

          if (effectiveMode === "selected") {
            // Ghost ONLY selected items (invert = false)
            if (selectedLocalIds.length > 0 && typeof model.setGhostItems === "function") {
              await model.setGhostItems(selectedLocalIds, false);
            }
          } else if (effectiveMode === "invert") {
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
            mat.opacity = 0.25;
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
      console.error("[Ghost] Error applying translucent x-ray mode:", err);
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
      console.error("[Ghost] Error restoring normal shading:", err);
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
      <!-- Section 1: Colorizing -->
      <bim-toolbar-section label="Colorize">
        <bim-button
          icon="flowbite:palette-outline"
          tooltip="Apply Discipline Color Overrides to Selection"
          label="Color"
        >
          <bim-context-menu>
            <div style="display: flex; flex-direction: column; gap: 0.6rem; padding: 0.75rem; min-width: 15rem; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; backdrop-filter: blur(16px);">
              <!-- Mini Challenge: Preset Colors Palette -->
              <span style="font-size: 0.70rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">AEC Discipline Palette</span>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                ${PRESET_COLORS.map(
    (p) => BUI.html`
                    <button
                      type="button"
                      @click=${() => applyColorDirectly(p.color)}
                      style="width: 100%; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: ${p.color}; cursor: pointer; transition: transform 0.15s ease;"
                      title="${p.label}"
                    ></button>
                  `
  )}
              </div>

              <!-- Custom Color Picker -->
              <div style="border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 0.4rem;">
                <bim-color-input
                  ${BUI.ref((element) => {
    colorInput = element as BUI.ColorInput;
  })}
                  label="Hex Color Override"
                  color="#3b82f6"
                ></bim-color-input>
              </div>
              <bim-button
                @click=${onApplyColor}
                label="Apply Color Override"
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
          tooltip="Restore Original Materials & Clear Overrides"
        ></bim-button>
      </bim-toolbar-section>

      <!-- Section 2: Visibility Operations -->
      <bim-toolbar-section label="Visibility">
        <bim-button
          @click=${onHideSelected}
          icon="flowbite:eye-slash-outline"
          label="Hide"
          tooltip="Hide Selected Elements from Scene"
        ></bim-button>
        <bim-button
          @click=${onIsolateSelected}
          icon="flowbite:expand-outline"
          label="Isolate"
          tooltip="Isolate Selected Engineering Elements"
        ></bim-button>
        <bim-button
          @click=${onShowAll}
          icon="flowbite:eye-outline"
          label="Show All"
          tooltip="Restore Full Federated Model Visibility"
        ></bim-button>
      </bim-toolbar-section>

      <!-- Section 3: Visual Modes & Navigation -->
      <bim-toolbar-section label="View">
        <bim-button
          ${BUI.ref((element) => {
    ghostButton = element as BUI.Button;
  })}
          icon="flowbite:lightbulb-outline"
          label="Ghost"
          tooltip="Translucent Architectural X-Ray Shading"
        >
          <bim-context-menu>
            <div style="display: flex; flex-direction: column; gap: 0.45rem; padding: 0.65rem; min-width: 14rem; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; backdrop-filter: blur(16px);">
              <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600; text-transform: uppercase;">X-Ray & Focus Shading</span>
              <bim-button
                @click=${onToggleGhostMode}
                label="Toggle Translucent X-Ray"
                icon="flowbite:lightbulb-outline"
                style="--bim-button-background: rgba(30, 41, 59, 0.85); color: #f8fafc;"
              ></bim-button>
              <bim-button
                @click=${onGhostSelectedOnly}
                label="X-Ray Selected Elements"
                icon="flowbite:eye-slash-outline"
                style="--bim-button-background: rgba(30, 41, 59, 0.85); color: #f8fafc;"
              ></bim-button>
              <bim-button
                @click=${onGhostAllExceptSelected}
                label="Isolate Focal Elements (X-Ray Context)"
                icon="flowbite:expand-outline"
                style="--bim-button-background: rgba(30, 41, 59, 0.85); color: #f8fafc;"
              ></bim-button>
              <bim-button
                @click=${onClearGhostAction}
                label="Restore Normal Shading"
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
          tooltip="Fit & Frame Camera to Selected Elements"
        ></bim-button>
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
