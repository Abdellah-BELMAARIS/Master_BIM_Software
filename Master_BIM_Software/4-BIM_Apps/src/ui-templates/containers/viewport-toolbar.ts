import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";

export interface ViewportToolbarState {
  components: OBC.Components;
}

/**
 * Module 4 — Lessons 3.8 to 3.13: Comprehensive BIM Viewport Toolbar
 * Provides quick-access tools for BIM model inspection & presentation:
 * 1. Lesson 3.8: Element Colorization via dynamic OBCF.Highlighter styles
 * 2. Lesson 3.9: Visibility operations (Hide, Isolate, Show All) via OBC.Hider
 * 3. Lesson 3.10: Ghost Model X-Ray visualization mode
 * 4. Lesson 3.13: Camera Focus & Fit to Selection via OBC.BoundingBoxer
 */
export const viewportToolbarTemplate: BUI.StatefullComponent<ViewportToolbarState> = (
  state: ViewportToolbarState
) => {
  const { components } = state;
  let colorInput: BUI.ColorInput | null = null;
  let isGhostActive = false;

  // =========================================================================
  // Lesson 3.8: Colorizing Model Items
  // =========================================================================
  const onApplyColor = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    if (!button || !colorInput) return;

    const hexColor = (colorInput.value as string) || "#3b82f6";
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;

    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("[Highlighter] No items currently selected to colorize.");
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

      await Promise.all([
        highlighter.highlightByID(hexColor, selection, false, false),
        highlighter.clear("select"),
      ]);
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
      await Promise.all([
        hider.set(false, selection),
        highlighter.clear("select"),
      ]);
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
      await Promise.all([
        hider.isolate(selection),
        highlighter.clear("select"),
      ]);
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
    } catch (error) {
      console.error("[Hider] Error restoring all hidden elements:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  // =========================================================================
  // Lesson 3.10: Ghost Model Visualization Feature (X-Ray Translucent Shader)
  // =========================================================================
  const onToggleGhostMode = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    if (button) button.loading = true;
    try {
      const highlighter = components.get(OBCF.Highlighter);
      const ghostStyle = "ghost-mode-xray";

      if (!highlighter.styles.has(ghostStyle)) {
        highlighter.styles.set(ghostStyle, {
          color: new THREE.Color("#94a3b8"),
          opacity: 0.22,
          transparent: true,
          renderedFaces: 0,
          priority: -1,
        });
      }

      isGhostActive = !isGhostActive;
      const fragments = components.get(OBC.FragmentsManager);

      if (isGhostActive) {
        for (const [modelId, model] of fragments.list) {
          if (model) {
            const allIds = (model as any).getLocalIds ? (model as any).getLocalIds() : [];
            if (allIds.length > 0) {
              await highlighter.highlightByID(ghostStyle, { [modelId]: new Set(allIds) }, false, false);
            }
          }
        }
      } else {
        await highlighter.clear(ghostStyle);
      }
    } catch (error) {
      console.error("[Ghost] Error toggling ghost mode:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  // =========================================================================
  // Lesson 3.13: Camera Focus & Fit to Selection via OBC.BoundingBoxer
  // =========================================================================
  const onFocusSelection = async (e: Event) => {
    const button = e.currentTarget as BUI.Button;
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;

    if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("[Focus] Select an element first to focus camera.");
      return;
    }

    if (button) button.loading = true;
    try {
      const worlds = components.get(OBC.Worlds);
      const world = [...worlds.list.values()][0];
      const controls = (world?.camera as any)?.controls;

      if (controls) {
        const bboxer = components.get(OBC.BoundingBoxer);
        bboxer.list.clear();
        await bboxer.addFromModelIdMap(selection);
        const bbox = bboxer.get();
        if (!bbox.isEmpty()) {
          controls.fitToBox(bbox, true, {
            paddingLeft: 1.25,
            paddingRight: 1.25,
            paddingTop: 1.25,
            paddingBottom: 1.25,
          });
        }
      }
    } catch (error) {
      console.error("[Focus] Error fitting camera to selection:", error);
    } finally {
      if (button) button.loading = false;
    }
  };

  return BUI.html`
    <bim-toolbar style="background: rgba(15, 23, 42, 0.90); backdrop-filter: blur(16px); border: 1px solid rgba(56, 189, 248, 0.28); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 4px 6px;">
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
                value="#3b82f6"
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
      <bim-toolbar-section label="Tools">
        <bim-button
          @click=${onToggleGhostMode}
          icon="flowbite:lightbulb-outline"
          label="Ghost"
          tooltip="Toggle translucent X-ray ghost mode (Lesson 3.10)"
        ></bim-button>
        <bim-button
          @click=${onFocusSelection}
          icon="flowbite:camera-outline"
          label="Focus"
          tooltip="Center camera on selected elements (Lesson 3.13)"
        ></bim-button>
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
