import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";

/**
 * Semantic Embeddings engine for BIM.
 * Runs a sentence-embedding model fully in the browser (transformers.js),
 * indexes element names of every loaded model and enables:
 *  - natural-language search & selection
 *  - IFC class suggestion / mismatch detection
 *  - mapping to a custom classification or cost database
 *  - grouping of semantically similar elements
 */

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

export interface IndexedElement {
  modelId: string;
  localId: number;
  name: string;
  category: string;
  text: string;
}

export interface Match<T> {
  item: T;
  score: number; // 0..100
}

export interface ClassEntry {
  code: string;
  description: string;
}

export const IFC_CLASSES: Record<string, string> = {
  IFCWALL: "wall, vertical partition or facade that encloses or divides spaces",
  IFCWALLSTANDARDCASE: "standard wall, straight vertical masonry or concrete wall",
  IFCSLAB: "slab, horizontal floor, deck or plate",
  IFCCOLUMN: "column, vertical structural pillar or post",
  IFCBEAM: "beam, horizontal structural girder or lintel",
  IFCDOOR: "door, hinged or sliding leaf for entering or leaving a room",
  IFCWINDOW: "window, glazed opening for light and ventilation",
  IFCROOF: "roof, top covering of a building",
  IFCSTAIR: "stair, steps connecting different floor levels",
  IFCRAILING: "railing, guard rail or handrail along stairs or balconies",
  IFCCOVERING: "covering, ceiling, flooring finish or cladding",
  IFCCURTAINWALL: "curtain wall, glazed facade system with mullions",
  IFCPLATE: "plate, thin flat panel or glass pane",
  IFCMEMBER: "member, mullion, brace or secondary structural profile",
  IFCFOOTING: "footing, foundation pad or strip below ground",
  IFCPIPESEGMENT: "pipe, tube carrying water or drainage",
  IFCDUCTSEGMENT: "duct, air ventilation channel",
  IFCLIGHTFIXTURE: "light fixture, lamp for electric lighting",
  IFCFURNISHINGELEMENT: "furniture, table, chair, desk or cabinet",
  IFCSPACE: "space, room or zone area",
};

export const DEFAULT_CLASSIFICATION = [
  "Ss_25_10_30 | Brick and block wall systems, masonry facade",
  "Ss_25_10_32 | Concrete wall systems, cast in place",
  "Ss_25_30_20 | Partition systems, gypsum board drywall",
  "Ss_30_10_30 | Concrete floor slab and deck systems",
  "Ss_20_10_75 | Structural steel framing, beams and girders",
  "Ss_20_10_15 | Concrete columns and pillars",
  "Ss_25_30_25 | Door systems, entrance and internal doors",
  "Ss_25_30_95 | Window systems, glazed frames",
  "Ss_30_10_65 | Roof structure and covering systems",
  "Ss_35_10_30 | Stair systems and flights of steps",
  "Ss_55_70_38 | Water supply pipework",
  "Ss_50_30_04 | Drainage pipework",
  "Ss_70_80_33 | Lighting systems, luminaires",
  "Ss_40_15_75 | Floor tiling and finishes",
].join("\n");

const dot = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};
export const toPct = (c: number) => Math.max(0, Math.min(100, Math.round(c * 100)));
export const prettyClass = (c: string) =>
  c.startsWith("IFC") ? "Ifc" + c.charAt(3) + c.slice(4).toLowerCase() : c;

type Extractor = (texts: string[], opts: any) => Promise<{ data: Float32Array; dims: number[] }>;

export class SemanticEmbeddings {
  private extractor: Promise<Extractor> | null = null;
  private cache = new Map<string, Float32Array>();
  elements: IndexedElement[] = [];
  vectors: Float32Array[] = [];
  private classVecs: Float32Array[] | null = null;

  constructor(private components: OBC.Components) {}

  get isLoaded() {
    return this.extractor !== null;
  }

