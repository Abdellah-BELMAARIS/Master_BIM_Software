import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { DataEnhancer, unwrapIfcAttr } from "../../DataEnhancer";

export interface ConstructionPhaseInfo {
  id: string;
  label: string;
  startPct: number;
  endPct: number;
  regex: string;
  color: string;
  count: number;
  estCostUsd: number;
  map: OBC.ModelIdMap;
}

export class BimProSuite extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "9a44e821-7d34-4c19-9f51-08b2d1f77301";
  enabled = true;

  readonly onStateChanged = new OBC.Event<void>();
  readonly onDisposed = new OBC.Event<void>();

  phases: ConstructionPhaseInfo[] = [];
  phaseProgress = 100;
  isPlaying4D = false;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  statusMessage = "Ready for Live Property Overrides & .FRAG Export";
  isBusy = false;

  selectedEditTarget: {
    modelId: string;
    localId: number;
    name: string;
    category: string;
    fireRating: string;
    phaseTag: string;
    costUsd: string;
    notes: string;
  } | null = null;

  constructor(components: OBC.Components) {
    super(components);
    components.add(BimProSuite.uuid, this);
  }

  private resolveWorld(): OBC.World | undefined {
    const worlds = this.components.get(OBC.Worlds);
    return [...worlds.list.values()][0];
  }

  // =========================================================================
  // 2. 4D Construction Phasing & CapEx S-Curve Animator
  // =========================================================================
  async buildConstructionPhases(): Promise<ConstructionPhaseInfo[]> {
    const finder = this.components.get(OBC.ItemsFinder);
    const defs = [
      {
        id: "p1",
        label: "Phase 1 · Foundations & Structure",
        startPct: 0,
        endPct: 25,
        regex: "IFCFOOTING|IFCPILES|IFCCOLUMN|IFCBEAM|IFCMEMBER",
        color: "#f59e0b",
        ratePerItem: 1850,
      },
      {
        id: "p2",
        label: "Phase 2 · Core Slabs & Exterior Walls",
        startPct: 25,
        endPct: 55,
        regex: "IFCSLAB|IFCWALL|IFCWALLSTANDARDCASE|IFCCURTAINWALL",
        color: "#38bdf8",
        ratePerItem: 1420,
      },
      {
        id: "p3",
        label: "Phase 3 · Roof, Stairs & Fenestration",
        startPct: 55,
        endPct: 80,
        regex: "IFCROOF|IFCSTAIR|IFCSTAIRFLIGHT|IFCRAILING|IFCWINDOW|IFCDOOR",
        color: "#a855f7",
        ratePerItem: 960,
      },
      {
        id: "p4",
        label: "Phase 4 · MEP, Fixtures & Site",
        startPct: 80,
        endPct: 100,
        regex: "IFCFLOW|IFCPIPE|IFCDUCT|IFCFURNISHING|IFCPLATE|IFCBUILDINGELEMENTPROXY",
        color: "#10b981",
        ratePerItem: 740,
      },
    ];

    const built: ConstructionPhaseInfo[] = [];
    for (const d of defs) {
      let map: OBC.ModelIdMap = {};
      let count = 0;
      try {
        map = await finder.getItems([{ categories: [new RegExp(d.regex, "i")] }]);
        for (const ids of Object.values(map)) count += ids.size;
      } catch {}
      built.push({
        id: d.id,
        label: d.label,
        startPct: d.startPct,
        endPct: d.endPct,
        regex: d.regex,
        color: d.color,
        count,
        estCostUsd: count * d.ratePerItem,
        map,
      });
    }

    this.phases = built;
    this.onStateChanged.trigger();
    return built;
  }

  async setPhaseProgress(pct: number) {
    this.phaseProgress = Math.max(0, Math.min(100, Math.round(pct)));
    if (this.phases.length === 0) {
      await this.buildConstructionPhases();
    }

    const hider = this.components.get(OBC.Hider);
    if (this.phaseProgress >= 100) {
      await hider.set(true);
      this.statusMessage = "4D Simulation: 100% As-Built Complete";
      this.onStateChanged.trigger();
      return;
    }

    const visibleMap: OBC.ModelIdMap = {};
    for (const p of this.phases) {
      if (this.phaseProgress > p.startPct) {
        for (const [mId, ids] of Object.entries(p.map)) {
          if (!visibleMap[mId]) visibleMap[mId] = new Set<number>();
          for (const id of ids) visibleMap[mId].add(id);
        }
      }
    }

    if (OBC.ModelIdMapUtils.isEmpty(visibleMap)) {
      await hider.set(false);
    } else {
      await hider.isolate(visibleMap);
    }

    const activePhase =
      this.phases.find((p) => this.phaseProgress > p.startPct && this.phaseProgress <= p.endPct) ||
      this.phases[0];
    this.statusMessage = `4D Timeline ${this.phaseProgress}% — ${activePhase?.label || "Initializing"}`;
    this.onStateChanged.trigger();
  }

  togglePlay4D() {
    if (this.isPlaying4D) {
      this.stopPlay4D();
      return;
    }
    this.isPlaying4D = true;
    if (this.phaseProgress >= 100) this.phaseProgress = 10;
    this.setPhaseProgress(this.phaseProgress);

    this.playTimer = setInterval(() => {
      const next = this.phaseProgress + 15;
      if (next >= 100) {
        this.setPhaseProgress(100);
        this.stopPlay4D();
      } else {
        this.setPhaseProgress(next);
      }
    }, 850);
    this.onStateChanged.trigger();
  }

  stopPlay4D() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    this.isPlaying4D = false;
    this.onStateChanged.trigger();
  }

  // =========================================================================
  // 3. Live Element Property Editor & .FRAG Binary Snapshot Exporter
  // =========================================================================
  async inspectSelectedForEdit() {
    const hl = this.components.get(OBCF.Highlighter);
    const fragments = this.components.get(OBC.FragmentsManager);
    const sel = hl.selection.select;

    if (!sel || OBC.ModelIdMapUtils.isEmpty(sel)) {
      this.statusMessage = "Select any element in the 3D viewport first, then click Pick Selected.";
      this.onStateChanged.trigger();
      return;
    }

    for (const [modelId, ids] of Object.entries(sel)) {
      const firstId = [...ids][0];
      if (firstId === undefined) continue;
      const raw = await fragments.getData({ [modelId]: new Set([firstId]) }, { attributesDefault: true });
      const item = raw[modelId]?.[0];
      const cat = item ? unwrapIfcAttr((item as any)._category) : "IfcElement";
      const name = item ? unwrapIfcAttr((item as any).Name) : `Element #${firstId}`;

      const de = this.components.get(DataEnhancer);
      const records = de.get(modelId, firstId);
      const findVal = (key: string, fallback: string) =>
        records.find((r) => r.propertyName.toLowerCase() === key.toLowerCase())?.propertyValue ||
        fallback;

      this.selectedEditTarget = {
        modelId,
        localId: firstId,
        name: name || `${cat} #${firstId}`,
        category: cat,
        fireRating: findVal("FireRating", "REI 90"),
        phaseTag: findVal("PhaseTag", "Phase 01 - Structural"),
        costUsd: findVal("CostUSD", "1850"),
        notes: findVal("InspectorNote", "Verified via Pro Studio"),
      };
      this.statusMessage = `Loaded "${this.selectedEditTarget.name}" (#${firstId}) for editing.`;
      this.onStateChanged.trigger();
      return;
    }
  }

  async saveSelectedEdits(fields: {
    fireRating: string;
    phaseTag: string;
    costUsd: string;
    notes: string;
  }) {
    if (!this.selectedEditTarget) return;
    const t = this.selectedEditTarget;
    this.selectedEditTarget = { ...t, ...fields };

    const de = this.components.get(DataEnhancer);
    const entries: Array<[string, string]> = [
      ["FireRating", fields.fireRating],
      ["PhaseTag", fields.phaseTag],
      ["CostUSD", fields.costUsd],
      ["InspectorNote", fields.notes],
    ];
    for (const [propertyName, propertyValue] of entries) {
      await de.set({
        modelId: t.modelId,
        expressId: t.localId,
        guid: `${t.modelId}_${t.localId}`,
        category: t.category,
        elementName: t.name,
        propertyName,
        propertyValue: String(propertyValue),
        discipline: "Pro Studio",
        createdAt: Date.now(),
      });
    }

    this.statusMessage = `Saved parameters for "${t.name}" (#${t.localId}) to DataEnhancer + Firestore.`;
    this.onStateChanged.trigger();
  }

  async exportFragBinary(): Promise<boolean> {
    const fragments = this.components.get(OBC.FragmentsManager);
    if (!fragments.initialized || fragments.list.size === 0) {
      this.statusMessage = "Load an IFC or .frag model before exporting binary .frag.";
      this.onStateChanged.trigger();
      return false;
    }

    let exportedCount = 0;
    for (const [modelId, model] of fragments.list) {
      if (!model || typeof model.getBuffer !== "function") continue;
      const buf = await model.getBuffer(false);
      const blob = new Blob([buf], { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const baseName = ((model as any).name || modelId || "bim-model").replace(/\.(ifc|frag)$/i, "");
      a.download = `${baseName}-pro-export.frag`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      exportedCount++;
    }

    this.statusMessage =
      exportedCount > 0
        ? `Exported ${exportedCount} compiled .frag binary file(s).`
        : "No Fragment buffer available to export.";
    this.onStateChanged.trigger();
    return exportedCount > 0;
  }

  dispose() {
    this.stopPlay4D();
    this.onStateChanged.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}
