import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import { v4 as uuidv4 } from "uuid";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { database } from "../../../core/database";
import { SmartView, SmartViewCameraState } from "./types";

/**
 * Module 4 — Section 5: Custom BIM Component: Smart Views
 * (Lessons 5.1 to 5.5)
 *
 * Captures, clones, evaluates, and restores complete BIM coordination views combining:
 * - Dynamic query evaluation via OBC.ItemsFinder (queries + relational queries)
 * - Visibility isolation / hiding via OBC.Hider
 * - Persistent multi-style colorization via OBCF.Highlighter
 * - Optional camera viewpoint & projection capture
 */
export class SmartViews extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "6b75f82c-1ad8-4667-bb89-5321f6b5bcf4";
  enabled = true;

  readonly list = new FRAGS.DataMap<string, SmartView>();

  readonly onViewCreated = new OBC.Event<SmartView>();
  readonly onViewApplied = new OBC.Event<SmartView>();
  readonly onViewDeleted = new OBC.Event<string>();
  readonly onViewsReset = new OBC.Event<void>();
  readonly onDisposed = new OBC.Event<void>();

  /**
   * Live cumulative state tracking all manual colorizations, query highlights,
   * and visibility filters applied since the last reset (Lesson 5.4).
   */
  currentState: SmartView;

  constructor(components: OBC.Components) {
    super(components);
    components.add(SmartViews.uuid, this);
    this.currentState = this.createEmptyState("Active Workspace");
  }

  createEmptyState(name = "Current View State"): SmartView {
    return {
      id: "current-state",
      name,
      defaultVisibility: true,
      visibility: {
        exceptions: {
          queries: new Set<string>(),
          items: {},
        },
      },
      colors: {
        queries: new Map<string, Set<string>>(),
        items: new Map<string, OBC.ModelIdMap>(),
      },
      createdAt: Date.now(),
    };
  }

  /**
   * Deep-clones a SmartView definition so presets are never mutated by cumulative edits.
   */
  clone(view: SmartView): SmartView {
    const visQueries = new Set<string>(view.visibility?.exceptions?.queries || []);
    const visItems = view.visibility?.exceptions?.items
      ? OBC.ModelIdMapUtils.clone(view.visibility.exceptions.items)
      : {};

    const colorQueries = new Map<string, Set<string>>();
    if (view.colors?.queries) {
      for (const [color, set] of view.colors.queries) {
        colorQueries.set(color, new Set(set));
      }
    }

    const colorItems = new Map<string, OBC.ModelIdMap>();
    if (view.colors?.items) {
      for (const [color, map] of view.colors.items) {
        colorItems.set(color, OBC.ModelIdMapUtils.clone(map));
      }
    }

    return {
      id: view.id,
      name: view.name,
      description: view.description,
      defaultVisibility: view.defaultVisibility,
      visibility: {
        exceptions: {
          queries: visQueries,
          items: visItems,
        },
      },
      colors: {
        queries: colorQueries,
        items: colorItems,
      },
      camera: view.camera
        ? {
            position: [...view.camera.position],
            target: [...view.camera.target],
            isOrtho: view.camera.isOrtho,
          }
        : undefined,
      createdAt: view.createdAt,
    };
  }

  /**
   * Lesson 5.4: Records a colorized FinderQuery into currentState.
   */
  addQueryColor(queryName: string, color: string): void {
    if (!this.currentState.colors) this.currentState.colors = {};
    if (!this.currentState.colors.queries) {
      this.currentState.colors.queries = new Map();
    }
    const map = this.currentState.colors.queries;
    for (const set of map.values()) {
      set.delete(queryName);
    }
    let set = map.get(color);
    if (!set) {
      set = new Set<string>();
      map.set(color, set);
    }
    set.add(queryName);
  }

  /**
   * Lesson 5.4: Records manually colorized selection items into currentState.
   */
  addItemsColor(items: OBC.ModelIdMap, color: string): void {
    if (OBC.ModelIdMapUtils.isEmpty(items)) return;
    if (!this.currentState.colors) this.currentState.colors = {};
    if (!this.currentState.colors.items) {
      this.currentState.colors.items = new Map();
    }
    const map = this.currentState.colors.items;
    for (const existingMap of map.values()) {
      OBC.ModelIdMapUtils.remove(existingMap, items);
    }
    const currentMap = map.get(color);
    if (currentMap) {
      OBC.ModelIdMapUtils.add(currentMap, items);
    } else {
      map.set(color, OBC.ModelIdMapUtils.clone(items));
    }
  }

  /**
   * Lesson 5.4: Records visibility filter changes into currentState.
   */
  recordVisibility(
    action: "hide" | "isolate" | "showAll",
    items?: OBC.ModelIdMap
  ): void {
    if (action === "showAll") {
      this.currentState.defaultVisibility = true;
      this.currentState.visibility = {
        exceptions: { queries: new Set(), items: {} },
      };
      return;
    }

    if (!items || OBC.ModelIdMapUtils.isEmpty(items)) return;
    if (!this.currentState.visibility) {
      this.currentState.visibility = { exceptions: { queries: new Set(), items: {} } };
    }
    if (!this.currentState.visibility.exceptions) {
      this.currentState.visibility.exceptions = { queries: new Set(), items: {} };
    }

    if (action === "isolate") {
      this.currentState.defaultVisibility = false;
      this.currentState.visibility.exceptions.queries = new Set();
      this.currentState.visibility.exceptions.items = OBC.ModelIdMapUtils.clone(items);
    } else {
      // Hiding items: if defaultVisibility is true, add to hidden exceptions;
      // if defaultVisibility is false (isolated mode), remove from visible exceptions!
      if (!this.currentState.visibility.exceptions.items) {
        this.currentState.visibility.exceptions.items = {};
      }
      if (this.currentState.defaultVisibility) {
        OBC.ModelIdMapUtils.add(this.currentState.visibility.exceptions.items, items);
      } else {
        OBC.ModelIdMapUtils.remove(this.currentState.visibility.exceptions.items, items);
      }
    }
  }

  captureCameraState(): SmartViewCameraState | undefined {
    try {
      const worlds = this.components.get(OBC.Worlds);
      const world = [...worlds.list.values()][0];
      const camera = world?.camera;
      const controls = (camera as any)?.controls;
      if (!world || !camera) return undefined;

      const pos = new THREE.Vector3();
      const target = new THREE.Vector3();
      if (controls) {
        controls.getPosition(pos);
        controls.getTarget(target);
      } else if (camera.three) {
        pos.copy(camera.three.position);
      }

      const isOrtho =
        camera instanceof OBC.OrthoPerspectiveCamera
          ? camera.projection.current === "Orthographic"
          : false;

      return {
        position: [pos.x, pos.y, pos.z],
        target: [target.x, target.y, target.z],
        isOrtho,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Registers a new Smart View definition directly in `list`.
   */
  register(config: Omit<SmartView, "id" | "createdAt"> & { id?: string }): SmartView {
    const id = config.id || uuidv4();
    const view: SmartView = {
      ...config,
      id,
      createdAt: Date.now(),
    };
    this.list.set(id, view);
    return view;
  }

  /**
   * Lesson 5.4: Saves the active workspace state (filters + colors + camera) as a reusable Smart View.
   */
  async create(name: string, description?: string): Promise<SmartView> {
    return this.saveCurrentState(name, description);
  }

  async saveCurrentState(name: string, description?: string): Promise<SmartView> {
    const view = this.clone(this.currentState);
    view.id = uuidv4();
    view.name = name.trim() || `Smart View #${this.list.size + 1}`;
    view.description =
      description?.trim() || "Captured camera, visibility & color overrides";
    view.camera = this.captureCameraState();
    view.createdAt = Date.now();

    this.list.set(view.id, view);
    this.onViewCreated.trigger(view);
    return view;
  }

  /**
   * Evaluates FinderQueries referenced by a Smart View into concrete ModelIdMaps.
   */
  private async evaluateQueryNames(names?: Iterable<string>): Promise<OBC.ModelIdMap> {
    const merged: OBC.ModelIdMap = {};
    if (!names) return merged;

    const finder = this.components.get(OBC.ItemsFinder);
    const promises: Promise<void>[] = [];

    for (const qName of names) {
      const finderQuery = finder.list.get(qName);
      if (!finderQuery) continue;
      promises.push(
        finderQuery.test().then((map) => {
          if (map && !OBC.ModelIdMapUtils.isEmpty(map)) {
            OBC.ModelIdMapUtils.add(merged, map);
          }
        })
      );
    }

    await Promise.all(promises);
    return merged;
  }

  /**
   * Lesson 5.3: Applies a stored Smart View — resets previous state, evaluates queries,
   * updates Hider & Highlighter styles in parallel, and restores camera pose if present.
   */
  async apply(id: string): Promise<void> {
    const targetView = this.list.get(id);
    if (!targetView) {
      console.warn(`[SmartViews] View with ID "${id}" not found.`);
      return;
    }

    await this.reset({ resetCamera: false });
    this.currentState = this.clone(targetView);

    const hider = this.components.get(OBC.Hider);
    const highlighter = this.components.get(OBCF.Highlighter);
    const ops: Promise<any>[] = [];

    // 1. Apply Visibility State (defaultVisibility + query/item exceptions)
    ops.push(hider.set(targetView.defaultVisibility));
    const exceptionMap: OBC.ModelIdMap = targetView.visibility?.exceptions?.items
      ? OBC.ModelIdMapUtils.clone(targetView.visibility.exceptions.items)
      : {};
    const queriedExceptions = await this.evaluateQueryNames(
      targetView.visibility?.exceptions?.queries
    );
    OBC.ModelIdMapUtils.add(exceptionMap, queriedExceptions);

    if (!OBC.ModelIdMapUtils.isEmpty(exceptionMap)) {
      ops.push(hider.set(!targetView.defaultVisibility, exceptionMap));
    }

    // 2. Gather and merge all Color Styles (queries + static item maps)
    const colorBuckets = new Map<string, OBC.ModelIdMap>();

    if (targetView.colors?.items) {
      for (const [hexColor, staticMap] of targetView.colors.items) {
        if (!staticMap || OBC.ModelIdMapUtils.isEmpty(staticMap)) continue;
        const bucket = colorBuckets.get(hexColor) || {};
        OBC.ModelIdMapUtils.add(bucket, staticMap);
        colorBuckets.set(hexColor, bucket);
      }
    }

    if (targetView.colors?.queries) {
      for (const [hexColor, querySet] of targetView.colors.queries) {
        const queriedMap = await this.evaluateQueryNames(querySet);
        if (!OBC.ModelIdMapUtils.isEmpty(queriedMap)) {
          const bucket = colorBuckets.get(hexColor) || {};
          OBC.ModelIdMapUtils.add(bucket, queriedMap);
          colorBuckets.set(hexColor, bucket);
        }
      }
    }

    for (const [hexColor, colorMap] of colorBuckets) {
      if (OBC.ModelIdMapUtils.isEmpty(colorMap)) continue;
      if (!highlighter.styles.has(hexColor)) {
        highlighter.styles.set(hexColor, {
          color: new THREE.Color(hexColor),
          opacity: 1,
          transparent: false,
          renderedFaces: 0,
        });
      }
      ops.push(highlighter.highlightByID(hexColor, colorMap, false, false));
    }

    await Promise.all(ops);

    // 3. Apply saved camera state if this Smart View captured a viewpoint
    if (targetView.camera) {
      try {
        const worlds = this.components.get(OBC.Worlds);
        const world = [...worlds.list.values()][0];
        const camera = world?.camera;
        const controls = (camera as any)?.controls;
        if (camera instanceof OBC.OrthoPerspectiveCamera) {
          const want = targetView.camera.isOrtho ? "Orthographic" : "Perspective";
          if (camera.projection.current !== want) {
            await camera.projection.set(want);
          }
        }
        if (controls) {
          await controls.setLookAt(
            targetView.camera.position[0],
            targetView.camera.position[1],
            targetView.camera.position[2],
            targetView.camera.target[0],
            targetView.camera.target[1],
            targetView.camera.target[2],
            true
          );
        }
      } catch {}
    }

    this.onViewApplied.trigger(targetView);
  }

  /**
   * Lesson 5.5: Resets visibility, highlights, Ghost mode, currentState, and optionally camera.
   */
  async reset(options?: { resetCamera?: boolean }): Promise<void> {
    const fragments = this.components.get(OBC.FragmentsManager);
    const hider = this.components.get(OBC.Hider);
    const highlighter = this.components.get(OBCF.Highlighter);

    const promises: Promise<any>[] = [];
    try {
      promises.push(hider.set(true));
      promises.push(highlighter.clear());
    } catch {}

    await Promise.all(promises);

    // Also clear any active Fragments Ghost X-Ray mode
    try {
      if (fragments.initialized) {
        for (const [, model] of fragments.list) {
          model?.clearGhost?.();
        }
      }
    } catch {}

    this.currentState = this.createEmptyState("Active Workspace");

    if (options?.resetCamera) {
      try {
        const worlds = this.components.get(OBC.Worlds);
        const world = [...worlds.list.values()][0];
        if (world?.camera instanceof OBC.OrthoPerspectiveCamera) {
          if (world.camera.projection.current !== "Perspective") {
            await world.camera.projection.set("Perspective");
          }
          await world.camera.fitToItems();
        } else if (world?.camera instanceof OBC.SimpleCamera) {
          await world.camera.fitToItems();
        }
      } catch {}
    }

    this.onViewsReset.trigger();
  }

  /**
   * Mini Challenge: Serializes Smart Views to clean JSON-safe object.
   */
  export(): { data: any[] } {
    const serializedList: any[] = [];
    for (const [, view] of this.list) {
      serializedList.push({
        id: view.id,
        name: view.name,
        description: view.description,
        defaultVisibility: view.defaultVisibility,
        visibility: {
          exceptions: {
            queries: Array.from(view.visibility?.exceptions?.queries || []),
            items: view.visibility?.exceptions?.items || {},
          },
        },
        colors: {
          queries: view.colors?.queries
            ? Object.fromEntries(
                Array.from(view.colors.queries.entries()).map(([k, set]) => [
                  k,
                  Array.from(set),
                ])
              )
            : {},
          items: view.colors?.items
            ? Object.fromEntries(view.colors.items.entries())
            : {},
        },
        camera: view.camera ? { ...view.camera } : undefined,
        createdAt: view.createdAt,
      });
    }
    return { data: serializedList };
  }

  /**
   * Mini Challenge: Imports serialized Smart Views and adds them to this.list.
   */
  import(result: { data: any[] }): SmartView[] {
    if (!result || !Array.isArray(result.data)) return [];
    const imported: SmartView[] = [];
    for (const raw of result.data) {
      if (!raw || !raw.id || !raw.name) continue;

      const colorQueries = new Map<string, Set<string>>();
      if (raw.colors?.queries) {
        for (const [color, arr] of Object.entries(raw.colors.queries)) {
          if (Array.isArray(arr)) {
            colorQueries.set(color, new Set(arr as string[]));
          }
        }
      }

      const colorItems = new Map<string, OBC.ModelIdMap>();
      if (raw.colors?.items) {
        for (const [color, map] of Object.entries(raw.colors.items)) {
          colorItems.set(color, map as OBC.ModelIdMap);
        }
      }

      const rehydrated: SmartView = {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        defaultVisibility: raw.defaultVisibility ?? true,
        visibility: {
          exceptions: {
            queries: new Set(raw.visibility?.exceptions?.queries || []),
            items: raw.visibility?.exceptions?.items || {},
          },
        },
        colors: {
          queries: colorQueries,
          items: colorItems,
        },
        camera: raw.camera,
        createdAt: raw.createdAt || Date.now(),
      };

      this.list.set(rehydrated.id, rehydrated);
      this.onViewCreated.trigger(rehydrated);
      imported.push(rehydrated);
    }
    return imported;
  }

  /**
   * Mini Challenge: Updates an existing Smart View in place using active workspace state.
   */
  updateViewWithCurrentState(id: string): SmartView | null {
    const existing = this.list.get(id);
    if (!existing) return null;

    const cloned = this.clone(this.currentState);
    cloned.id = existing.id;
    cloned.name = existing.name;
    cloned.description = existing.description;
    cloned.camera = this.captureCameraState() || existing.camera;
    cloned.createdAt = Date.now();

    this.list.set(id, cloned);
    this.onViewCreated.trigger(cloned);
    return cloned;
  }

  /**
   * Mini Challenge: Saves current smart views to Cloud Firestore as part of the project data document.
   */
  async saveToFirestore(projectId: string): Promise<void> {
    if (!projectId || !database) return;
    try {
      const serialized = this.export();
      const projectRef = doc(database, "projects", projectId);
      await updateDoc(projectRef, {
        smartViews: serialized.data,
      });
      console.log(`[SmartViews] Successfully synced ${serialized.data.length} views to Firestore project "${projectId}".`);
    } catch (err) {
      console.warn(`[SmartViews] Could not sync views to Firestore:`, err);
    }
  }

  /**
   * Mini Challenge: Loads and rehydrates smart views from Cloud Firestore project data document.
   */
  async loadFromFirestore(projectId: string): Promise<SmartView[]> {
    if (!projectId || !database) return [];
    try {
      const projectRef = doc(database, "projects", projectId);
      const snap = await getDoc(projectRef);
      if (!snap.exists()) return [];

      const data = snap.data();
      if (data && Array.isArray(data.smartViews) && data.smartViews.length > 0) {
        return this.import({ data: data.smartViews });
      }
    } catch (err) {
      console.warn(`[SmartViews] Error loading views from Firestore:`, err);
    }
    return [];
  }

  delete(id: string): void {
    if (this.list.delete(id)) {
      this.onViewDeleted.trigger(id);
    }
  }

  dispose(): void {
    this.list.dispose();
    this.onViewCreated.reset();
    this.onViewApplied.reset();
    this.onViewDeleted.reset();
    this.onViewsReset.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}

export * from "./types";