  load(onProgress?: (pct: number, file: string) => void) {
    this.extractor ??= (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const p = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        dtype: "q8",
        progress_callback: (e: any) => {
          if (e?.status === "progress" && onProgress) onProgress(Math.round(e.progress ?? 0), e.file ?? "");
        },
      } as any);
      return p as unknown as Extractor;
    })();
    this.extractor.catch(() => (this.extractor = null));
    return this.extractor;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    const missing = [...new Set(texts.filter((t) => !this.cache.has(t)))];
    if (missing.length) {
      const ex = await this.load();
      for (let i = 0; i < missing.length; i += 64) {
        const batch = missing.slice(i, i + 64);
        const out = await ex(batch, { pooling: "mean", normalize: true });
        const dim = out.dims[1];
        batch.forEach((t, k) => this.cache.set(t, out.data.slice(k * dim, (k + 1) * dim)));
      }
    }
    return texts.map((t) => this.cache.get(t)!);
  }

  similarity(a: Float32Array, b: Float32Array) {
    return toPct(dot(a, b));
  }

  /** Reads Name / ObjectType / category of every element with geometry. */
  async indexModels(onProgress?: (msg: string) => void) {
    const fragments = this.components.get(OBC.FragmentsManager);
    const list: IndexedElement[] = [];
    for (const [modelId, model] of fragments.list) {
      onProgress?.(`Reading ${modelId}…`);
      const items = await model.getItemsWithGeometry();
      const ids: number[] = [];
      for (const it of items as any[]) {
        const id = typeof it === "number" ? it : await it.getLocalId?.();
        if (typeof id === "number") ids.push(id);
      }
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const data = await model.getItemsData(chunk, {
          attributesDefault: false,
          attributes: ["Name", "ObjectType", "Description"],
          relations: {},
        } as any);
        data.forEach((d: any, k: number) => {
          const v = (key: string) => {
            const a = d?.[key];
            return a && typeof a === "object" && "value" in a ? String(a.value ?? "") : "";
          };
          const name = v("Name");
          const category = v("_category");
          const parts = [name, v("ObjectType"), v("Description")].filter((s) => s && s !== "null");
          const text = [...new Set(parts)].join(", ") || category;
          if (!text) return;
          list.push({ modelId, localId: chunk[k], name: name || category, category, text });
        });
      }
    }
    this.elements = list;
    onProgress?.(`Embedding ${list.length} elements…`);
    this.vectors = await this.embed(list.map((e) => e.text));
    return list.length;
  }

  async search(query: string, topK = 50): Promise<Match<IndexedElement>[]> {
    if (!query.trim() || !this.elements.length) return [];
    const [q] = await this.embed([query]);
    return this.elements
      .map((item, i) => ({ item, score: toPct(dot(q, this.vectors[i])) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async classifyIfc() {
    const names = Object.keys(IFC_CLASSES);
    this.classVecs ??= await this.embed(Object.values(IFC_CLASSES));
    return this.elements.map((el, i) => {
      const scores = this.classVecs!.map((c) => dot(c, this.vectors[i]));
      const k = scores.indexOf(Math.max(...scores));
      return { el, suggested: names[k], score: toPct(scores[k]), mismatch: !!el.category && !el.category.startsWith(names[k]) && !names[k].startsWith(el.category) };
    });
  }

  async mapToClassification(entries: ClassEntry[], top = 3) {
    const vecs = await this.embed(entries.map((e) => e.description));
    return this.elements.map((el, i) => ({
      el,
      options: entries
        .map((entry, k) => ({ item: entry, score: toPct(dot(vecs[k], this.vectors[i])) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, top),
    }));
  }

  /** Average-linkage clustering on unique texts (fast on big models). */
  group(threshold: number) {
    const byText = new Map<string, number[]>();
    this.elements.forEach((e, i) => {
      const arr = byText.get(e.text) ?? [];
      arr.push(i);
      byText.set(e.text, arr);
    });
    const texts = [...byText.keys()].slice(0, 400);
    const vecs = texts.map((t) => this.cache.get(t)!);
    let cl = texts.map((_, i) => [i]);
    for (;;) {
      let best = -2, bi = 0, bj = 0;
      for (let i = 0; i < cl.length; i++)
        for (let j = i + 1; j < cl.length; j++) {
          let s = 0;
          for (const a of cl[i]) for (const b of cl[j]) s += dot(vecs[a], vecs[b]);
          s /= cl[i].length * cl[j].length;
          if (s > best) { best = s; bi = i; bj = j; }
        }
      if (best < threshold || cl.length < 2) break;
      cl[bi] = cl[bi].concat(cl[bj]);
      cl.splice(bj, 1);
    }
    return cl
      .map((g) => ({ labels: g.map((i) => texts[i]), indices: g.flatMap((i) => byText.get(texts[i])!) }))
      .sort((a, b) => b.indices.length - a.indices.length);
  }

  toModelIdMap(els: IndexedElement[]): OBC.ModelIdMap {
    const map: OBC.ModelIdMap = {};
    for (const e of els) (map[e.modelId] ??= new Set()).add(e.localId);
    return map;
  }

  async select(els: IndexedElement[], zoom = true) {
    const hl = this.components.get(OBCF.Highlighter);
    if (!els.length) return hl.clear("select");
    await hl.highlightByID("select", this.toModelIdMap(els), true, zoom);
  }
}
