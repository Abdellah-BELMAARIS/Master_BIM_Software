import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { database } from "../../../core/database";
import {
  DataEnhancerResultMap,
  DataEnhancerSource,
  EnhancedDataRecord,
} from "./types";

/**
 * Unwraps an ItemData scalar/object field cleanly.
 */
export function unwrapIfcAttr(field: any): string {
  if (field === null || field === undefined) return "";
  if (typeof field === "object" && "value" in field) {
    return String(field.value ?? "");
  }
  return String(field);
}

/**
 * Module 4 — Section 4: Custom BIM Component: Data Enhancer
 * (Lessons 4.1 to 4.5)
 *
 * Extends OBC.Component to integrate external technical datasheets,
 * discipline cost/QA matrices, and Cloud Firestore field inspection logs
 * with multi-tier caching (per-source dataset + per-item matched results)
 * and reverse item lookup (highlighting 3D elements from any table row).
 */
export class DataEnhancer extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "e85746b1-0967-4cf3-bfdb-93510cba4837";
  enabled = true;

  readonly sources = new FRAGS.DataMap<string, DataEnhancerSource>();

  readonly onDataEnhanced = new OBC.Event<EnhancedDataRecord>();
  readonly onDataCleared = new OBC.Event<void>();
  readonly onSourcesChanged = new OBC.Event<void>();
  readonly onDisposed = new OBC.Event<void>();

  projectId?: string;

  // Lesson 4.3: Two-tier caching (source datasets & per-item matches)
  private _sourceDataCache = new Map<string, Record<string, any>[]>();
  private _itemResultCache = new Map<
    string,
    Record<string, Record<string, any>[]>
  >();

  // Local mirror of Cloud Firestore EnhancedDataRecords (per-element logs)
  private _recordsByElement = new Map<string, EnhancedDataRecord[]>();
  private _loadedProjectId: string | null = null;

  constructor(components: OBC.Components) {
    super(components);
    components.add(DataEnhancer.uuid, this);
  }

  private getElementKey(modelId: string, expressId: number): string {
    return `${modelId}::${expressId}`;
  }

  clearCache(sourceId?: string): void {
    if (sourceId) {
      this._sourceDataCache.delete(sourceId);
      for (const itemMap of this._itemResultCache.values()) {
        delete itemMap[sourceId];
      }
    } else {
      this._sourceDataCache.clear();
      this._itemResultCache.clear();
    }
  }

  /**
   * Loads and caches all rows from a named source.
   */
  async getSourceRows(
    sourceId: string,
    forceRefresh = false
  ): Promise<Record<string, any>[]> {
    const source = this.sources.get(sourceId);
    if (!source) return [];

    if (!forceRefresh && this._sourceDataCache.has(sourceId)) {
      return this._sourceDataCache.get(sourceId)!;
    }

    try {
      const rows = await source.data();
      this._sourceDataCache.set(sourceId, rows);
      return rows;
    } catch (err) {
      console.warn(`[DataEnhancer] Failed fetching rows for "${sourceId}":`, err);
      return [];
    }
  }

  /**
   * Lesson 4.3: Matches selected BIM elements against registered external data sources
   * using cached source rows and cached per-item match results, returned as OBC.ModelIdDataMap.
   */
  async getData(
    items: OBC.ModelIdMap,
    config?: { sourceIds?: string[]; forceRefresh?: boolean }
  ): Promise<DataEnhancerResultMap> {
    const result: DataEnhancerResultMap = new FRAGS.DataMap();
    const forceRefresh = Boolean(config?.forceRefresh);
    const activeSourceIds = config?.sourceIds?.length
      ? config.sourceIds
      : [...this.sources.keys()];

    if (OBC.ModelIdMapUtils.isEmpty(items) || activeSourceIds.length === 0) {
      return result;
    }

    const fragments = this.components.get(OBC.FragmentsManager);
    const missingItems: OBC.ModelIdMap = {};

    // Check cache first per item
    for (const [modelId, ids] of Object.entries(items)) {
      const modelMap = new FRAGS.DataMap<
        number,
        Record<string, Record<string, any>[]>
      >();
      result.set(modelId, modelMap);

      for (const localId of ids) {
        const key = this.getElementKey(modelId, localId);
        const cached = !forceRefresh ? this._itemResultCache.get(key) : undefined;
        const hasAllSources =
          cached && activeSourceIds.every((sid) => sid in cached);

        if (hasAllSources && cached) {
          modelMap.set(localId, { ...cached });
        } else {
          if (!missingItems[modelId]) missingItems[modelId] = new Set<number>();
          missingItems[modelId].add(localId);
        }
      }
    }

    if (OBC.ModelIdMapUtils.isEmpty(missingItems)) {
      return result;
    }

    // Fetch IFC attributes & Property Sets (IsDefinedBy) only for uncached items
    const rawDataByModel = await fragments.getData(missingItems, {
      attributesDefault: true,
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
      },
    });

    // Preload active source datasets once (cached!)
    const sourceDatasets = new Map<string, Record<string, any>[]>();
    await Promise.all(
      activeSourceIds.map(async (sid) => {
        const rows = await this.getSourceRows(sid, forceRefresh);
        sourceDatasets.set(sid, rows);
      })
    );

    for (const [modelId, itemsData] of Object.entries(rawDataByModel)) {
      let modelMap = result.get(modelId);
      if (!modelMap) {
        modelMap = new FRAGS.DataMap();
        result.set(modelId, modelMap);
      }

      for (const itemData of itemsData) {
        const localIdRaw = unwrapIfcAttr((itemData as any)._localId);
        const localId = Number(localIdRaw);
        if (!Number.isFinite(localId)) continue;

        const key = this.getElementKey(modelId, localId);
        const entry = this._itemResultCache.get(key) || {};

        for (const sid of activeSourceIds) {
          const source = this.sources.get(sid);
          const rows = sourceDatasets.get(sid) || [];
          if (!source) continue;
          try {
            entry[sid] = source.matcher(itemData, rows);
          } catch {
            entry[sid] = [];
          }
        }

        this._itemResultCache.set(key, entry);
        modelMap.set(localId, { ...entry });
      }
    }

    return result;
  }

  /**
   * Lesson 4.4 Challenge: Reverse lookup — finds all 3D BIM elements matching a clicked row
   * inside any DataEnhancer source table.
   */
  async findItemsBySourceRow(
    _sourceId: string,
    row: Record<string, any>
  ): Promise<OBC.ModelIdMap> {
    const fragments = this.components.get(OBC.FragmentsManager);
    const finder = this.components.get(OBC.ItemsFinder);

    // 1. Direct Express/Local ID + Model match (from Cloud Field Logs)
    if (row._modelId && row._expressId !== undefined) {
      const numId = Number(row._expressId);
      if (fragments.list.has(String(row._modelId)) && Number.isFinite(numId)) {
        return { [String(row._modelId)]: new Set([numId]) };
      }
    }

    // 2. Direct IFC GlobalId (GUID) match across loaded models
    const guid = row.GUID || row._guid || row.GlobalId;
    if (typeof guid === "string" && guid.length > 0) {
      try {
        const guidMap = await fragments.guidsToModelIdMap([guid]);
        if (guidMap && !OBC.ModelIdMapUtils.isEmpty(guidMap)) {
          return guidMap;
        }
      } catch {}
    }

    // 3. IFC Category regex match (e.g. "IFCSLAB", "IFCWALL|IFCWALLSTANDARDCASE", "IFCBUILDINGELEMENTPROXY")
    const categoryPattern = row.CategoryRegex || row.Category;
    if (typeof categoryPattern === "string" && categoryPattern.trim().length > 0) {
      try {
        const escaped = categoryPattern
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .join("|");
        const matched = await finder.getItems([
          { categories: [new RegExp(escaped, "i")] },
        ]);
        if (!OBC.ModelIdMapUtils.isEmpty(matched)) {
          return matched;
        }
      } catch (err) {
        console.warn("[DataEnhancer] Category lookup error:", err);
      }
    }

    return {};
  }

  /**
   * Lesson 4.5: Attach and persist custom inspection / specification parameters
   * for selected BIM elements to Cloud Firestore + invalidate Firestore source cache.
   */
  async set(record: EnhancedDataRecord, projectId?: string): Promise<void> {
    const pid = projectId || this.projectId;
    const key = this.getElementKey(record.modelId, record.expressId);
    const existing = this._recordsByElement.get(key) || [];
    const updated = [...existing, record];
    this._recordsByElement.set(key, updated);

    if (pid && database) {
      try {
        const safeDocId = `${record.modelId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${record.expressId}`;
        const docRef = doc(database, "projects", pid, "enhanced_data", safeDocId);
        await setDoc(docRef, { records: updated }, { merge: true });
      } catch (err) {
        console.warn("[DataEnhancer] Firestore sync deferred:", err);
      }
    }

    this.clearCache("Cloud Field Logs & Inspections");
    this.onDataEnhanced.trigger(record);
    this.onSourcesChanged.trigger();
  }

  get(modelId: string, expressId: number): EnhancedDataRecord[] {
    return this._recordsByElement.get(this.getElementKey(modelId, expressId)) || [];
  }

  getAllLocalRecords(): EnhancedDataRecord[] {
    const all: EnhancedDataRecord[] = [];
    for (const arr of this._recordsByElement.values()) {
      all.push(...arr);
    }
    return all;
  }

  /**
   * Loads existing enhanced field logs from Cloud Firestore for the active project.
   */
  async loadProjectData(projectId?: string): Promise<EnhancedDataRecord[]> {
    const pid = projectId || this.projectId;
    if (!pid || !database) return this.getAllLocalRecords();

    if (this._loadedProjectId === pid && this._recordsByElement.size > 0) {
      return this.getAllLocalRecords();
    }

    try {
      const colRef = collection(database, "projects", pid, "enhanced_data");
      const snap = await getDocs(colRef);
      this._loadedProjectId = pid;
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data && Array.isArray(data.records)) {
          for (const rec of data.records as EnhancedDataRecord[]) {
            const key = this.getElementKey(rec.modelId, rec.expressId);
            const list = this._recordsByElement.get(key) || [];
            if (!list.some((r) => r.createdAt === rec.createdAt && r.propertyName === rec.propertyName)) {
              list.push(rec);
              this._recordsByElement.set(key, list);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[DataEnhancer] Could not fetch project Firestore records:", err);
    }

    return this.getAllLocalRecords();
  }

  clear(): void {
    this.clearCache();
    this._recordsByElement.clear();
    this._loadedProjectId = null;
    this.onDataCleared.trigger();
  }

  dispose(): void {
    this.clear();
    this.sources.dispose();
    this.onDataEnhanced.reset();
    this.onDataCleared.reset();
    this.onSourcesChanged.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}

export * from "./types";
