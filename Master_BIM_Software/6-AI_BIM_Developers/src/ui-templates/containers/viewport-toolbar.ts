import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import { SmartViews } from "../../bim-components/SmartViews";
import { FragmentsEditStudio } from "../../bim-components/FragmentsEditStudio";

export type ProSceneMoodId = "obsidian" | "studio" | "blueprint" | "daylight";
export type ProRenderLookId = "shaded" | "clay" | "wireframe";

export interface ViewportToolbarState {
  components: OBC.Components;
  world?: OBC.World;
  openMenu?: "color" | "ghost" | "studio" | "edit" | null;
  activeColor?: string;
  ghostMode?: "off" | "invert" | "selected" | "all";
  ghostOpacity?: number;
  sceneMood?: ProSceneMoodId;
  renderLook?: ProRenderLookId;
  isDisciplineColored?: boolean;
  notice?: { text: string; tone: "info" | "warn" } | null;
  isBusy?: boolean;
}

interface ToolbarRuntime {
  originalGhostMaterials: Map<
    THREE.Material,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >;
  originalWireframes: Map<THREE.Material, boolean>;
  originalLights: Map<THREE.Light, number>;
  originalBackground: THREE.Color | THREE.Texture | null | undefined;
  toastTimer: ReturnType<typeof setTimeout> | null;
  outsideListenerBound: boolean;
  shellEl: HTMLElement | null;
}

const runtimeMap = new WeakMap<OBC.Components, ToolbarRuntime>();

const getRuntime = (components: OBC.Components): ToolbarRuntime => {
  let rt = runtimeMap.get(components);
  if (!rt) {
    rt = {
      originalGhostMaterials: new Map(),
      originalWireframes: new Map(),
      originalLights: new Map(),
      originalBackground: undefined,
      toastTimer: null,
      outsideListenerBound: false,
      shellEl: null,
    };
    runtimeMap.set(components, rt);
  }
  return rt;
};

const PRESET_COLORS = [
  { label: "Steel Blue", color: "#2563eb" },
  { label: "Emerald", color: "#10b981" },
  { label: "Crimson", color: "#ef4444" },
  { label: "Amber", color: "#f59e0b" },
  { label: "Orchid", color: "#a855f7" },
  { label: "Aqua", color: "#06b6d4" },
  { label: "Slate", color: "#475569" },
  { label: "Pure White", color: "#ffffff" },
];

const DISCIPLINE_PALETTE = [
  { name: "Walls", regex: "IFCWALL|IFCWALLSTANDARDCASE|IFCCURTAINWALL", color: "#38bdf8" },
  { name: "Slabs & Roofs", regex: "IFCSLAB|IFCROOF|IFCPLATE", color: "#0ea5e9" },
  { name: "Structure", regex: "IFCCOLUMN|IFCBEAM|IFCMEMBER|IFCFOOTING|IFCPILE", color: "#f59e0b" },
  { name: "Glazing", regex: "IFCWINDOW", color: "#06b6d4" },
  { name: "Doors", regex: "IFCDOOR", color: "#10b981" },
  { name: "Circulation", regex: "IFCSTAIR|IFCSTAIRFLIGHT|IFCRAMP|IFCRAILING", color: "#a855f7" },
];

const SCENE_MOODS: Array<{
  id: ProSceneMoodId;
  label: string;
  bg: string;
  lightFactor: number;
}> = [
    { id: "obsidian", label: "Obsidian", bg: "#0b1120", lightFactor: 1.0 },
    { id: "studio", label: "Studio Dark", bg: "#171c26", lightFactor: 1.35 },
    { id: "blueprint", label: "Blueprint", bg: "#091b34", lightFactor: 1.18 },
    { id: "daylight", label: "Daylight", bg: "#d9e2ec", lightFactor: 1.55 },
  ];

const isHelperOrGrid = (obj: THREE.Object3D): boolean =>
  obj.name.includes("grid") ||
  obj.name.includes("helper") ||
  obj.name.includes("selection-box") ||
  Boolean((obj as { isGrid?: boolean }).isGrid);

/**
 * Module 4 & 5: Pro Appearance Studio Floating HUD
 * Unifies Colorize (Swatches, Discipline IFC Coding, Hex), Visibility (Hide, Isolate, Show All),
 * Live X-Ray Ghost Engine (opacity slider + focus/select modes), Scene Lighting Moods,
 * Architectural Clay / Wireframe Looks, and Camera Focus into one calm Autodesk-style HUD.
 */
