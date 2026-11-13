import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";

export interface FragmentSchemaTelemetry {
  items: number;
  samples: number;
  globalTransforms: number;
  localTransforms: number;
  materials: number;
  representations: number;
}

export interface FragmentMaterialSummary {
  id: number;
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
}

export interface InspectedFragmentItem {
  localId: number;
  category: string;
  guid?: string;
  data: Record<string, FRAGS.ItemAttribute>;
}

export interface TransformEditInput {
  space: "global" | "local";
  scope: "all" | "selected" | "category";
  categoryRegex?: string;
  dx: number;
  dy: number;
  dz: number;
  rotYDeg: number;
  scale?: number;
}

export interface ItemAttributeEditInput {
  scope: "category" | "selected";
  categoryRegex: string;
  key: string;
  value: string;
  ifcType: string;
}

export interface SampleMaterialEditInput {
  scope: "all" | "selected" | "category";
  categoryRegex: string;
  materialId: number | "first";
}

export interface MaterialUpdateInput {
  materialId: number | "first";
  hex: string;
  alpha: number;
  doubleSided: boolean;
}

export type ExplodeMode = "storeys" | "disciplines" | "radial";

export type GeometryShapePreset = "disc" | "box" | "column" | "sphere";

export interface GeometryEditInput {
  shape: GeometryShapePreset;
  scope: "selected" | "category" | "all";
  categoryRegex: string;
  size: number;
  height: number;
}

export interface SpawnElementInput {
  shape: GeometryShapePreset;
  size: number;
  height: number;
  x: number;
  y: number;
  z: number;
  hex: string;
  category: string;
}

const DISCIPLINE_TIERS: Array<{ tier: number; regex: RegExp }> = [
  { tier: 1, regex: /FOOTING|PILE|SLAB|PLATE/i },
  { tier: 2, regex: /COLUMN|WALL|CURTAINWALL|DOOR/i },
  { tier: 3, regex: /BEAM|MEMBER|WINDOW|STAIR|RAILING/i },
  { tier: 4, regex: /ROOF|COVERING|FURNISHING|FLOW|SOLAR/i },
];

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")}`;

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const clean = hex.replace("#", "").trim();
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16) || 0;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

/**
 * Module 6 (Lessons 2.1, 2.2 & Pro Docs API): Pro Fragments Edit Studio Component.
 * Wraps `@thatopen/fragments` Editor & Model APIs for Global/Local matrix transforms,
 * Storey Exploded Views, Item attribute batch editing, Sample material orchestration,
 * live `UPDATE_MATERIAL` overrides, CRS/GUID/Edited-Elements inspection, and `.frag` export.
 */
export class FragmentsEditStudio extends OBC.Component {
  static uuid = "9b2f7e44-2c3a-4e89-9d6c-6a8f10b7d321" as const;
  enabled = true;

  readonly onStateChanged = new OBC.Event<void>();

  modelId: string | null = null;
  categories: string[] = [];
  schema: FragmentSchemaTelemetry | null = null;
  materials: FragmentMaterialSummary[] = [];
  activeRequests: FRAGS.EditRequest[] = [];
  undoneRequests: FRAGS.EditRequest[] = [];
  inspectedItems: InspectedFragmentItem[] = [];
  editedElementsCount = 0;
  storeysCount = 0;
  crsSummary: string | null = null;
  metadataSnapshot: Record<string, any> | null = null;
  selectedGuids: string[] = [];
  statusMessage = "Load an .IFC or .FRAG model, then click Scan Schema to start editing.";
  statusTone: "info" | "warn" = "info";
  isBusy = false;

  constructor(components: OBC.Components) {
    super(components);
    components.add(FragmentsEditStudio.uuid, this);
  }

  private emit(statusMessage?: string, statusTone: "info" | "warn" = "info") {
    if (statusMessage !== undefined) {
      this.statusMessage = statusMessage;
      this.statusTone = statusTone;
    }
    this.onStateChanged.trigger();
  }

  private getFirstModel(): { fragments: OBC.FragmentsManager; model: FRAGS.FragmentsModel } | null {
    const fragments = this.components.get(OBC.FragmentsManager);
    const model = fragments.list.values().next().value;
    if (!model) {
      this.emit("Load an .IFC or .FRAG model first to use Fragments Edit API.", "warn");
      return null;
    }
    return { fragments, model };
  }

  private async resolveItemIds(
    model: FRAGS.FragmentsModel,
    scope: "selected" | "category",
    categoryRegex: string
  ): Promise<number[]> {
    if (scope === "selected") {
      const highlighter = this.components.get(OBCF.Highlighter);
      const selectedSet = highlighter.selection.select?.[model.modelId];
      return selectedSet ? [...selectedSet] : [];
    }
    const safePattern = categoryRegex.trim() || "WINDOW";
    const matched = await model.getItemsOfCategories([new RegExp(safePattern, "i")]);
    return Object.values(matched).flat();
  }

