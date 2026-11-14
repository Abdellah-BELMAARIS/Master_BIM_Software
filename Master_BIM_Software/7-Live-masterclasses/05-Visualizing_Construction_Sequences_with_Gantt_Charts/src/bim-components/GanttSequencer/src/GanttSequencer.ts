import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import type * as FRAGS from "@thatopen/fragments";
import type { GanttTask } from "../../../components/GanttChart";
import { unwrapIfcAttr } from "../../DataEnhancer";

export type GanttGroupingMode = "storeys" | "disciplines" | "rebar";

const TASK_PALETTE = [
  "#b45309",
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#e11d48",
  "#ec4899",
  "#64748b",
  "#84cc16",
];

const DISCIPLINE_SEQUENCE: Array<{
  name: string;
  regex: string;
  color: string;
  weeks: number;
}> = [
  { name: "Site & Foundations", regex: "IFCFOOTING|IFCPILE|IFCSITE", color: "#b45309", weeks: 3 },
  { name: "Rebar & Ferraillage", regex: "IFCREINFORCINGBAR|IFCREINFORCINGMESH|IFCTENDON", color: "#e11d48", weeks: 3 },
  { name: "Columns & Structural Frame", regex: "IFCCOLUMN|IFCMEMBER", color: "#2563eb", weeks: 4 },
  { name: "Beams & Girders", regex: "IFCBEAM", color: "#f59e0b", weeks: 3 },
  { name: "Slabs & Floor Decks", regex: "IFCSLAB", color: "#10b981", weeks: 4 },
  { name: "Walls & Core", regex: "IFCWALL|IFCWALLSTANDARDCASE", color: "#64748b", weeks: 5 },
  { name: "Roof & Stairs", regex: "IFCROOF|IFCSTAIR|IFCSTAIRFLIGHT|IFCRAILING", color: "#8b5cf6", weeks: 3 },
  { name: "Doors & Glazing", regex: "IFCDOOR|IFCWINDOW|IFCCURTAINWALL", color: "#06b6d4", weeks: 3 },
  { name: "MEP & Fixtures", regex: "IFCPIPE|IFCDUCT|IFCFLOW|IFCFURNISHINGELEMENT", color: "#ec4899", weeks: 4 },
];

const REBAR_STRUCTURE_SEQUENCE = DISCIPLINE_SEQUENCE.slice(0, 7);

const ALL_BLDG_ELEMENTS_REGEX =
  /IFCWALL|IFCWALLSTANDARDCASE|IFCSLAB|IFCCOLUMN|IFCBEAM|IFCMEMBER|IFCFOOTING|IFCREINFORCINGBAR|IFCREINFORCINGMESH|IFCTENDON|IFCROOF|IFCDOOR|IFCWINDOW|IFCSTAIR|IFCSTAIRFLIGHT|IFCRAILING|IFCCURTAINWALL|IFCFURNISHINGELEMENT|IFCPIPE|IFCDUCT|IFCFLOW/;

/**
 * Module 6 (Folder 05): GanttSequencer Component
 * Bridges the <bim-gantt-chart> Lit+SVG component with OBC.ItemsFinder & OBF.Highlighter
 * (plus procedural Three.js fallback) for live 4D construction sequence visualization.
 */