export const viewportToolbarTemplate: BUI.StatefullComponent<ViewportToolbarState> = (
  state: ViewportToolbarState,
  update
) => {
  const { components } = state;
  const runtime = getRuntime(components);

  const openMenu = state.openMenu ?? null;
  const activeColor = state.activeColor || "#3b82f6";
  const ghostMode = state.ghostMode || "off";
  const ghostOpacity = state.ghostOpacity ?? 0.28;
  const sceneMood = state.sceneMood || "obsidian";
  const renderLook = state.renderLook || "shaded";
  const isDisciplineColored = Boolean(state.isDisciplineColored);
  const notice = state.notice ?? null;

  const notify = (text: string, tone: "info" | "warn" = "info") => {
    if (runtime.toastTimer) clearTimeout(runtime.toastTimer);
    update({ notice: { text, tone } });
    runtime.toastTimer = setTimeout(() => {
      update({ notice: null });
    }, 2600);
  };

  const resolveWorld = (): OBC.World | undefined => {
    if (state.world) return state.world;
    const worlds = components.get(OBC.Worlds);
    return [...worlds.list.values()][0];
  };

  const bindOutsideClick = (el?: Element) => {
    if (!el) return;
    runtime.shellEl = el as HTMLElement;
    if (runtime.outsideListenerBound) return;
    runtime.outsideListenerBound = true;
    document.addEventListener("pointerdown", (ev) => {
      if (!runtime.shellEl) return;
      if (!runtime.shellEl.contains(ev.target as Node)) {
        update({ openMenu: null });
      }
    });
  };

  const toggleMenu = (menu: "color" | "ghost" | "studio" | "edit") => {
    update({ openMenu: openMenu === menu ? null : menu });
  };

  // =========================================================================
  // 1. Colorize Operations (Direct Swatch, Hex, IFC Discipline Auto-Color)
  // =========================================================================
  const applyColorDirectly = async (hexColor: string) => {
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;
    const selectedMesh = (window as unknown as { __selectedThreeMesh?: THREE.Mesh | null })
      .__selectedThreeMesh;

    if ((!selection || OBC.ModelIdMapUtils.isEmpty(selection)) && !selectedMesh) {
      update({ activeColor: hexColor });
      notify("Select a BIM element in 3D first", "warn");
      return;
    }

    try {
      if (selection && !OBC.ModelIdMapUtils.isEmpty(selection)) {
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
          components.get(SmartViews).addItemsColor(cloned, hexColor);
        } catch { }
      }

      if (selectedMesh) {
        if (!selectedMesh.userData.__originalMaterial) {
          selectedMesh.userData.__originalMaterial = selectedMesh.material;
        }
        const newMat = (selectedMesh.material as THREE.Material).clone();
        if ("color" in newMat) {
          (newMat as THREE.MeshStandardMaterial).color = new THREE.Color(hexColor);
        }
        selectedMesh.material = newMat;
        try {
          components
            .get(SmartViews)
            .currentState.colors.items.set(hexColor, { "3d": new Set([selectedMesh.id]) });
        } catch { }
      }

      update({ activeColor: hexColor, openMenu: null });
      notify(`Applied ${hexColor.toUpperCase()} override`);
    } catch (error) {
      console.error("[Highlighter] Error applying color:", error);
    }
  };

  const onAutoColorDiscipline = async () => {
    update({ isBusy: true, openMenu: null });
    try {
      const finder = components.get(OBC.ItemsFinder);
      const highlighter = components.get(OBCF.Highlighter);
      const smartViews = (() => {
        try {
          return components.get(SmartViews);
        } catch {
          return null;
        }
      })();

      let paintedGroups = 0;
      for (const group of DISCIPLINE_PALETTE) {
        const matched = await finder.getItems([{ categories: [new RegExp(group.regex, "i")] }]);
        if (OBC.ModelIdMapUtils.isEmpty(matched)) continue;

        if (!highlighter.styles.has(group.color)) {
          highlighter.styles.set(group.color, {
            color: new THREE.Color(group.color),
            opacity: 1,
            transparent: false,
            renderedFaces: 0,
          });
        }
        await highlighter.highlightByID(group.color, matched, false, false);
        smartViews?.addItemsColor(matched, group.color);
        paintedGroups++;
      }

      update({ isBusy: false, isDisciplineColored: paintedGroups > 0 });
      notify(
        paintedGroups > 0
          ? `Discipline-coded ${paintedGroups} IFC category groups`
          : "No standard IFC categories found to colorize",
        paintedGroups > 0 ? "info" : "warn"
      );
    } catch (error) {
      console.error("[Appear] Auto-colorize failed:", error);
      update({ isBusy: false });
    }
  };

  // =========================================================================
  // 2. Render Finishes (Shaded, Clay White, Wireframe) & Scene Lighting Mood
  // =========================================================================
  const clearRenderFinish = async () => {
    const world = resolveWorld();
    const highlighter = components.get(OBCF.Highlighter);
    try {
      await highlighter.clear("__pro_clay");
    } catch { }

    for (const [mat, prevWire] of runtime.originalWireframes) {
      if ("wireframe" in mat) {
        (mat as THREE.MeshStandardMaterial).wireframe = prevWire;
        mat.needsUpdate = true;
      }
    }
    runtime.originalWireframes.clear();

    if (world?.scene?.three) {
      world.scene.three.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.__originalClayMaterial) {
          obj.material = obj.userData.__originalClayMaterial;
          delete obj.userData.__originalClayMaterial;
        }
      });
    }
  };

  const applyRenderLook = async (look: ProRenderLookId) => {
    update({ openMenu: null });
    await clearRenderFinish();

    const world = resolveWorld();
    if (look === "shaded") {
      update({ renderLook: "shaded" });
      notify("Restored shaded PBR appearance");
      return;
    }

    if (look === "wireframe") {
      if (world?.scene?.three) {
        world.scene.three.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh) || isHelperOrGrid(obj)) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            if (!mat || !("wireframe" in mat)) continue;
            const std = mat as THREE.MeshStandardMaterial;
            if (!runtime.originalWireframes.has(mat)) {
              runtime.originalWireframes.set(mat, Boolean(std.wireframe));
            }
            std.wireframe = true;
            std.needsUpdate = true;
          }
        });
      }
      update({ renderLook: "wireframe" });
      notify("CAD Wireframe edges enabled");
      return;
    }

    // Clay architectural white finish
    try {
      const finder = components.get(OBC.ItemsFinder);
      const highlighter = components.get(OBCF.Highlighter);
      const allIfc = await finder.getItems([{ categories: [/^IFC/i] }]);
      if (!OBC.ModelIdMapUtils.isEmpty(allIfc)) {
        if (!highlighter.styles.has("__pro_clay")) {
          highlighter.styles.set("__pro_clay", {
            color: new THREE.Color("#e2e8f0"),
            opacity: 1,
            transparent: false,
            renderedFaces: 0,
          });
        }
        await highlighter.highlightByID("__pro_clay", allIfc, false, false);
      }

      if (world?.scene?.three) {
        const clayMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.85,
          metalness: 0.04,
        });
        world.scene.three.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh) || isHelperOrGrid(obj)) return;
          if ((obj as { isLODMesh?: boolean }).isLODMesh || obj.parent?.name === "fragments") return;
          if (!obj.userData.__originalClayMaterial) {
            obj.userData.__originalClayMaterial = obj.material;
          }
          obj.material = clayMat;
        });
      }

      update({ renderLook: "clay" });
      notify("Architectural Clay massing finish applied");
    } catch (error) {
      console.error("[Appear] Clay finish error:", error);
    }
  };

  const applySceneMood = (moodId: ProSceneMoodId) => {
    const mood = SCENE_MOODS.find((m) => m.id === moodId) || SCENE_MOODS[0];
    const world = resolveWorld();
    if (world?.scene?.three instanceof THREE.Scene) {
      const scene = world.scene.three;
      if (runtime.originalBackground === undefined) {
        runtime.originalBackground = scene.background;
      }

      if (mood.id === "obsidian" && runtime.originalBackground !== undefined) {
        scene.background = runtime.originalBackground;
      } else {
        scene.background = new THREE.Color(mood.bg);
      }

      const sceneCfg = (world.scene as unknown as { config?: { backgroundColor?: THREE.Color } })
        .config;
      if (sceneCfg) {
        sceneCfg.backgroundColor = new THREE.Color(mood.bg);
      }

      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Light)) return;
        if (!runtime.originalLights.has(obj)) {
          runtime.originalLights.set(obj, obj.intensity);
        }
        const base = runtime.originalLights.get(obj) ?? obj.intensity;
        obj.intensity = Number((base * mood.lightFactor).toFixed(2));
      });
    }

    update({ sceneMood: mood.id, openMenu: null });
    notify(`Viewport mood: ${mood.label}`);
  };

  // =========================================================================
  // 3. Ghost X-Ray Engine (Live Opacity + Invert / Selected / Full Model)
  // =========================================================================
  const clearGhostMode = (silent = false) => {
    try {
      const fragments = components.get(OBC.FragmentsManager);
      if (fragments.initialized) {
        for (const [, model] of fragments.list) {
          model?.clearGhost?.();
        }
        fragments.core?.update(true);
      }

      for (const [mat, saved] of runtime.originalGhostMaterials) {
        mat.opacity = saved.opacity;
        mat.transparent = saved.transparent;
        mat.depthWrite = saved.depthWrite;
        mat.needsUpdate = true;
      }
      runtime.originalGhostMaterials.clear();

      update({ ghostMode: "off" });
      if (!silent) notify("Restored normal shading");
    } catch (err) {
      console.error("[Ghost] Error restoring normal shading:", err);
    }
  };

  const applyGhostItems = async (
    mode: "invert" | "selected" | "all",
    opacityOverride?: number
  ) => {
    const nextOpacity = opacityOverride ?? ghostOpacity;
    try {
      const fragments = components.get(OBC.FragmentsManager);
      const highlighter = components.get(OBCF.Highlighter);
      const world = resolveWorld();

      const selection = highlighter.selection.select;
      const hasSelection = Boolean(selection && !OBC.ModelIdMapUtils.isEmpty(selection));
      const effectiveMode: "invert" | "selected" | "all" =
        mode === "selected" && !hasSelection ? "all" : mode;

      if (fragments.initialized && fragments.list.size > 0) {
        fragments.core.setGhostOpacity(nextOpacity);
        for (const [modelId, model] of fragments.list) {
          if (!model || typeof model.setGhostItems !== "function") continue;
          const selectedLocalIds = selection?.[modelId] ? [...selection[modelId]] : [];
          if (effectiveMode === "selected" && selectedLocalIds.length > 0) {
            await model.setGhostItems(selectedLocalIds, false);
          } else if (effectiveMode === "invert") {
            await model.setGhostItems(selectedLocalIds, true);
          } else {
            await model.setGhostItems([], true);
          }
        }
        fragments.core.update(true);
      }

      if (world?.scene?.three) {
        world.scene.three.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh) || isHelperOrGrid(obj)) return;
          if ((obj as { isLODMesh?: boolean }).isLODMesh || obj.parent?.name === "fragments") return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            if (!mat) continue;
            if (!runtime.originalGhostMaterials.has(mat)) {
              runtime.originalGhostMaterials.set(mat, {
                opacity: mat.opacity,
                transparent: mat.transparent,
                depthWrite: mat.depthWrite,
              });
            }
            mat.transparent = true;
            mat.opacity = nextOpacity;
            mat.depthWrite = false;
            mat.needsUpdate = true;
          }
        });
      }

      update({ ghostMode: effectiveMode, ghostOpacity: nextOpacity, openMenu: null });
      const label =
        effectiveMode === "invert"
          ? "X-Ray Focus (Context ghosted)"
          : effectiveMode === "selected"
            ? "X-Ray Selection"
            : "Full Model X-Ray";
      notify(`${label} · ${Math.round(nextOpacity * 100)}%`);
    } catch (err) {
      console.error("[Ghost] Error applying translucent x-ray:", err);
    }
  };

  const onGhostOpacitySlider = (val: number) => {
    const clamped = Math.min(0.75, Math.max(0.1, val));
    update({ ghostOpacity: clamped });
    if (ghostMode === "off") return;

    try {
      const fragments = components.get(OBC.FragmentsManager);
      if (fragments.initialized) {
        fragments.core.setGhostOpacity(clamped);
        fragments.core.update(true);
      }
      for (const [mat] of runtime.originalGhostMaterials) {
        mat.opacity = clamped;
        mat.needsUpdate = true;
      }
    } catch { }
  };

  // =========================================================================
  // 4. Visibility, Activate Full & Reset Full Operations
  // =========================================================================

  /**
   * Restores clean visibility, material/X-ray/finish state, and optionally resets
   * Fragment Editor requests & Clipper sections across the active workspace.
   */
  const restoreWorkspaceState = async (options: {
    resetFragments: boolean;
    resetSections: boolean;
    resetCamera: boolean;
    label: string;
  }) => {
    try {
      const hider = components.get(OBC.Hider);
      const highlighter = components.get(OBCF.Highlighter);
      const fragments = components.get(OBC.FragmentsManager);

      if (options.resetFragments && fragments.initialized) {
        for (const model of fragments.list.values()) {
          try {
            await fragments.core.editor.reset(model.modelId);
          } catch {}
        }
        try {
          await components.get(FragmentsEditStudio).syncAfterExternalReset();
        } catch {}
      }

      if (options.resetSections) {
        try {
          components.get(OBC.Clipper).deleteAll();
        } catch {}
      }

      await Promise.all([hider.set(true), highlighter.clear()]);
      clearGhostMode(true);
      await clearRenderFinish();

      const world = resolveWorld();
      if (world?.scene?.three) {
        world.scene.three.traverse((obj) => {
          if (obj instanceof THREE.Mesh && !obj.name.includes("helper")) {
            obj.visible = true;
            if (obj.userData.__originalMaterial) {
              obj.material = obj.userData.__originalMaterial;
              delete obj.userData.__originalMaterial;
            }
          }
        });
      }
      const box = (window as unknown as { __selectionBoxHelper?: THREE.Object3D })
        .__selectionBoxHelper;
      if (box) box.visible = true;

      try {
        const sv = components.get(SmartViews);
        sv.recordVisibility("showAll");
        sv.currentState.colors = { queries: new Map(), items: new Map() };
      } catch {}

      if (fragments.initialized && !world?.isDisposing) {
        fragments.core.update(true);
      }

      if (options.resetCamera) {
        await applySceneMood("obsidian");
        await onFocusSelection();
      }

      update({
        openMenu: null,
        ghostMode: "off",
        renderLook: "shaded",
        isDisciplineColored: false,
      });
      notify(options.label);
    } catch (error) {
      console.error("[ViewportToolbar] Error restoring workspace state:", error);
      notify("Failed restoring state", "warn");
    }
  };

  const onResetFull = () =>
    restoreWorkspaceState({
      resetFragments: true,
      resetSections: true,
      resetCamera: true,
      label: "Reset Full: restored model, transforms, materials & camera",
    });

  const onActivateFull = async () => {
    window.dispatchEvent(new CustomEvent("toc-activate-full-view"));
    await restoreWorkspaceState({
      resetFragments: false,
      resetSections: true,
      resetCamera: true,
      label: "Activated Full Viewer + Model Extents",
    });
  };

  const onHideSelected = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;
    const selectedMesh = (window as unknown as { __selectedThreeMesh?: THREE.Mesh | null })
      .__selectedThreeMesh;

    if ((!selection || OBC.ModelIdMapUtils.isEmpty(selection)) && !selectedMesh) {
      notify("Select an element first to hide", "warn");
      return;
    }

    try {
      if (selection && !OBC.ModelIdMapUtils.isEmpty(selection)) {
        const hider = components.get(OBC.Hider);
        const cloned = OBC.ModelIdMapUtils.clone(selection);
        await Promise.all([hider.set(false, cloned), highlighter.clear("select")]);
        try {
          components.get(SmartViews).recordVisibility("hide", cloned);
        } catch { }
      }
      if (selectedMesh) {
        selectedMesh.visible = false;
        const box = (window as unknown as { __selectionBoxHelper?: THREE.Object3D })
          .__selectionBoxHelper;
        if (box) box.visible = false;
      }
      notify("Hidden selected elements");
    } catch (error) {
      console.error("[Hider] Error hiding selected:", error);
    }
  };

  const onIsolateSelected = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;
    const selectedMesh = (window as unknown as { __selectedThreeMesh?: THREE.Mesh | null })
      .__selectedThreeMesh;

    if ((!selection || OBC.ModelIdMapUtils.isEmpty(selection)) && !selectedMesh) {
      notify("Select an element first to isolate", "warn");
      return;
    }

    try {
      if (selection && !OBC.ModelIdMapUtils.isEmpty(selection)) {
        const hider = components.get(OBC.Hider);
        const cloned = OBC.ModelIdMapUtils.clone(selection);
        await Promise.all([hider.isolate(cloned), highlighter.clear("select")]);
        try {
          components.get(SmartViews).recordVisibility("isolate", cloned);
        } catch { }
      }
      if (selectedMesh) {
        const world = resolveWorld();
        world?.scene?.three.traverse((obj) => {
          if (obj instanceof THREE.Mesh && !isHelperOrGrid(obj)) {
            obj.visible = obj === selectedMesh;
          }
        });
      }
      notify("Isolated selected elements");
    } catch (error) {
      console.error("[Hider] Error isolating selected:", error);
    }
  };

  const onShowAll = () =>
    restoreWorkspaceState({
      resetFragments: false,
      resetSections: false,
      resetCamera: false,
      label: "Show All: restored full element visibility",
    });

  const onFocusSelection = async () => {
    const highlighter = components.get(OBCF.Highlighter);
    const selection = highlighter.selection.select;
    const world = resolveWorld();
    if (!world) return;

    try {
      const hasSelection = Boolean(selection && !OBC.ModelIdMapUtils.isEmpty(selection));
      const fragments = components.get(OBC.FragmentsManager);
      const selectedMesh = (window as unknown as { __selectedThreeMesh?: THREE.Mesh | null })
        .__selectedThreeMesh;

      if (world.camera instanceof OBC.SimpleCamera && fragments.initialized && fragments.list.size > 0 && hasSelection) {
        await world.camera.fitToItems(selection);
        if (!world.isDisposing) fragments.core.update(true);
        notify("Framed selected elements");
      } else if (selectedMesh) {
        const controls = (world.camera as { controls?: { fitToBox: Function } })?.controls;
        if (controls) {
          const bbox = new THREE.Box3().setFromObject(selectedMesh);
          if (!bbox.isEmpty()) {
            await controls.fitToBox(bbox, true, {
              paddingLeft: 1.3,
              paddingRight: 1.3,
              paddingTop: 1.3,
              paddingBottom: 1.3,
            });
            notify("Framed selected mesh");
          }
        }
      } else {
        const controls = (world.camera as { controls?: { fitToBox: Function } })?.controls;
        if (controls && world.scene?.three) {
          const bbox = new THREE.Box3();
          world.scene.three.traverse((child) => {
            if (child instanceof THREE.Mesh && !isHelperOrGrid(child)) {
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
            notify("Framed full model");
          }
        }
      }
    } catch (error) {
      console.error("[Focus] Error fitting camera:", error);
    }
  };

  const studioBadge =
    renderLook !== "shaded"
      ? renderLook === "clay"
        ? "Clay"
        : "Wire"
      : sceneMood !== "obsidian"
        ? SCENE_MOODS.find((m) => m.id === sceneMood)?.label || ""
        : "";

  return BUI.html`
    <bim-toolbar class="toc-pro-appear-toolbar">
      <div class="toc-pro-shell" ${BUI.ref(bindOutsideClick)}>
        <div class="toc-pro-bar">
          <!-- Group 1: Colorize -->
          <div class="toc-pro-group">
            <span class="toc-pro-group-label">Colorize</span>
            <div class="toc-pro-group-row">
              <button
                type="button"
                class="toc-pro-btn ${openMenu === "color" || isDisciplineColored ? "active" : ""}"
                @click=${() => toggleMenu("color")}
                title="AEC Palette, Hex Override & Discipline Coding"
              >
                <span class="toc-pro-swatch-dot" style="background: ${activeColor};"></span>
                <span>Color</span>
                <span class="material-icons-round toc-pro-caret">expand_more</span>
              </button>
              <button
                type="button"
                class="toc-pro-btn warn"
                @click=${onResetFull}
                title="Reset Full: Restore Fragment Edits, Colors, X-Ray, Sections & View"
              >
                <span class="material-icons-round">restart_alt</span>
                <span>Reset Full</span>
              </button>
            </div>
          </div>

          <div class="toc-pro-sep"></div>

          <!-- Group 2: Visibility -->
          <div class="toc-pro-group">
            <span class="toc-pro-group-label">Visibility</span>
            <div class="toc-pro-group-row">
              <button
                type="button"
                class="toc-pro-btn"
                @click=${onHideSelected}
                title="Hide Selected Elements (H)"
              >
                <span class="material-icons-round">visibility_off</span>
                <span>Hide</span>
                <span class="toc-pro-kbd">H</span>
              </button>
              <button
                type="button"
                class="toc-pro-btn"
                @click=${onIsolateSelected}
                title="Isolate Selected Elements"
              >
                <span class="material-icons-round">filter_center_focus</span>
                <span>Isolate</span>
              </button>
              <button
                type="button"
                class="toc-pro-btn"
                @click=${onShowAll}
                title="Show All: Restore All Hidden Elements, Colors & X-Ray"
              >
                <span class="material-icons-round">visibility</span>
                <span>Show All</span>
              </button>
              <button
                type="button"
                class="toc-pro-btn"
                @click=${onActivateFull}
                title="Activate Full: Enable Full Model, Clear Section Cuts & Frame Extents"
              >
                <span class="material-icons-round">select_all</span>
                <span>Activate Full</span>
              </button>
            </div>
          </div>

          <div class="toc-pro-sep"></div>

          <!-- Group 3: X-Ray & Ghost -->
          <div class="toc-pro-group">
            <span class="toc-pro-group-label">X-Ray</span>
            <div class="toc-pro-group-row">
              <button
                type="button"
                class="toc-pro-btn ${ghostMode !== "off" || openMenu === "ghost" ? "active" : ""}"
                @click=${() => toggleMenu("ghost")}
                title="Translucent X-Ray Focus & Live Opacity"
              >
                <span class="material-icons-round">blur_on</span>
                <span>Ghost</span>
                ${ghostMode !== "off"
      ? BUI.html`<span class="toc-pro-chip">${Math.round(ghostOpacity * 100)}%</span>`
      : ""}
                <span class="material-icons-round toc-pro-caret">expand_more</span>
              </button>
            </div>
          </div>

          <div class="toc-pro-sep"></div>

          <!-- Group 4: Render Studio & Camera -->
          <div class="toc-pro-group">
            <span class="toc-pro-group-label">Appearance</span>
            <div class="toc-pro-group-row">
              <button
                type="button"
                class="toc-pro-btn ${openMenu === "studio" || studioBadge ? "active" : ""}"
                @click=${() => toggleMenu("studio")}
                title="Scene Lighting Mood & Render Finish (Clay / Wireframe)"
              >
                <span class="material-icons-round">auto_awesome</span>
                <span>Studio</span>
                ${studioBadge ? BUI.html`<span class="toc-pro-chip">${studioBadge}</span>` : ""}
                <span class="material-icons-round toc-pro-caret">expand_more</span>
              </button>
              <button
                type="button"
                class="toc-pro-btn"
                @click=${onFocusSelection}
                title="Frame Selection or Full Model (F)"
              >
                <span class="material-icons-round">center_focus_strong</span>
                <span>Focus</span>
                <span class="toc-pro-kbd">F</span>
              </button>
            </div>
          </div>

          <div class="toc-pro-sep"></div>

          <!-- Group 5: Fragments Edit API -->
          <div class="toc-pro-group">
            <span class="toc-pro-group-label">Edits</span>
            <div class="toc-pro-group-row">
              <button
                type="button"
                class="toc-pro-btn ${openMenu === "edit" ? "active" : ""}"
                @click=${() => toggleMenu("edit")}
                title="Fragments Edit API: Transforms, Items & Sample Instances"
              >
                <span class="material-icons-round">edit</span>
                <span>Edit</span>
                <span class="material-icons-round toc-pro-caret">expand_more</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Popover 1: Pro Colorize Studio -->
        ${openMenu === "color"
      ? BUI.html`
              <div class="toc-pro-popover">
                <div class="toc-pro-pop-title">
                  <span>AEC Discipline Swatches</span>
                  <span style="color: #7dd3fc;">${activeColor.toUpperCase()}</span>
                </div>
                <div class="toc-pro-swatch-grid">
                  ${PRESET_COLORS.map(
        (p) => BUI.html`
                      <button
                        type="button"
                        class="toc-pro-swatch-tile ${activeColor.toLowerCase() === p.color ? "selected" : ""}"
                        style="background: ${p.color};"
                        title="${p.label}"
                        @click=${() => applyColorDirectly(p.color)}
                      ></button>
                    `
      )}
                </div>

                <div style="display: flex; align-items: center; gap: 8px; padding-top: 4px; border-top: 1px solid rgba(148,163,184,0.16);">
                  <input
                    type="color"
                    .value=${activeColor}
                    @input=${(e: Event) => {
          const val = (e.target as HTMLInputElement).value;
          update({ activeColor: val });
        }}
                    style="width: 34px; height: 28px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.3); background: transparent; cursor: pointer; padding: 0;"
                  />
                  <span style="font-size: 0.74rem; font-family: monospace; color: #cbd5e1; flex: 1;">
                    ${activeColor.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    class="toc-pro-pop-btn active"
                    style="width: auto; padding: 5px 11px;"
                    @click=${() => applyColorDirectly(activeColor)}
                  >
                    Apply
                  </button>
                </div>

                <button
                  type="button"
                  class="toc-pro-pop-btn ${isDisciplineColored ? "active" : ""}"
                  @click=${onAutoColorDiscipline}
                >
                  <span class="material-icons-round" style="color: #38bdf8;">layers</span>
                  <span>Auto-Colorize by IFC Category</span>
                </button>
              </div>
            `
      : ""}

        <!-- Popover 2: X-Ray & Live Ghost Slider -->
        ${openMenu === "ghost"
      ? BUI.html`
              <div class="toc-pro-popover">
                <div class="toc-pro-pop-title">
                  <span>Translucent X-Ray Engine</span>
                  <span style="color: #7dd3fc;">${Math.round(ghostOpacity * 100)}% Opacity</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.75"
                  step="0.02"
                  .value=${String(ghostOpacity)}
                  @input=${(e: Event) =>
          onGhostOpacitySlider(parseFloat((e.target as HTMLInputElement).value))}
                  style="width: 100%; accent-color: #38bdf8; cursor: pointer;"
                />
                <button
                  type="button"
                  class="toc-pro-pop-btn ${ghostMode === "invert" ? "active" : ""}"
                  @click=${() => applyGhostItems("invert")}
                >
                  <span class="material-icons-round">center_focus_weak</span>
                  <span>Isolate Focus (X-Ray Unselected)</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn ${ghostMode === "selected" ? "active" : ""}"
                  @click=${() => applyGhostItems("selected")}
                >
                  <span class="material-icons-round">visibility_off</span>
                  <span>X-Ray Selected Only</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn ${ghostMode === "all" ? "active" : ""}"
                  @click=${() => applyGhostItems("all")}
                >
                  <span class="material-icons-round">blur_on</span>
                  <span>Full Model Glass X-Ray</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn danger"
                  @click=${() => {
          clearGhostMode();
          update({ openMenu: null });
        }}
                >
                  <span class="material-icons-round">highlight_off</span>
                  <span>Restore Normal Shading</span>
                </button>
              </div>
            `
      : ""}

        <!-- Popover 3: Pro Scene Studio & Finish -->
        ${openMenu === "studio"
      ? BUI.html`
              <div class="toc-pro-popover">
                <div class="toc-pro-pop-title">
                  <span>Viewport Lighting & Backdrop</span>
                </div>
                <div class="toc-pro-mood-grid">
                  ${SCENE_MOODS.map(
        (mood) => BUI.html`
                      <button
                        type="button"
                        class="toc-pro-mood-tile ${sceneMood === mood.id ? "active" : ""}"
                        @click=${() => applySceneMood(mood.id)}
                      >
                        <span class="toc-pro-mood-preview" style="background: ${mood.bg};"></span>
                        <span>${mood.label}</span>
                      </button>
                    `
      )}
                </div>

                <div class="toc-pro-pop-title" style="margin-top: 2px;">
                  <span>Render Finish</span>
                </div>
                <div class="toc-pro-seg">
                  <button
                    type="button"
                    class="toc-pro-seg-btn ${renderLook === "shaded" ? "active" : ""}"
                    @click=${() => applyRenderLook("shaded")}
                  >
                    <span class="material-icons-round" style="font-size: 14px;">tonality</span>
                    <span>Shaded</span>
                  </button>
                  <button
                    type="button"
                    class="toc-pro-seg-btn ${renderLook === "clay" ? "active" : ""}"
                    @click=${() => applyRenderLook("clay")}
                  >
                    <span class="material-icons-round" style="font-size: 14px;">contrast</span>
                    <span>Clay</span>
                  </button>
                  <button
                    type="button"
                    class="toc-pro-seg-btn ${renderLook === "wireframe" ? "active" : ""}"
                    @click=${() => applyRenderLook("wireframe")}
                  >
                    <span class="material-icons-round" style="font-size: 14px;">grid_4x4</span>
                    <span>Wire</span>
                  </button>
                </div>
              </div>
            `
      : ""}

        <!-- Popover 4: Clean Organized Module 6 Fragments Edit Menu -->
        ${openMenu === "edit"
      ? BUI.html`
              <div class="toc-pro-popover">
                <div class="toc-pro-pop-title">
                  <span>Fragments Edit Actions</span>
                  <span style="color: #a1a1aa;">Pro API</span>
                </div>
                <button
                  type="button"
                  class="toc-pro-pop-btn"
                  @click=${async () => {
                    update({ openMenu: null, isBusy: true });
                    await components.get(FragmentsEditStudio).applyExplodedXRayView(6, 0.5, "storeys");
                    update({ isBusy: false });
                    notify("Activated Exploded Coordination View (50% X-Ray)");
                  }}
                >
                  <span class="material-icons-round" style="color: #f59e0b;">view_in_ar</span>
                  <span>Exploded Coordination (Levels + 50% X-Ray)</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn"
                  @click=${async () => {
                    update({ openMenu: null, isBusy: true });
                    await components.get(FragmentsEditStudio).explodeStoreysOrHeights(6, "global", "storeys");
                    update({ isBusy: false });
                    notify("Exploded building floor levels");
                  }}
                >
                  <span class="material-icons-round" style="color: #e4e4e7;">layers</span>
                  <span>Explode Floor Levels</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn"
                  @click=${async () => {
                    update({ openMenu: null, isBusy: true });
                    await components.get(FragmentsEditStudio).explodeStoreysOrHeights(6, "global", "disciplines");
                    update({ isBusy: false });
                    notify("Separated IFC discipline stacks");
                  }}
                >
                  <span class="material-icons-round" style="color: #38bdf8;">view_agenda</span>
                  <span>Explode by IFC Discipline</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn"
                  @click=${async () => {
                    update({ openMenu: null, isBusy: true });
                    await components.get(FragmentsEditStudio).bulkScaleMaterialsOpacity(0.5);
                    update({ isBusy: false });
                    notify("Reduced all materials opacity by 50%");
                  }}
                >
                  <span class="material-icons-round" style="color: #a855f7;">opacity</span>
                  <span>50% Model Opacity (Material Edit)</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn"
                  @click=${async () => {
                    update({ openMenu: null, isBusy: true });
                    await components.get(FragmentsEditStudio).updateMetadata({
                      editedBy: "Abdellah BELMAARIS",
                      editedWith: "Master BIM AI Studio",
                      lastEditedAt: new Date().toISOString(),
                    });
                    update({ isBusy: false });
                    notify("Updated model Metadata (localId: 0)");
                  }}
                >
                  <span class="material-icons-round" style="color: #10b981;">badge</span>
                  <span>Stamp Metadata (localId: 0)</span>
                </button>

                <div class="toc-pro-pop-title" style="margin-top: 2px;">
                  <span>Workspace</span>
                </div>
                <button
                  type="button"
                  class="toc-pro-pop-btn"
                  @click=${() => {
                    update({ openMenu: null });
                    window.dispatchEvent(new CustomEvent("toc-open-fragments-edit"));
                  }}
                >
                  <span class="material-icons-round" style="color: #60a5fa;">tune</span>
                  <span>Open Pro Edit Studio (Full Tools)</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn"
                  @click=${() => {
                    update({ openMenu: null });
                    window.dispatchEvent(new CustomEvent("toc-open-modeler"));
                  }}
                >
                  <span class="material-icons-round" style="color: #38bdf8;">precision_manufacturing</span>
                  <span>Open Parametric Modeler</span>
                </button>
                <button
                  type="button"
                  class="toc-pro-pop-btn danger"
                  @click=${onResetFull}
                >
                  <span class="material-icons-round">restart_alt</span>
                  <span>Reset Full (Model + Edits)</span>
                </button>
              </div>
            `
      : ""}

        ${notice
      ? BUI.html`
              <div class="toc-pro-toast ${notice.tone === "warn" ? "warn" : ""}">
                <span class="material-icons-round" style="font-size: 14px;">
                  ${notice.tone === "warn" ? "info" : "check_circle"}
                </span>
                <span>${notice.text}</span>
              </div>
            `
      : ""}
      </div>
    </bim-toolbar>
  `;
};