  private async runTransaction(
    label: string,
    work: (ctx: {
      fragments: OBC.FragmentsManager;
      model: FRAGS.FragmentsModel;
    }) => Promise<string | null>
  ) {
    const ctx = this.getFirstModel();
    if (!ctx) return;

    this.isBusy = true;
    this.emit();
    try {
      const message = await work(ctx);
      await this.refreshHistoryAndTelemetry(ctx.fragments, ctx.model);
      if (message) {
        this.emit(message, "info");
      } else {
        this.emit();
      }
    } catch (err: any) {
      console.error(`[FragmentsEditStudio] ${label} failed:`, err);
      this.emit(`${label} failed: ${err?.message || err}`, "warn");
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }

  private async refreshHistoryAndTelemetry(
    fragments: OBC.FragmentsManager,
    model: FRAGS.FragmentsModel
  ) {
    this.modelId = model.modelId;
    const [
      itemIds,
      sampleIds,
      gtIds,
      ltIds,
      matMap,
      reprIds,
      cats,
      history,
      editedIds,
      crsData,
      storeyMap,
      metadataObj,
    ] = await Promise.all([
      model.getItemsIds(),
      model.getSamplesIds(),
      model.getGlobalTransformsIds(),
      model.getLocalTransformsIds(),
      model.getMaterials(),
      model.getRepresentationsIds(),
      model.getCategories(),
      fragments.core.editor.getModelRequests(model.modelId),
      model.getEditedElements().catch(() => [] as number[]),
      model.getCRS().catch(() => null),
      model.getItemsOfCategories([/BUILDINGSTOREY/]).catch(() => ({} as Record<string, number[]>)),
      model.getMetadata<Record<string, any>>().catch(() => null),
    ]);

    this.schema = {
      items: itemIds.length,
      samples: sampleIds.length,
      globalTransforms: gtIds.length,
      localTransforms: ltIds.length,
      materials: matMap.size,
      representations: reprIds.length,
    };
    this.categories = [...cats].sort();
    this.materials = [...matMap.entries()].slice(0, 60).map(([id, m]) => ({
      id,
      r: m.r,
      g: m.g,
      b: m.b,
      a: m.a,
      hex: rgbToHex(m.r, m.g, m.b),
    }));
    this.activeRequests = history?.requests ?? [];
    this.undoneRequests = history?.undoneRequests ?? [];
    this.editedElementsCount = editedIds.length;
    this.storeysCount = Object.values(storeyMap).flat().length;
    this.crsSummary = crsData?.name
      ? `${crsData.name}${crsData.geodeticDatum ? ` (${crsData.geodeticDatum})` : ""}`
      : null;
    this.metadataSnapshot = metadataObj;
  }

  async scanModel(): Promise<void> {
    await this.runTransaction("Scan Schema", async ({ model }) => {
      return `Scanned "${model.modelId}": ${this.schema?.items ?? "?"} items ready.`;
    }).then(() => {
      if (this.schema) {
        this.emit(
          `Schema ready: ${this.schema.items} items · ${this.schema.samples} samples · ${this.schema.materials} materials.`,
          "info"
        );
      }
    });
  }

  async applyTransform(input: TransformEditInput): Promise<void> {
    await this.runTransaction("Transform Edit", async ({ fragments, model }) => {
      const { space, scope, categoryRegex = "WINDOW", dx, dy, dz, rotYDeg, scale = 1 } = input;
      const hasRotationOrScale = Math.abs(rotYDeg) > 1e-4 || Math.abs(scale - 1) > 1e-4;
      const requests: FRAGS.EditRequest[] = [];

      const applyMatrixDelta = <T extends FRAGS.RawTransformData>(raw: T): T => {
        if (!hasRotationOrScale) {
          return {
            ...raw,
            position: [raw.position[0] + dx, raw.position[1] + dy, raw.position[2] + dz],
          };
        }
        const currentMat = FRAGS.GeomsFbUtils.matrixFromTransform(raw);
        const deltaMat = new THREE.Matrix4().compose(
          new THREE.Vector3(dx, dy, dz),
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, THREE.MathUtils.degToRad(rotYDeg), 0)
          ),
          new THREE.Vector3(scale, scale, scale)
        );
        const updatedMat = deltaMat.multiply(currentMat);
        const nextRaw = FRAGS.GeomsFbUtils.transformFromMatrix(updatedMat);
        return { ...raw, ...nextRaw };
      };

      if (space === "global") {
        let gtMap: Map<number, FRAGS.RawGlobalTransformData>;
        if (scope === "all") {
          gtMap = await model.getGlobalTransforms();
        } else {
          const itemIds = await this.resolveItemIds(model, scope, categoryRegex);
          if (itemIds.length === 0) {
            this.emit(
              scope === "selected"
                ? "Select elements in 3D first before transforming Selected scope."
                : `No items matched /${categoryRegex}/i.`,
              "warn"
            );
            return null;
          }
          const gtIds = await model.getGlobalTranformsIdsOfItems(itemIds);
          if (gtIds.length === 0) {
            this.emit("No global transforms found for matched items.", "warn");
            return null;
          }
          gtMap = await model.getGlobalTransforms(gtIds);
        }

        for (const [localId, globalTransform] of gtMap) {
          requests.push({
            type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
            localId,
            data: applyMatrixDelta(globalTransform),
          });
        }
      } else {
        const ltMap = await model.getLocalTransforms();
        for (const [localId, localTransform] of ltMap) {
          requests.push({
            type: FRAGS.EditRequestType.UPDATE_LOCAL_TRANSFORM,
            localId,
            data: applyMatrixDelta(localTransform),
          });
        }
      }

      if (requests.length === 0) {
        this.emit(`No ${space} transforms available to update.`, "warn");
        return null;
      }

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      return `Applied ${space} transform Δ(${dx}, ${dy}, ${dz})${rotYDeg ? ` rotY ${rotYDeg}°` : ""} to ${requests.length} transform(s).`;
    });
  }

  async applyItemAttributeEdit(input: ItemAttributeEditInput): Promise<void> {
    await this.runTransaction("Item Attribute Edit", async ({ fragments, model }) => {
      const { scope, categoryRegex, key, value, ifcType } = input;
      const cleanKey = key.trim();
      if (!cleanKey) {
        this.emit("Enter an attribute key name first.", "warn");
        return null;
      }

      const targetIds = await this.resolveItemIds(model, scope, categoryRegex);
      if (targetIds.length === 0) {
        this.emit(
          scope === "selected"
            ? "Select elements in 3D first."
            : `No items found matching /${categoryRegex}/i.`,
          "warn"
        );
        return null;
      }

      const items = await model.getItems(targetIds);
      const requests: FRAGS.EditRequest[] = [];
      for (const [localId, item] of items) {
        item.data[cleanKey] = {
          value,
          type: ifcType || "IFCLABEL",
        };
        requests.push({
          type: FRAGS.EditRequestType.UPDATE_ITEM,
          localId,
          data: item,
        });
      }

      if (requests.length === 0) {
        this.emit("No item records matched the target IDs.", "warn");
        return null;
      }

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);

      const verifiedMap = await model.getItems(targetIds);
      console.log("[FragmentsEditStudio] Verified Updated Items:", verifiedMap);

      this.inspectedItems = [...verifiedMap.entries()].slice(0, 25).map(([localId, raw]) => ({
        localId,
        category: raw.category,
        guid: raw.guid,
        data: raw.data,
      }));

      return `Updated ${cleanKey}="${value}" on ${requests.length} item(s) & verified in Inspector.`;
    });
  }

  private async resolveMatchingSampleEntries(
    model: FRAGS.FragmentsModel,
    scope: "all" | "selected" | "category",
    categoryRegex: string
  ): Promise<Array<[number, FRAGS.RawSample]> | null> {
    const samples = await model.getSamples();
    if (samples.size === 0) {
      this.emit("No sample instances found in this fragment model.", "warn");
      return null;
    }

    if (scope === "all") {
      return [...samples.entries()];
    }

    const itemIds = await this.resolveItemIds(model, scope, categoryRegex);
    if (itemIds.length === 0) {
      this.emit(
        scope === "selected"
          ? "Select elements in 3D first."
          : `No items found matching /${categoryRegex}/i.`,
        "warn"
      );
      return null;
    }

    const gtIds = await model.getGlobalTranformsIdsOfItems(itemIds);
    const allowedGt = new Set(gtIds);
    const matched = [...samples.entries()].filter(([, sample]) => allowedGt.has(sample.item));
    if (matched.length === 0) {
      this.emit("No sample instances matched the chosen target scope.", "warn");
      return null;
    }
    return matched;
  }

  private buildShellRepresentation(
    shape: GeometryShapePreset,
    size: number,
    height: number
  ): FRAGS.RawRepresentation {
    const s = Math.max(0.15, Number.isFinite(size) ? size : 1.5);
    const h = Math.max(0.15, Number.isFinite(height) ? height : 1.5);

    let geom: THREE.BufferGeometry;
    switch (shape) {
      case "disc":
        geom = new THREE.CylinderGeometry(s, s, Math.max(0.12, h * 0.25), 24);
        break;
      case "column":
        geom = new THREE.CylinderGeometry(s * 0.45, s * 0.45, h, 20);
        break;
      case "sphere":
        geom = new THREE.SphereGeometry(s * 0.55, 20, 14);
        break;
      case "box":
      default:
        geom = new THREE.BoxGeometry(s, h, s);
        break;
    }

    const repr = FRAGS.GeomsFbUtils.representationFromGeometry(geom);
    geom.dispose();
    return repr;
  }

  async applySampleMaterialEdit(input: SampleMaterialEditInput): Promise<void> {
    await this.runTransaction("Sample Material Edit", async ({ fragments, model }) => {
      const { scope, categoryRegex, materialId } = input;
      const samples = await model.getSamples();
      const firstSample = samples.values().next().value;
      if (!firstSample) {
        this.emit("No sample instances found in this fragment model.", "warn");
        return null;
      }

      const targetMatId = materialId === "first" ? firstSample.material : materialId;
      const matched = await this.resolveMatchingSampleEntries(model, scope, categoryRegex);
      if (!matched) return null;

      const requests: FRAGS.EditRequest[] = matched.map(([localId, sample]) => ({
        type: FRAGS.EditRequestType.UPDATE_SAMPLE,
        localId,
        data: { ...sample, material: targetMatId },
      }));

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      return `Assigned Material #${targetMatId} across ${requests.length} sample instance(s).`;
    });
  }

  /**
   * Lesson 2.4 (Part 1): Mutates existing shared `RawRepresentation` entries in-place
   * (`UPDATE_REPRESENTATION`) using `GeomsFbUtils.representationFromGeometry`.
   */
  async updateExistingRepresentations(input: GeometryEditInput): Promise<void> {
    await this.runTransaction("Update Geometry Representations", async ({ fragments, model }) => {
      const matched = await this.resolveMatchingSampleEntries(model, input.scope, input.categoryRegex);
      if (!matched) return null;

      const reprIds = new Set<number>(matched.map(([, sample]) => sample.representation));
      const rawRepr = this.buildShellRepresentation(input.shape, input.size, input.height);

      const requests: FRAGS.EditRequest[] = [...reprIds].map((reprId) => ({
        type: FRAGS.EditRequestType.UPDATE_REPRESENTATION,
        localId: reprId,
        data: rawRepr,
      }));

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      return `Updated ${requests.length} representation(s) to ${input.shape.toUpperCase()} shell.`;
    });
  }

  /**
   * Lesson 2.4 (Part 2): Creates a new `RawRepresentation` with a `tempId`
   * (`CREATE_REPRESENTATION`) and rebinds target sample instances (`UPDATE_SAMPLE`).
   */
  async createAndAssignGeometry(input: GeometryEditInput): Promise<void> {
    await this.runTransaction("Create & Assign Geometry", async ({ fragments, model }) => {
      const matched = await this.resolveMatchingSampleEntries(model, input.scope, input.categoryRegex);
      if (!matched) return null;

      const reprTempId = `repr_${Date.now()}`;
      const rawRepr = this.buildShellRepresentation(input.shape, input.size, input.height);

      const requests: FRAGS.EditRequest[] = [
        {
          type: FRAGS.EditRequestType.CREATE_REPRESENTATION,
          tempId: reprTempId,
          data: rawRepr,
        },
        ...matched.map(
          ([localId, sample]): FRAGS.UpdateSampleRequest => ({
            type: FRAGS.EditRequestType.UPDATE_SAMPLE,
            localId,
            data: {
              ...sample,
              representation: reprTempId,
            },
          })
        ),
      ];

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      return `Created ${input.shape.toUpperCase()} representation (${reprTempId}) & rebound ${matched.length} sample(s).`;
    });
  }

  /**
   * Lesson 2.4 (Pro Element Authoring): Inserts a brand-new standalone editable BIM element
   * via chained `tempId` requests (Item -> GlobalTF -> LocalTF -> Material -> Representation -> Sample).
   */
  async spawnNewGeometryElement(input: SpawnElementInput): Promise<void> {
    await this.runTransaction("Create New BIM Element", async ({ fragments, model }) => {
      const stamp = Date.now();
      const itemTempId = `item_${stamp}`;
      const gtTempId = `gt_${stamp}`;
      const ltTempId = `lt_${stamp}`;
      const matTempId = `mat_${stamp}`;
      const reprTempId = `repr_${stamp}`;
      const sampleTempId = `sample_${stamp}`;

      const rgb = hexToRgb(input.hex || "#2563eb");
      const rawRepr = this.buildShellRepresentation(input.shape, input.size, input.height);
      const cleanCategory = (input.category || "IFCBUILDINGELEMENTPROXY").trim().toUpperCase();

      const requests: FRAGS.EditRequest[] = [
        {
          type: FRAGS.EditRequestType.CREATE_ITEM,
          tempId: itemTempId,
          data: {
            category: cleanCategory,
            data: {
              Name: { value: `New ${input.shape} (${cleanCategory})`, type: "IFCLABEL" },
            },
          },
        },
        {
          type: FRAGS.EditRequestType.CREATE_GLOBAL_TRANSFORM,
          tempId: gtTempId,
          data: {
            itemId: itemTempId,
            position: [input.x, input.y, input.z],
            xDirection: [1, 0, 0],
            yDirection: [0, 1, 0],
          },
        },
        {
          type: FRAGS.EditRequestType.CREATE_LOCAL_TRANSFORM,
          tempId: ltTempId,
          data: {
            position: [0, 0, 0],
            xDirection: [1, 0, 0],
            yDirection: [0, 1, 0],
          },
        },
        {
          type: FRAGS.EditRequestType.CREATE_MATERIAL,
          tempId: matTempId,
          data: {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            a: 255,
            renderedFaces: 1,
            stroke: 0,
          },
        },
        {
          type: FRAGS.EditRequestType.CREATE_REPRESENTATION,
          tempId: reprTempId,
          data: rawRepr,
        },
        {
          type: FRAGS.EditRequestType.CREATE_SAMPLE,
          tempId: sampleTempId,
          data: {
            item: gtTempId,
            localTransform: ltTempId,
            material: matTempId,
            representation: reprTempId,
          },
        },
      ];

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      return `Spawned new ${input.shape.toUpperCase()} element (${cleanCategory}) at (${input.x}, ${input.y}, ${input.z}).`;
    });
  }

  async selectHistoryStep(index: number): Promise<void> {
    await this.runTransaction("History Time-Travel", async ({ fragments, model }) => {
      await fragments.core.editor.selectRequest(model.modelId, index);
      await fragments.core.update(true);
      return index < 0
        ? "Reverted to initial unmodified state."
        : `Jumped to edit step #${index + 1}.`;
    });
  }

  async undoLastEdit(): Promise<void> {
    const ctx = this.getFirstModel();
    if (!ctx) return;
    const history = await ctx.fragments.core.editor.getModelRequests(ctx.model.modelId);
    const activeCount = history?.requests?.length ?? 0;
    if (activeCount === 0) {
      this.emit("Nothing to undo.", "warn");
      return;
    }
    await this.selectHistoryStep(activeCount - 2);
  }

  async redoLastEdit(): Promise<void> {
    const ctx = this.getFirstModel();
    if (!ctx) return;
    const history = await ctx.fragments.core.editor.getModelRequests(ctx.model.modelId);
    const activeCount = history?.requests?.length ?? 0;
    const undoneCount = history?.undoneRequests?.length ?? 0;
    if (undoneCount === 0) {
      this.emit("Nothing to redo.", "warn");
      return;
    }
    await this.selectHistoryStep(activeCount);
  }

  async resetAllEdits(): Promise<void> {
    await this.runTransaction("Reset Edits", async ({ fragments, model }) => {
      await fragments.core.editor.reset(model.modelId);
      await fragments.core.update(true);
      this.inspectedItems = [];
      return "Reset all unsaved Fragment edits.";
    });
  }

  async saveAndDownloadFrag(): Promise<void> {
    await this.runTransaction("Save & Export .FRAG", async ({ fragments, model }) => {
      await fragments.core.editor.save(model.modelId);
      await fragments.core.update(true);
      const buffer = await model.getBuffer(false);
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${model.modelId.replace(/[^a-zA-Z0-9_-]/g, "_")}-edited.frag`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return `Saved & exported edited .frag (${(buffer.byteLength / 1024).toFixed(1)} KB).`;
    });
  }

  private async buildExplodeRequests(
    model: FRAGS.FragmentsModel,
    gapMeters: number,
    mode: ExplodeMode = "storeys",
    space: "global" | "local" = "global"
  ): Promise<FRAGS.EditRequest[]> {
    const requests: FRAGS.EditRequest[] = [];

    if (space === "local") {
      const ltMap = await model.getLocalTransforms();
      const uniqueBuckets = Array.from(
        new Set([...ltMap.values()].map((lt) => Math.round(lt.position[1] / 2.5)))
      ).sort((a, b) => a - b);

      for (const [localId, lt] of ltMap) {
        const tier = Math.max(0, uniqueBuckets.indexOf(Math.round(lt.position[1] / 2.5)));
        lt.position[1] += (tier + 1) * gapMeters;
        requests.push({
          type: FRAGS.EditRequestType.UPDATE_LOCAL_TRANSFORM,
          localId,
          data: lt,
        });
      }
      return requests;
    }

    if (mode === "disciplines") {
      const seenGt = new Set<number>();
      for (const { tier, regex } of DISCIPLINE_TIERS) {
        const matched = await model.getItemsOfCategories([regex]).catch(() => ({}));
        const itemIds = Object.values(matched).flat();
        if (itemIds.length === 0) continue;
        const gtIds = await model.getGlobalTranformsIdsOfItems(itemIds).catch(() => [] as number[]);
        if (gtIds.length === 0) continue;
        const gtMap = await model.getGlobalTransforms(gtIds);
        for (const [localId, gt] of gtMap) {
          if (seenGt.has(localId)) continue;
          seenGt.add(localId);
          gt.position[1] += tier * gapMeters;
          requests.push({
            type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
            localId,
            data: gt,
          });
        }
      }
      if (requests.length > 0) return requests;
    }

    if (mode === "radial") {
      const gtMap = await model.getGlobalTransforms();
      if (gtMap.size === 0) return [];
      let cx = 0;
      let cz = 0;
      for (const [, gt] of gtMap) {
        cx += gt.position[0];
        cz += gt.position[2];
      }
      cx /= gtMap.size;
      cz /= gtMap.size;

      for (const [localId, gt] of gtMap) {
        const dx = gt.position[0] - cx;
        const dz = gt.position[2] - cz;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25) continue;
        const scaleOffset = gapMeters / Math.max(dist, 4);
        gt.position[0] += dx * scaleOffset;
        gt.position[2] += dz * scaleOffset;
        requests.push({
          type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
          localId,
          data: gt,
        });
      }
      return requests;
    }

    // Default "storeys" mode: group all IFCBUILDINGSTOREY items sharing the same elevation (+/- 1.0m)
    // so multi-building sites (e.g. 10-Villa Compound) separate cleanly level-by-level instead of staggering!
    const storeyCatMap = await model.getItemsOfCategories([/BUILDINGSTOREY/]).catch(() => ({}));
    const storeyIds = Object.values(storeyCatMap).flat();

    if (storeyIds.length > 1) {
      const elevationBuckets = new Map<number, number[]>();
      for (const sid of storeyIds) {
        const childIds = await model.getItemsChildren([sid]).catch(() => [] as number[]);
        if (childIds.length === 0) continue;
        const gtIds = await model.getGlobalTranformsIdsOfItems(childIds).catch(() => [] as number[]);
        if (gtIds.length === 0) continue;
        const gtSample = await model.getGlobalTransforms(gtIds.slice(0, 20));
        let minY = Infinity;
        for (const [, tf] of gtSample) {
          if (tf.position[1] < minY) minY = tf.position[1];
        }
        const bucketKey = Number.isFinite(minY) ? Math.round(minY / 1.5) * 1.5 : 0;
        const prev = elevationBuckets.get(bucketKey) || [];
        prev.push(...gtIds);
        elevationBuckets.set(bucketKey, prev);
      }

      if (elevationBuckets.size > 1) {
        const sortedLevels = [...elevationBuckets.entries()].sort((a, b) => a[0] - b[0]);
        const seenGt = new Set<number>();
        for (let tierIdx = 0; tierIdx < sortedLevels.length; tierIdx++) {
          const levelGtIds = sortedLevels[tierIdx][1];
          const offsetY = tierIdx * gapMeters;
          if (offsetY === 0) {
            levelGtIds.forEach((id) => seenGt.add(id));
            continue;
          }
          const gtMap = await model.getGlobalTransforms(levelGtIds);
          for (const [localId, gt] of gtMap) {
            if (seenGt.has(localId)) continue;
            seenGt.add(localId);
            gt.position[1] += offsetY;
            requests.push({
              type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
              localId,
              data: gt,
            });
          }
        }
      }
    }

    // Uniform Y-elevation band fallback if model has no explicit storey hierarchy
    if (requests.length === 0) {
      const gtMap = await model.getGlobalTransforms();
      const bucketStep = 3.2;
      const uniqueBuckets = Array.from(
        new Set([...gtMap.values()].map((gt) => Math.round(gt.position[1] / bucketStep)))
      ).sort((a, b) => a - b);

      for (const [localId, gt] of gtMap) {
        const tier = uniqueBuckets.indexOf(Math.round(gt.position[1] / bucketStep));
        if (tier <= 0) continue;
        gt.position[1] += tier * gapMeters;
        requests.push({
          type: FRAGS.EditRequestType.UPDATE_GLOBAL_TRANSFORM,
          localId,
          data: gt,
        });
      }
    }

    return requests;
  }

  private async buildOpacityMaterialRequests(
    model: FRAGS.FragmentsModel,
    factor: number,
    tintHex?: string
  ): Promise<FRAGS.EditRequest[]> {
    const matMap = await model.getMaterials();
    if (matMap.size === 0) return [];
    const tintRgb = tintHex ? hexToRgb(tintHex) : null;
    const requests: FRAGS.EditRequest[] = [];
    for (const [localId, material] of matMap) {
      requests.push({
        type: FRAGS.EditRequestType.UPDATE_MATERIAL,
        localId,
        data: {
          r: tintRgb ? tintRgb.r : material.r,
          g: tintRgb ? tintRgb.g : material.g,
          b: tintRgb ? tintRgb.b : material.b,
          a: Math.max(12, Math.min(255, Math.round(material.a * factor))),
          renderedFaces: material.renderedFaces,
          stroke: material.stroke,
        },
      });
    }
    return requests;
  }

  /**
   * Pro architectural explode across Shared Storey Levels, IFC Disciplines, or Radial Compound expansion.
   */
  async explodeStoreysOrHeights(
    gapMeters = 6,
    space: "global" | "local" = "global",
    mode: ExplodeMode = "storeys"
  ): Promise<void> {
    await this.runTransaction("Explode View", async ({ fragments, model }) => {
      const requests = await this.buildExplodeRequests(model, gapMeters, mode, space);
      if (requests.length === 0) {
        this.emit("No layered transforms available to explode in this model.", "warn");
        return null;
      }
      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      return `Exploded (${mode}) across ${requests.length} transform(s) (gap: ${gapMeters}m).`;
    });
  }

  /**
   * Exploded Coordination View: separates levels/disciplines cleanly AND switches all
   * materials to translucent X-Ray inspection transparency with an audit metadata stamp.
   */
  async applyExplodedXRayView(
    gapMeters = 6,
    opacityFactor = 0.5,
    mode: ExplodeMode = "storeys"
  ): Promise<void> {
    await this.runTransaction("Exploded Coordination View", async ({ fragments, model }) => {
      const [explodeReqs, matReqs, currentMeta] = await Promise.all([
        this.buildExplodeRequests(model, gapMeters, mode, "global"),
        this.buildOpacityMaterialRequests(model, opacityFactor),
        model.getMetadata<Record<string, any>>().catch(() => ({})),
      ]);

      const requests: FRAGS.EditRequest[] = [
        ...explodeReqs,
        ...matReqs,
        {
          type: FRAGS.EditRequestType.UPDATE_METADATA,
          localId: 0,
          data: {
            ...(currentMeta || {}),
            editedBy: "Abdellah BELMAARIS",
            coordinationMode: `exploded-${mode}`,
            lastEditedAt: new Date().toISOString(),
          },
        },
      ];

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      this.metadataSnapshot = await model.getMetadata<Record<string, any>>().catch(() => null);
      return `Exploded (${mode}) + ${Math.round(opacityFactor * 100)}% X-Ray applied (${explodeReqs.length} transforms · ${matReqs.length} materials).`;
    });
  }

  /**
   * Lesson 2.3+ / Docs API: Updates color, alpha opacity, and face rendering on an
   * existing Fragment schema material (`EditRequestType.UPDATE_MATERIAL`).
   */
  async updateMaterial(input: MaterialUpdateInput): Promise<void> {
    await this.runTransaction("Update Material", async ({ fragments, model }) => {
      const matMap = await model.getMaterials();
      const targetId =
        input.materialId === "first" ? matMap.keys().next().value : input.materialId;
      if (targetId === undefined) {
        this.emit("No materials found in this fragment model.", "warn");
        return null;
      }

      const { r, g, b } = hexToRgb(input.hex);
      const updatedMat: FRAGS.RawMaterial = {
        r,
        g,
        b,
        a: Math.max(0, Math.min(255, Math.round(input.alpha))),
        renderedFaces: input.doubleSided ? FRAGS.RenderedFaces.TWO : FRAGS.RenderedFaces.ONE,
        stroke: FRAGS.Stroke.DEFAULT,
      };

      await fragments.core.editor.edit(model.modelId, [
        {
          type: FRAGS.EditRequestType.UPDATE_MATERIAL,
          localId: targetId,
          data: updatedMat,
        },
      ]);
      await fragments.core.update(true);
      return `Updated Material #${targetId} to ${input.hex.toUpperCase()} (α${updatedMat.a}).`;
    });
  }

  /**
   * Lesson 2.3 Part 1: Updates model-level metadata stored at schema localId `0`
   * via `EditRequestType.UPDATE_METADATA`, re-reads `getMetadata()`, and logs it.
   */
  async updateMetadata(entries: Record<string, any>): Promise<void> {
    await this.runTransaction("Update Metadata", async ({ fragments, model }) => {
      const current = (await model.getMetadata<Record<string, any>>().catch(() => ({}))) || {};
      const nextMetadata: Record<string, any> = {
        ...current,
        ...entries,
      };

      await fragments.core.editor.edit(model.modelId, [
        {
          type: FRAGS.EditRequestType.UPDATE_METADATA,
          localId: 0,
          data: nextMetadata,
        },
      ]);
      await fragments.core.update(true);

      const verified = await model.getMetadata<Record<string, any>>().catch(() => nextMetadata);
      this.metadataSnapshot = verified;
      console.log("[FragmentsEditStudio] Updated Metadata (localId: 0):", verified);
      return `Updated model metadata (${Object.keys(entries).join(", ")}) — see Console & Inspector.`;
    });
  }

  /**
   * Lesson 2.3 Part 2: Batch-scales alpha opacity across every material in `model.getMaterials()`
   * (e.g. factor = 0.5 reduces opacity by 50%) via `EditRequestType.UPDATE_MATERIAL`.
   */
  async bulkScaleMaterialsOpacity(factor = 0.5, tintHex?: string): Promise<void> {
    await this.runTransaction("Bulk Materials Opacity", async ({ fragments, model }) => {
      const requests = await this.buildOpacityMaterialRequests(model, factor, tintHex);
      if (requests.length === 0) {
        this.emit("No materials found in this fragment model.", "warn");
        return null;
      }

      await fragments.core.editor.edit(model.modelId, requests);
      await fragments.core.update(true);
      const pct = Math.round(factor * 100);
      return tintHex
        ? `Tinted ${requests.length} materials to ${tintHex.toUpperCase()} (${pct}% alpha).`
        : `Updated ${requests.length} materials opacity (×${factor}).`;
    });
  }

  /**
   * Lesson 2.3: Natural-language AI Edit prompt dispatcher across Metadata, Materials,
   * Storeys Explode, Item Properties, and Reset APIs.
   */
  async runAiEditPrompt(promptText: string): Promise<void> {
    const raw = promptText.trim();
    if (!raw) {
      this.emit("Enter an AI edit command first.", "warn");
      return;
    }
    const lower = raw.toLowerCase();

    if (lower.includes("reset") || lower.includes("restore")) {
      await this.resetAllEdits();
      return;
    }

    if (lower.includes("explode") || lower.includes("layers") || lower.includes("storey")) {
      const gapMatch = raw.match(/(\d+(?:\.\d+)?)\s*m?/i);
      const gap = gapMatch ? Math.max(2, Math.min(30, parseFloat(gapMatch[1]))) : 8;
      await this.explodeStoreysOrHeights(gap, lower.includes("local") ? "local" : "global");
      return;
    }

    if (lower.includes("metadata") || lower.includes("author") || lower.includes("stamp")) {
      const kvMatch = raw.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^\s,;]+(?:\s+[^\s,;]+)*)/);
      const key = kvMatch ? kvMatch[1] : "editedBy";
      const val = kvMatch
        ? kvMatch[2].trim()
        : raw.replace(/^(update|set|stamp)?\s*(metadata|author)\s*(by|to|:)?\s*/i, "").trim() ||
          "Abdellah BELMAARIS";
      await this.updateMetadata({
        [key]: val,
        lastEditedAt: new Date().toISOString(),
      });
      return;
    }

    if (lower.includes("opacity") || lower.includes("transparent") || lower.includes("alpha")) {
      const pctMatch = raw.match(/(\d{1,3})\s*%?/);
      const pct = pctMatch ? Math.max(5, Math.min(100, parseInt(pctMatch[1], 10))) : 50;
      const hexMatch = raw.match(/#[0-9a-fA-F]{3,6}/);
      await this.bulkScaleMaterialsOpacity(pct / 100, hexMatch?.[0]);
      return;
    }

    if (lower.includes("tint") || lower.includes("color") || lower.includes("material")) {
      const hexMatch = raw.match(/#[0-9a-fA-F]{3,6}/);
      const colorMap: Record<string, string> = {
        red: "#ef4444",
        green: "#10b981",
        blue: "#2563eb",
        amber: "#f59e0b",
        orange: "#f97316",
        purple: "#a855f7",
        white: "#f4f4f5",
        dark: "#27272a",
      };
      const namedColor = Object.keys(colorMap).find((k) => lower.includes(k));
      const targetHex = hexMatch?.[0] || (namedColor ? colorMap[namedColor] : "#2563eb");
      await this.bulkScaleMaterialsOpacity(1, targetHex);
      return;
    }

    if (lower.includes("window") || lower.includes("door") || lower.includes("wall") || lower.includes("tag")) {
      const cat = lower.includes("door")
        ? "DOOR"
        : lower.includes("wall")
          ? "WALL"
          : lower.includes("slab")
            ? "SLAB"
            : "WINDOW";
      await this.applyItemAttributeEdit({
        scope: "category",
        categoryRegex: cat,
        key: "aiReview",
        value: raw,
        ifcType: "IFCLABEL",
      });
      return;
    }

    const numMatch = raw.match(/(-?\d+(?:\.\d+)?)/);
    if (lower.includes("move") || lower.includes("shift") || lower.includes("lift")) {
      const val = numMatch ? parseFloat(numMatch[1]) : 10;
      await this.applyTransform({
        space: lower.includes("local") ? "local" : "global",
        scope: "all",
        dx: 0,
        dy: val,
        dz: 0,
        rotYDeg: 0,
      });
      return;
    }

    this.emit(
      'Try: "Set opacity 50%", "Metadata editedBy=Abdellah", "Explode 8m", or "Tag windows Reviewed".',
      "warn"
    );
  }

  /**
   * Docs API (`getGuidsByLocalIds` + `getEditedElements`): inspects selected element GUIDs.
   */
  async inspectSelectedGuids(): Promise<void> {
    await this.runTransaction("Inspect GUIDs", async ({ model }) => {
      const highlighter = this.components.get(OBCF.Highlighter);
      const selectedSet = highlighter.selection.select?.[model.modelId];
      const ids = selectedSet ? [...selectedSet] : [];
      if (ids.length === 0) {
        this.emit("Select element(s) in 3D to resolve their IFC GUIDs.", "warn");
        return null;
      }
      const guids = await model.getGuidsByLocalIds(ids.slice(0, 20));
      this.selectedGuids = guids.filter((g): g is string => Boolean(g));
      return `Resolved ${this.selectedGuids.length} IFC GUID(s) from ${ids.length} selected element(s).`;
    });
  }

  /**
   * Syncs telemetry/history cleanly after an external Reset Full operation.
   */
  async syncAfterExternalReset(): Promise<void> {
    this.inspectedItems = [];
    this.selectedGuids = [];
    const ctx = this.getFirstModel();
    if (!ctx) {
      this.emit();
      return;
    }
    await this.refreshHistoryAndTelemetry(ctx.fragments, ctx.model);
    this.emit("Full reset complete — model edits & highlights restored.", "info");
  }

  /**
   * Loads an official That Open Company sample `.frag` model directly into the active World
   * (e.g. `HNS-CTL-N01-MOD-ARQ.frag` for Before/After Exploded Edits).
   */
  async loadOpenCompanySample(fileName = "HNS-CTL-N01-MOD-ARQ.frag"): Promise<void> {
    const worlds = this.components.get(OBC.Worlds);
    const world = [...worlds.list.values()][0];
    if (!world) {
      this.emit("3D World is not initialized yet.", "warn");
      return;
    }

    this.isBusy = true;
    this.emit(`Loading official Open Company model (${fileName})...`, "info");
    try {
      const fragments = this.components.get(OBC.FragmentsManager);
      if (!fragments.initialized) {
        const workerUrl = await OBC.FragmentsManager.getWorker();
        fragments.init(workerUrl);
      }

      // Dispose previous fragment models cleanly before loading the sample
      for (const existing of [...fragments.list.values()]) {
        try {
          existing.dispose();
        } catch {}
      }

      // Remove procedural non-fragment showcase groups cleanly from scene
      for (const child of [...world.scene.three.children]) {
        if (
          child.type === "Group" &&
          !child.name.toLowerCase().includes("grid") &&
          !child.name.toLowerCase().includes("helper")
        ) {
          world.scene.three.remove(child);
        }
      }

      const res = await fetch(`/models/frag/${fileName}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${fileName}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const modelId = fileName.replace(/\.frag$/i, "");
      const cam = world.camera?.three as THREE.PerspectiveCamera | THREE.OrthographicCamera;
      const fragModel = await fragments.core.load(bytes, { modelId, camera: cam });
      world.scene.three.add(fragModel.object);
      if (cam && typeof fragModel.useCamera === "function") {
        cam.updateMatrixWorld(true);
        fragModel.useCamera(cam);
      }
      await fragments.core.update(true);

      const controls = (world.camera as { controls?: { fitToBox: Function } })?.controls;
      if (controls) {
        const bbox = new THREE.Box3().setFromObject(fragModel.object);
        if (!bbox.isEmpty()) {
          await controls.fitToBox(bbox, true, { paddingLeft: 1.2, paddingRight: 1.2, paddingTop: 1.2, paddingBottom: 1.2 });
        }
      }

      await this.refreshHistoryAndTelemetry(fragments, fragModel);
      this.emit(`Loaded Open Company model "${modelId}" (${this.schema?.items ?? 0} items).`, "info");
    } catch (err: any) {
      console.error("[FragmentsEditStudio] Sample load failed:", err);
      this.emit(`Failed loading ${fileName}: ${err?.message || err}`, "warn");
    } finally {
      this.isBusy = false;
      this.emit();
    }
  }
}

