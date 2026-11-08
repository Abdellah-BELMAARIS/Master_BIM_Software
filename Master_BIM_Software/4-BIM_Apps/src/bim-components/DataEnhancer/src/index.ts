import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { database } from "../../../core/database";
import { EnhancedDataRecord, DataEnhancerSource } from "./types";

/**
 * Module 4 — Section 4: Custom BIM Component: Data Enhancer
 * (Lessons 4.1 to 4.5)
 *
 * Extends OBC.Component to allow architects, engineers, and BIM managers
 * to enrich any 3D IFC element with arbitrary metadata, inspection logs,
 * or cost codes, caching in memory and synchronizing with Cloud Firestore.
 */
export class DataEnhancer extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "e85746b1-0967-4cf3-bfdb-93510cba4837";
  enabled = true;

  readonly onDataEnhanced = new OBC.Event<EnhancedDataRecord>();
  readonly onDataCleared = new OBC.Event<void>();
  readonly onDisposed = new OBC.Event<void>();

  // In-memory cache for hyper-speed query performance (indexed by `${modelId}_${expressId}`)
  private _cache = new Map<string, EnhancedDataRecord[]>();

  // Active data sources (Lesson 4.2)
  sources: DataEnhancerSource[] = [
    { id: "memory-cache", name: "In-Memory Fast Cache", type: "memory" },
    { id: "cloud-firestore", name: "Cloud Firestore Database", type: "firestore" },
  ];

  constructor(components: OBC.Components) {
    super(components);
    components.add(DataEnhancer.uuid, this);
  }

  private getKey(modelId: string, expressId: number): string {
    return `${modelId}_${expressId}`;
  }

  /**
   * Lesson 4.3: Add or update enhanced data for a specific element
   */
  async set(record: EnhancedDataRecord, projectId?: string): Promise<void> {
    const key = this.getKey(record.modelId, record.expressId);
    const existing = this._cache.get(key) || [];
    existing.push(record);
    this._cache.set(key, existing);

    // Lesson 4.5: Persist to Firebase if project context is available
    if (projectId && database) {
      try {
        const docRef = doc(database, "projects", projectId, "enhanced_data", key);
        await setDoc(docRef, { records: existing }, { merge: true });
      } catch (err) {
        console.warn("[DataEnhancer] Firestore sync deferred:", err);
      }
    }

    this.onDataEnhanced.trigger(record);
  }

  /**
   * Retrieves all enhanced data records for a specific element
   */
  get(modelId: string, expressId: number): EnhancedDataRecord[] {
    const key = this.getKey(modelId, expressId);
    return this._cache.get(key) || [];
  }

  /**
   * Lesson 4.5: Load existing enhanced records from Firebase for the current project
   */
  async loadProjectData(projectId: string, modelId: string, expressIds: number[]): Promise<void> {
    if (!projectId || !database) return;
    for (const expressId of expressIds) {
      const key = this.getKey(modelId, expressId);
      try {
        const docRef = doc(database, "projects", projectId, "enhanced_data", key);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.records)) {
            this._cache.set(key, data.records);
          }
        }
      } catch (err) {
        console.warn(`[DataEnhancer] Failed to load data for ${key}:`, err);
      }
    }
  }

  /**
   * Clears in-memory enhanced records
   */
  clear(): void {
    this._cache.clear();
    this.onDataCleared.trigger();
  }

  /**
   * Lesson 4.4: Creates reactive That Open UI panel for adding enhanced metadata
   */
  createUI(projectId?: string): HTMLElement {
    let propNameInput: BUI.TextInput | null = null;
    let propValInput: BUI.TextInput | null = null;
    let categoryInput: BUI.TextInput | null = null;
    let statusLabel: BUI.Label | null = null;

    const onAddProperty = async () => {
      const highlighter = this.components.get(OBCF.Highlighter);
      const selection = highlighter.selection.select;

      if (!selection || OBC.ModelIdMapUtils.isEmpty(selection)) {
        if (statusLabel) statusLabel.textContent = "Select an element first in 3D View!";
        return;
      }

      const propName = propNameInput?.value?.trim() || "";
      const propVal = propValInput?.value?.trim() || "";
      const category = categoryInput?.value?.trim() || "General Specification";

      if (!propName || !propVal) {
        if (statusLabel) statusLabel.textContent = "Please enter both Property Name and Value.";
        return;
      }

      for (const [modelId, ids] of Object.entries(selection)) {
        for (const expressId of ids) {
          const record: EnhancedDataRecord = {
            modelId,
            expressId,
            propertyName: propName,
            propertyValue: propVal,
            category,
            author: "Abdellah B. (BIMPulse)",
            createdAt: Date.now(),
          };
          await this.set(record, projectId);
        }
      }

      if (propNameInput) propNameInput.value = "";
      if (propValInput) propValInput.value = "";
      if (statusLabel) statusLabel.textContent = "Property successfully saved!";
      setTimeout(() => {
        if (statusLabel) statusLabel.textContent = "";
      }, 3000);
    };

    return BUI.Component.create<BUI.Panel>(() => {
      return BUI.html`
        <bim-panel style="min-width: 20rem; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 1rem;">
          <bim-panel-section label="Data Enhancer (Lesson 4.1 – 4.5)" icon="material-symbols:database">
            <bim-label style="color: #94a3b8; font-size: 0.82rem; margin-bottom: 0.75rem;">
              Enrich selected 3D BIM elements with custom parameters, inspection notes, or cost codes.
            </bim-label>

            <bim-text-input
              ${BUI.ref((el) => { propNameInput = el as BUI.TextInput; })}
              label="Property Name"
              placeholder="e.g. Fire Rating, Acoustic Spec, Cost Code"
            ></bim-text-input>

            <bim-text-input
              ${BUI.ref((el) => { propValInput = el as BUI.TextInput; })}
              label="Property Value"
              placeholder="e.g. REI 120, 45 dB, CC-2026-A"
              style="margin-top: 0.5rem;"
            ></bim-text-input>

            <bim-text-input
              ${BUI.ref((el) => { categoryInput = el as BUI.TextInput; })}
              label="Category / Tag"
              placeholder="e.g. Maintenance, Structural, LEED"
              value="Specification"
              style="margin-top: 0.5rem;"
            ></bim-text-input>

            <bim-button
              @click=${onAddProperty}
              label="Attach to Selection"
              icon="material-symbols:add-link"
              style="margin-top: 0.85rem; --bim-button-background: #0284c7; color: white; font-weight: 600;"
            ></bim-button>

            <bim-label
              ${BUI.ref((el) => { statusLabel = el as BUI.Label; })}
              style="color: #38bdf8; font-size: 0.8rem; margin-top: 0.5rem; display: block;"
            ></bim-label>
          </bim-panel-section>
        </bim-panel>
      `;
    });
  }

  dispose(): void {
    this.clear();
    this.onDataEnhanced.reset();
    this.onDataCleared.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}