export class GanttSequencer extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "b2c8e140-5f93-4e2c-9a11-7d4b3c90e501";
  enabled = true;

  readonly onStateChanged = new OBC.Event<void>();
  readonly onDisposed = new OBC.Event<void>();

  tasks: GanttTask[] = [];
  groupingMode: GanttGroupingMode = "storeys";
  activeTaskId: string | null = null;
  playheadRatio = 0;
  currentDate: Date = new Date();
  isPlaying = false;
  speedMultiplier = 1;
  isGhostActive = false;
  isBusy = false;
  statusMessage = "Load a BIM model and click Auto-Generate to build a Gantt sequence.";

  private activeBuiltIds = new Set<string>();
  private taskIdMaps = new Map<string, OBC.ModelIdMap>();
  private taskMeshes = new Map<string, THREE.Mesh[]>();
  private savedMeshMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private playTimer: ReturnType<typeof setInterval> | null = null;

  constructor(components: OBC.Components) {
    super(components);
    components.add(GanttSequencer.uuid, this);
  }

  private resolveWorld(): OBC.World | undefined {
    const worlds = this.components.get(OBC.Worlds);
    return [...worlds.list.values()][0];
  }

  private getStyleName(taskId: string): string {
    return `gantt-${taskId}`;
  }

  private ensureTaskHighlightStyle(task: GanttTask) {
    try {
      const highlighter = this.components.get(OBF.Highlighter);
      const styleName = this.getStyleName(task.id);
      if (!highlighter.styles.has(styleName)) {
        highlighter.styles.set(styleName, {
          color: new THREE.Color(task.color),
          renderedFaces: 1,
          opacity: 1,
          transparent: false,
        });
      }
    } catch {}
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private collectProceduralMeshes(): THREE.Mesh[] {
    const world = this.resolveWorld();
    if (!world?.scene?.three) return [];
    const meshes: THREE.Mesh[] = [];
    world.scene.three.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
      if (obj.name.startsWith("__") || obj.parent?.name.startsWith("__")) return;
      const gName = obj.geometry?.type || "";
      if (gName === "PlaneGeometry" && obj.scale.x > 50) return;
      meshes.push(obj);
    });
    return meshes;
  }

  private async resolveTaskElements(task: GanttTask): Promise<{
    map: OBC.ModelIdMap;
    meshes: THREE.Mesh[];
    count: number;
  }> {
    const fragments = this.components.get(OBC.FragmentsManager);
    if (fragments.list.size > 0 && task.query.length > 0) {
      const finder = this.components.get(OBC.ItemsFinder);
      const qName = `__gantt_${task.id}`;
      finder.create(qName, task.query);
      const q = finder.list.get(qName);
      const map: OBC.ModelIdMap = q ? await q.test() : {};
      let count = 0;
      for (const ids of Object.values(map)) {
        count += ids.size;
      }
      return { map, meshes: [], count };
    }

    // Procedural 3D Twin fallback
    const allMeshes = this.collectProceduralMeshes();
    const matched: THREE.Mesh[] = [];
    const catRe = task.categoryPattern ? new RegExp(task.categoryPattern, "i") : null;
    const storeyTarget = (task.storeyName || "").toLowerCase();

    for (const m of allMeshes) {
      const u = m.userData || {};
      const cat = String(u.ifcType || u.category || u.type || m.name || "").toUpperCase();
      const storey = String(u.storey || u.level || u.floor || "").toLowerCase();

      if (storeyTarget) {
        if (storey && storey === storeyTarget) {
          matched.push(m);
        } else if (!storey && storeyTarget.includes("level")) {
          const box = new THREE.Box3().setFromObject(m);
          const minY = box.min.y;
          const idxMatch = storeyTarget.match(/(\d+)/);
          if (idxMatch) {
            const lvl = Number(idxMatch[1]);
            if (minY >= (lvl - 1) * 3 - 0.5 && minY < lvl * 3 + 0.5) {
              matched.push(m);
            }
          }
        }
      } else if (catRe) {
        if (catRe.test(cat) || catRe.test(m.name)) {
          matched.push(m);
        }
      }
    }

    return { map: {}, meshes: matched, count: matched.length };
  }

  private getStoreyRank(name: string): number {
    const s = name.toLowerCase();
    if (/basement|sous[- ]?sol|sotano|sótano|subfloor|-\d+/.test(s)) return -1;
    if (/foundation|footing|semelle|fondation|site|slab on grade/.test(s)) return -0.5;
    if (/ground|rdc|rez[- ]?de|planta baja|pb\b|level\s*0\b|nivel\s*0\b|floor\s*0\b/.test(s)) return 0;
    if (/roof|terrace|toiture|cubierta|attic|penthouse/.test(s)) return 999;
    if (/first|1st|nivel\s*1\b|level\s*1\b|r\+1|uno\b/.test(s)) return 1;
    if (/second|2nd|nivel\s*2\b|level\s*2\b|r\+2|dos\b/.test(s)) return 2;
    if (/third|3rd|nivel\s*3\b|level\s*3\b|r\+3|tres\b/.test(s)) return 3;
    if (/fourth|4th|nivel\s*4\b|level\s*4\b|r\+4|cuatro\b/.test(s)) return 4;
    if (/fifth|5th|nivel\s*5\b|level\s*5\b|r\+5|cinco\b/.test(s)) return 5;
    const numMatch = s.match(/(?:level|nivel|floor|etage|étage|r\+)\s*(\d+)/i);
    if (numMatch) return Number(numMatch[1]);
    return 50;
  }

  private getStoreyColor(name: string, idx: number): string {
    const rank = this.getStoreyRank(name);
    if (rank < 0) return "#b45309";
    if (rank === 0) return "#10b981";
    if (rank === 1) return "#2563eb";
    if (rank === 2) return "#38bdf8";
    if (rank >= 999) return "#8b5cf6";
    return TASK_PALETTE[idx % TASK_PALETTE.length];
  }

  private async discoverStoreyNames(): Promise<string[]> {
    const fragments = this.components.get(OBC.FragmentsManager);
    const names = new Set<string>();

    if (fragments.list.size > 0) {
      try {
        const finder = this.components.get(OBC.ItemsFinder);
        finder.create("__gantt_storeys", [{ categories: [/IFCBUILDINGSTOREY/] }]);
        const q = finder.list.get("__gantt_storeys");
        const map = q ? await q.test() : {};
        for (const [modelId, ids] of Object.entries(map)) {
          const model = fragments.list.get(modelId);
          if (!model || !ids.size) continue;
          const items = await model.getItemsData([...ids]);
          for (const item of items) {
            const name = unwrapIfcAttr((item as any).Name) || unwrapIfcAttr((item as any).LongName);
            if (name && typeof name === "string" && name.trim()) {
              names.add(name.trim());
            }
          }
        }
      } catch (err) {
        console.warn("[GanttSequencer] Storey discovery error:", err);
      }
    }

    if (names.size === 0) {
      const meshes = this.collectProceduralMeshes();
      const ys = new Set<number>();
      for (const m of meshes) {
        const u = m.userData || {};
        const st = String(u.storey || u.level || u.floor || "").trim();
        if (st) {
          names.add(st);
        } else {
          const box = new THREE.Box3().setFromObject(m);
          ys.add(Math.max(1, Math.floor(Math.max(0, box.min.y) / 3) + 1));
        }
      }
      if (names.size === 0 && ys.size > 0) {
        for (const lvl of [...ys].sort((a, b) => a - b)) {
          names.add(`Level ${lvl}`);
        }
      }
    }

    return [...names].sort((a, b) => {
      const rankDiff = this.getStoreyRank(a) - this.getStoreyRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });
  }

  async generateSequence(mode: GanttGroupingMode = this.groupingMode): Promise<GanttTask[]> {
    this.isBusy = true;
    this.groupingMode = mode;
    this.pause();
    await this.clearAllHighlights();
    const modeLabel =
      mode === "storeys"
        ? "by Construction Storeys"
        : mode === "rebar"
        ? "by Structure & Ferraillage"
        : "by CYPE Disciplines";
    this.statusMessage = `Scanning model (${modeLabel})...`;
    this.onStateChanged.trigger();

    try {
      const baseStart = new Date(2026, 0, 5);
      const nextTasks: GanttTask[] = [];

      if (mode === "storeys") {
        const storeys = await this.discoverStoreyNames();
        if (storeys.length > 0) {
          let cursor = new Date(baseStart);
          storeys.forEach((storeyName, idx) => {
            const startDate = new Date(cursor);
            const endDate = new Date(cursor);
            endDate.setDate(endDate.getDate() + 21);
            cursor = new Date(startDate);
            cursor.setDate(cursor.getDate() + 14);

            const escaped = this.escapeRegex(storeyName);
            nextTasks.push({
              id: `storey-${idx + 1}`,
              name: storeyName,
              color: this.getStoreyColor(storeyName, idx),
              startDate,
              endDate,
              storeyName,
              query: [
                {
                  categories: [ALL_BLDG_ELEMENTS_REGEX],
                  relation: {
                    name: "ContainedInStructure",
                    query: {
                      categories: [/IFCBUILDINGSTOREY/],
                      attributes: {
                        queries: [{ name: /^Name$/, value: new RegExp(escaped, "i") }],
                      },
                    },
                  },
                },
              ],
            });
          });
        }
      }

      if (nextTasks.length === 0) {
        const seq = mode === "rebar" ? REBAR_STRUCTURE_SEQUENCE : DISCIPLINE_SEQUENCE;
        let cursor = new Date(baseStart);
        seq.forEach((def, idx) => {
          const startDate = new Date(cursor);
          const endDate = new Date(cursor);
          endDate.setDate(endDate.getDate() + def.weeks * 7);
          cursor = new Date(startDate);
          cursor.setDate(cursor.getDate() + Math.max(7, Math.floor((def.weeks * 7) / 2)));

          nextTasks.push({
            id: `disc-${idx + 1}`,
            name: def.name,
            color: def.color,
            startDate,
            endDate,
            categoryPattern: def.regex,
            query: [{ categories: [new RegExp(def.regex, "i")] }],
          });
        });
      }

      this.taskIdMaps.clear();
      this.taskMeshes.clear();

      const populated: GanttTask[] = [];
      for (const t of nextTasks) {
        this.ensureTaskHighlightStyle(t);
        const resolved = await this.resolveTaskElements(t);
        t.elementCount = resolved.count;
        this.taskIdMaps.set(t.id, resolved.map);
        this.taskMeshes.set(t.id, resolved.meshes);
        if (resolved.count > 0 || nextTasks.length <= 8) {
          populated.push(t);
        }
      }

      this.tasks = populated.length > 0 ? populated : nextTasks;
      this.playheadRatio = 0;
      this.activeTaskId = null;
      this.activeBuiltIds.clear();
      this.currentDate = this.tasks[0]?.startDate ?? new Date();

      const totalMatched = this.tasks.reduce((acc, t) => acc + (t.elementCount ?? 0), 0);
      this.statusMessage =
        totalMatched > 0
          ? `Generated ${this.tasks.length} tasks (${totalMatched} elements mapped). Drag the red playhead or press Play.`
          : `Generated ${this.tasks.length} template tasks. Load an IFC / 3D model to link live elements.`;
      return this.tasks;
    } finally {
      this.isBusy = false;
      this.onStateChanged.trigger();
    }
  }

  private async applyTaskColor(task: GanttTask) {
    this.ensureTaskHighlightStyle(task);
    let map = this.taskIdMaps.get(task.id);
    let meshes = this.taskMeshes.get(task.id);
    if (!map && !meshes) {
      const resolved = await this.resolveTaskElements(task);
      map = resolved.map;
      meshes = resolved.meshes;
      task.elementCount = resolved.count;
      this.taskIdMaps.set(task.id, map);
      this.taskMeshes.set(task.id, meshes);
    }

    if (map && Object.keys(map).length > 0) {
      try {
        const highlighter = this.components.get(OBF.Highlighter);
        await highlighter.highlightByID(this.getStyleName(task.id), map, false, false);
      } catch {}
    }

    if (meshes && meshes.length > 0) {
      for (const m of meshes) {
        if (!this.savedMeshMaterials.has(m)) {
          this.savedMeshMaterials.set(m, m.material);
        }
        m.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(task.color),
          roughness: 0.45,
          metalness: 0.1,
        });
      }
    }
  }

  private async clearTaskColor(task: GanttTask) {
    try {
      const highlighter = this.components.get(OBF.Highlighter);
      await highlighter.clear(this.getStyleName(task.id));
    } catch {}

    const meshes = this.taskMeshes.get(task.id);
    if (meshes) {
      for (const m of meshes) {
        const orig = this.savedMeshMaterials.get(m);
        if (orig) {
          m.material = orig;
          this.savedMeshMaterials.delete(m);
        }
      }
    }
  }

  async clearAllHighlights() {
    for (const t of this.tasks) {
      await this.clearTaskColor(t);
    }
    this.activeBuiltIds.clear();
    this.activeTaskId = null;
  }

  /**
   * Masterclass rule:
   * - Colorize when playhead date >= task.startDate
   * - Clear only when playhead date < task.startDate
   * - Act only on state transitions for smooth 60fps scrubbing
   */
  async setPlayheadDate(date: Date, ratio: number) {
    this.currentDate = date;
    this.playheadRatio = ratio;
    const ms = date.getTime();

    for (const task of this.tasks) {
      const shouldBeBuilt = ratio > 0 && ms >= task.startDate.getTime();
      const wasBuilt = this.activeBuiltIds.has(task.id);

      if (shouldBeBuilt && !wasBuilt) {
        this.activeBuiltIds.add(task.id);
        await this.applyTaskColor(task);
      } else if (!shouldBeBuilt && wasBuilt) {
        this.activeBuiltIds.delete(task.id);
        await this.clearTaskColor(task);
      }
    }

    this.statusMessage = `${date.toLocaleDateString()} · ${this.activeBuiltIds.size}/${this.tasks.length} tasks active`;
    this.onStateChanged.trigger();
  }

  async focusTask(task: GanttTask) {
    this.activeTaskId = task.id;
    await this.clearAllHighlights();
    this.activeTaskId = task.id;
    this.activeBuiltIds.add(task.id);
    await this.applyTaskColor(task);
    this.statusMessage = `Focused "${task.name}" (${task.elementCount ?? 0} elements)`;
    this.onStateChanged.trigger();
  }

  play() {
    if (this.isPlaying || this.tasks.length === 0) return;
    if (this.playheadRatio >= 1) {
      this.playheadRatio = 0;
    }
    this.isPlaying = true;
    this.onStateChanged.trigger();

    const minMs = Math.min(...this.tasks.map((t) => t.startDate.getTime()));
    const maxMs = Math.max(...this.tasks.map((t) => t.endDate.getTime()));
    const span = Math.max(1, maxMs - minMs);

    this.playTimer = setInterval(() => {
      const nextRatio = Math.min(1, this.playheadRatio + 0.015 * this.speedMultiplier);
      const nextDate = new Date(minMs + nextRatio * span);
      void this.setPlayheadDate(nextDate, nextRatio);
      if (nextRatio >= 1) {
        this.pause();
      }
    }, 120);
  }

  pause() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    this.isPlaying = false;
    this.onStateChanged.trigger();
  }

  async reset() {
    this.pause();
    this.playheadRatio = 0;
    this.currentDate = this.tasks[0]?.startDate ?? new Date();
    await this.clearAllHighlights();
    this.statusMessage = "Timeline reset to start.";
    this.onStateChanged.trigger();
  }

  setSpeed(speed: number) {
    this.speedMultiplier = speed;
    this.onStateChanged.trigger();
  }

  toggleGhostMode() {
    this.isGhostActive = !this.isGhostActive;
    const fragments = this.components.get(OBC.FragmentsManager);
    try {
      for (const [, mat] of fragments.core.models.materials.list) {
        if ("opacity" in mat) {
          (mat as any).transparent = this.isGhostActive;
          (mat as any).opacity = this.isGhostActive ? 0.16 : 1;
          (mat as any).depthWrite = !this.isGhostActive;
        }
      }
      fragments.core.update(true);
    } catch {}

    // Procedural meshes fallback
    const meshes = this.collectProceduralMeshes();
    for (const m of meshes) {
      if (this.savedMeshMaterials.has(m)) continue;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if (mat && "opacity" in mat) {
          (mat as any).transparent = this.isGhostActive;
          (mat as any).opacity = this.isGhostActive ? 0.16 : 1;
          (mat as any).depthWrite = !this.isGhostActive;
          mat.needsUpdate = true;
        }
      }
    }

    this.statusMessage = this.isGhostActive
      ? "Ghost mode ON — active Gantt colors pop through the structure."
      : "Ghost mode OFF — solid model view.";
    this.onStateChanged.trigger();
  }

  async addCustomTask(input: {
    name: string;
    startDate: string;
    endDate: string;
    categoryRegex: string;
    color: string;
  }) {
    const start = new Date(input.startDate || Date.now());
    const end = new Date(input.endDate || Date.now() + 14 * 86_400_000);
    const id = `custom-${Date.now()}`;
    const task: GanttTask = {
      id,
      name: input.name.trim() || "Custom Phase",
      color: input.color || TASK_PALETTE[this.tasks.length % TASK_PALETTE.length],
      startDate: start,
      endDate: end > start ? end : new Date(start.getTime() + 7 * 86_400_000),
      categoryPattern: input.categoryRegex.trim() || "IFCWALL|IFCSLAB",
      query: [{ categories: [new RegExp(input.categoryRegex.trim() || "IFCWALL|IFCSLAB", "i")] }],
    };
    this.ensureTaskHighlightStyle(task);
    const resolved = await this.resolveTaskElements(task);
    task.elementCount = resolved.count;
    this.taskIdMaps.set(task.id, resolved.map);
    this.taskMeshes.set(task.id, resolved.meshes);
    this.tasks = [...this.tasks, task];
    this.statusMessage = `Added task "${task.name}" (${resolved.count} elements).`;
    this.onStateChanged.trigger();
  }

  async removeTask(taskId: string) {
    const t = this.tasks.find((x) => x.id === taskId);
    if (t) await this.clearTaskColor(t);
    this.tasks = this.tasks.filter((x) => x.id !== taskId);
    this.taskIdMaps.delete(taskId);
    this.taskMeshes.delete(taskId);
    this.activeBuiltIds.delete(taskId);
    this.onStateChanged.trigger();
  }

  exportCsv() {
    const lines = [
      ["Task", "StartDate", "EndDate", "CategoryRegex", "Storey", "Color", "Elements"].join(","),
      ...this.tasks.map((t) =>
        [
          `"${t.name.replace(/"/g, '""')}"`,
          t.startDate.toISOString().slice(0, 10),
          t.endDate.toISOString().slice(0, 10),
          `"${(t.categoryPattern || "").replace(/"/g, '""')}"`,
          `"${(t.storeyName || "").replace(/"/g, '""')}"`,
          t.color,
          String(t.elementCount ?? 0),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gantt-sequence-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    this.statusMessage = `Exported ${this.tasks.length} Gantt tasks to CSV.`;
    this.onStateChanged.trigger();
  }

  async importCsvText(csvText: string) {
    const rows = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (rows.length < 2) return;

    await this.clearAllHighlights();
    this.taskIdMaps.clear();
    this.taskMeshes.clear();

    const imported: GanttTask[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      const [name, startStr, endStr, catRegex, storey, color] = cols;
      if (!name) continue;
      const startDate = new Date(startStr || Date.now());
      const endDate = new Date(endStr || startDate.getTime() + 14 * 86_400_000);
      const task: GanttTask = {
        id: `csv-${i}-${Date.now()}`,
        name,
        color: color || TASK_PALETTE[(i - 1) % TASK_PALETTE.length],
        startDate,
        endDate,
        categoryPattern: catRegex || undefined,
        storeyName: storey || undefined,
        query: storey
          ? [
              {
                categories: [ALL_BLDG_ELEMENTS_REGEX],
                relation: {
                  name: "ContainedInStructure",
                  query: {
                    categories: [/IFCBUILDINGSTOREY/],
                    attributes: {
                      queries: [{ name: /^Name$/, value: new RegExp(this.escapeRegex(storey), "i") }],
                    },
                  },
                },
              },
            ]
          : [{ categories: [new RegExp(catRegex || "IFCWALL|IFCSLAB", "i")] }],
      };
      this.ensureTaskHighlightStyle(task);
      const resolved = await this.resolveTaskElements(task);
      task.elementCount = resolved.count;
      this.taskIdMaps.set(task.id, resolved.map);
      this.taskMeshes.set(task.id, resolved.meshes);
      imported.push(task);
    }

    if (imported.length > 0) {
      this.tasks = imported;
      this.playheadRatio = 0;
      this.statusMessage = `Imported ${imported.length} tasks from CSV schedule.`;
      this.onStateChanged.trigger();
    }
  }

  dispose() {
    this.pause();
    void this.clearAllHighlights();
    this.onStateChanged.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}
