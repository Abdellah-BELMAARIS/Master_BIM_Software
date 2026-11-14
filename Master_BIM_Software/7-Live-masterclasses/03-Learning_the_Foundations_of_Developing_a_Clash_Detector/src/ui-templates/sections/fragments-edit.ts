import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { ExplodeMode, FragmentsEditStudio, GeometryShapePreset } from "../../bim-components/FragmentsEditStudio";

export interface FragmentsEditSectionState {
  components: OBC.Components;
  activeTab?: "transforms" | "items" | "materials" | "geometry";
  transformSpace?: "global" | "local";
  transformScope?: "all" | "selected" | "category";
  transformCategory?: string;
  dx?: number;
  dy?: number;
  dz?: number;
  rotYDeg?: number;
  explodeMode?: ExplodeMode;
  explodeGap?: number;
  itemScope?: "category" | "selected";
  itemCategory?: string;
  attrKey?: string;
  attrValue?: string;
  metaKey?: string;
  metaValue?: string;
  selectedMaterialId?: number | "first";
  matEditHex?: string;
  matEditAlpha?: number;
  geomShape?: GeometryShapePreset;
  geomScope?: "selected" | "category" | "all";
  geomCategory?: string;
  geomSize?: number;
  geomHeight?: number;
  spawnX?: number;
  spawnY?: number;
  spawnZ?: number;
}

/**
 * Module 6 (Lessons 2.1 – 2.3): Clean Pro Fragments Edit Studio.
 * Focused, single-screen layout with neutral obsidian surfaces and zero visual clutter.
 */
export const fragmentsEditTemplate: BUI.StatefullComponent<FragmentsEditSectionState> = (
  state,
  update
) => {
  const { components } = state;
  const studio = components.get(FragmentsEditStudio);

  const tab = state.activeTab || "transforms";
  const transformSpace = state.transformSpace || "global";
  const transformScope = state.transformScope || "all";
  const transformCategory = state.transformCategory ?? "WINDOW";
  const dx = state.dx ?? 0;
  const dy = state.dy ?? 10;
  const dz = state.dz ?? 0;
  const rotYDeg = state.rotYDeg ?? 0;
  const explodeMode = state.explodeMode || "storeys";
  const explodeGap = state.explodeGap ?? 6;

  const itemScope = state.itemScope || "category";
  const itemCategory = state.itemCategory ?? "WINDOW";
  const attrKey = state.attrKey ?? "customProp";
  const attrValue = state.attrValue ?? "Reviewed";
  const metaKey = state.metaKey ?? "editedBy";
  const metaValue = state.metaValue ?? "Abdellah BELMAARIS";

  const selectedMaterialId = state.selectedMaterialId ?? "first";
  const matEditHex = state.matEditHex ?? "#2563eb";
  const matEditAlpha = state.matEditAlpha ?? 255;

  const geomShape: GeometryShapePreset = state.geomShape || "disc";
  const geomScope = state.geomScope || "selected";
  const geomCategory = state.geomCategory ?? "WINDOW";
  const geomSize = state.geomSize ?? 1.5;
  const geomHeight = state.geomHeight ?? 2.4;
  const spawnX = state.spawnX ?? 0;
  const spawnY = state.spawnY ?? 2;
  const spawnZ = state.spawnZ ?? 0;

  const cardBg = "rgba(25, 26, 30, 0.94)";
  const subCardBg = "rgba(34, 35, 41, 0.9)";
  const inputBg = "#121316";
  const borderCol = "rgba(255, 255, 255, 0.12)";

  const categoryOptions =
    studio.categories.length > 0
      ? studio.categories
      : ["IFCWALL", "IFCWINDOW", "IFCDOOR", "IFCSLAB", "IFCCOLUMN", "IFCBEAM"];

  const statsSummary = studio.schema
    ? `${studio.schema.items.toLocaleString()} items · ${studio.schema.samples.toLocaleString()} samples · ${studio.schema.materials} mats`
    : "Click Scan to inspect active model";

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 10px; padding: 2px; color: #f4f4f5;">
      <!-- Compact Model & Scan Header -->
      <div
        style="
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 9px 11px; border-radius: 9px;
          background: ${cardBg}; border: 1px solid ${borderCol};
        "
      >
        <div style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 0.76rem; font-weight: 700; color: #f4f4f5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${studio.modelId || "No Fragment Model Loaded"}
          </span>
          <span style="font-size: 0.67rem; color: #a1a1aa;">
            ${statsSummary}
          </span>
        </div>
        <button
          type="button"
          ?disabled=${studio.isBusy}
          @click=${() => studio.scanModel()}
          style="
            padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.18);
            background: ${subCardBg}; color: #f4f4f5; font-size: 0.7rem; font-weight: 700; cursor: pointer; flex-shrink: 0;
          "
        >
          ${studio.isBusy ? "..." : "Scan"}
        </button>
      </div>

      <!-- Clean 4-Tab Navigation -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 3px; border-radius: 8px; background: ${inputBg}; border: 1px solid ${borderCol};">
        ${([
          { id: "transforms", label: "Transforms" },
          { id: "items", label: "Items" },
          { id: "materials", label: "Materials" },
          { id: "geometry", label: "Geometry" },
        ] as const).map(
          (item) => BUI.html`
            <button
              type="button"
              @click=${() => update({ activeTab: item.id })}
              style="
                padding: 6px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;
                border: 1px solid ${tab === item.id ? "rgba(255, 255, 255, 0.24)" : "transparent"};
                background: ${tab === item.id ? subCardBg : "transparent"};
                color: ${tab === item.id ? "#ffffff" : "#a1a1aa"};
              "
            >
              ${item.label}
            </button>
          `
        )}
      </div>

      <!-- TAB 1: TRANSFORMS & EXPLODE VIEW (Lesson 2.1) -->
      ${tab === "transforms"
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px;">
                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                  Space
                  <select
                    .value=${transformSpace}
                    @change=${(e: Event) =>
                      update({
                        transformSpace: (e.target as HTMLSelectElement).value as "global" | "local",
                      })}
                    style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                  >
                    <option value="global">Global</option>
                    <option value="local">Local</option>
                  </select>
                </label>

                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                  Scope
                  <select
                    .value=${transformScope}
                    ?disabled=${transformSpace === "local"}
                    @change=${(e: Event) =>
                      update({
                        transformScope: (e.target as HTMLSelectElement).value as
                          | "all"
                          | "selected"
                          | "category",
                      })}
                    style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                  >
                    <option value="all">Entire Model</option>
                    <option value="selected">Selected Elements</option>
                    <option value="category">IFC Category</option>
                  </select>
                </label>
              </div>

              ${transformSpace === "global" && transformScope === "category"
                ? BUI.html`
                    <input
                      type="text"
                      .value=${transformCategory}
                      list="toc-frag-cats"
                      @input=${(e: Event) =>
                        update({ transformCategory: (e.target as HTMLInputElement).value })}
                      placeholder="Category regex (e.g. WINDOW, WALL)"
                      style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                    />
                  `
                : ""}

              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  ΔX
                  <input
                    type="number"
                    step="0.5"
                    .value=${String(dx)}
                    @input=${(e: Event) =>
                      update({ dx: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                    style="padding: 5px 6px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                  />
                </label>
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  ΔY
                  <input
                    type="number"
                    step="0.5"
                    .value=${String(dy)}
                    @input=${(e: Event) =>
                      update({ dy: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                    style="padding: 5px 6px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                  />
                </label>
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  ΔZ
                  <input
                    type="number"
                    step="0.5"
                    .value=${String(dz)}
                    @input=${(e: Event) =>
                      update({ dz: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                    style="padding: 5px 6px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                  />
                </label>
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  Rot Y°
                  <input
                    type="number"
                    step="15"
                    .value=${String(rotYDeg)}
                    @input=${(e: Event) =>
                      update({ rotYDeg: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                    style="padding: 5px 6px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                  />
                </label>
              </div>

              <button
                type="button"
                ?disabled=${studio.isBusy}
                @click=${() =>
                  studio.applyTransform({
                    space: transformSpace,
                    scope: transformSpace === "local" ? "all" : transformScope,
                    categoryRegex: transformCategory,
                    dx,
                    dy,
                    dz,
                    rotYDeg,
                  })}
                style="padding: 8px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.22); background: #2563eb; color: #ffffff; font-size: 0.75rem; font-weight: 700; cursor: pointer;"
              >
                Apply Transform
              </button>

              <div style="display: flex; flex-direction: column; gap: 7px; border-top: 1px solid ${borderCol}; padding-top: 8px;">
                <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 6px;">
                  <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                    Explode Mode
                    <select
                      .value=${explodeMode}
                      @change=${(e: Event) =>
                        update({ explodeMode: (e.target as HTMLSelectElement).value as ExplodeMode })}
                      style="padding: 5px 6px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.72rem;"
                    >
                      <option value="storeys">Floor Levels (Storeys)</option>
                      <option value="disciplines">IFC Disciplines Stack</option>
                      <option value="radial">Radial Compound Spread</option>
                    </select>
                  </label>
                  <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                    Gap (m)
                    <input
                      type="number"
                      min="2"
                      max="30"
                      step="1"
                      .value=${String(explodeGap)}
                      @input=${(e: Event) =>
                        update({ explodeGap: parseFloat((e.target as HTMLInputElement).value) || 6 })}
                      style="padding: 5px 6px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.72rem;"
                    />
                  </label>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1.25fr; gap: 6px;">
                  <button
                    type="button"
                    ?disabled=${studio.isBusy}
                    @click=${() => studio.explodeStoreysOrHeights(explodeGap, transformSpace, explodeMode)}
                    style="padding: 7px 9px; border-radius: 7px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #f4f4f5; font-size: 0.71rem; font-weight: 700; cursor: pointer;"
                  >
                    Explode
                  </button>
                  <button
                    type="button"
                    ?disabled=${studio.isBusy}
                    @click=${() => studio.applyExplodedXRayView(explodeGap, 0.5, explodeMode)}
                    style="padding: 7px 9px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.22); background: ${subCardBg}; color: #ffffff; font-size: 0.71rem; font-weight: 700; cursor: pointer;"
                  >
                    Explode + 50% X-Ray
                  </button>
                </div>
              </div>
            </div>
          `
        : ""}

      <!-- TAB 2: ITEMS & METADATA (Lessons 2.2 & 2.3) -->
      ${tab === "items"
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">
                Element Attributes (UPDATE_ITEM)
              </span>
              <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 6px;">
                <select
                  .value=${itemScope}
                  @change=${(e: Event) =>
                    update({ itemScope: (e.target as HTMLSelectElement).value as "category" | "selected" })}
                  style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                >
                  <option value="category">By IFC Category</option>
                  <option value="selected">Selected Elements</option>
                </select>
                <input
                  type="text"
                  ?disabled=${itemScope !== "category"}
                  list="toc-frag-cats"
                  .value=${itemCategory}
                  @input=${(e: Event) =>
                    update({ itemCategory: (e.target as HTMLInputElement).value })}
                  placeholder="WINDOW, WALL..."
                  style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 6px;">
                <input
                  type="text"
                  .value=${attrKey}
                  @input=${(e: Event) => update({ attrKey: (e.target as HTMLInputElement).value })}
                  placeholder="Attribute key"
                  style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                />
                <input
                  type="text"
                  .value=${attrValue}
                  @input=${(e: Event) => update({ attrValue: (e.target as HTMLInputElement).value })}
                  placeholder="Attribute value"
                  style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.73rem;"
                />
              </div>

              <button
                type="button"
                ?disabled=${studio.isBusy}
                @click=${() =>
                  studio.applyItemAttributeEdit({
                    scope: itemScope,
                    categoryRegex: itemCategory,
                    key: attrKey,
                    value: attrValue,
                    ifcType: "IFCLABEL",
                  })}
                style="padding: 7px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.2); background: #15803d; color: #ffffff; font-size: 0.73rem; font-weight: 700; cursor: pointer;"
              >
                Update Items
              </button>

              ${studio.inspectedItems.length > 0
                ? BUI.html`
                    <div style="display: flex; flex-direction: column; gap: 4px; max-height: 110px; overflow-y: auto; padding-top: 4px;">
                      ${studio.inspectedItems.map(
                        (item) => BUI.html`
                          <div style="padding: 5px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; font-size: 0.67rem; font-family: monospace;">
                            <span style="color: #f4f4f5;">#${item.localId} (${item.category}):</span>
                            <span style="color: #34d399;"> ${attrKey}=${JSON.stringify(item.data[attrKey]?.value ?? "—")}</span>
                          </div>
                        `
                      )}
                    </div>
                  `
                : ""}

              <!-- Model Metadata (localId: 0) -->
              <div style="display: flex; flex-direction: column; gap: 6px; border-top: 1px solid ${borderCol}; padding-top: 8px;">
                <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">
                  File Metadata (UPDATE_METADATA · localId: 0)
                </span>
                <div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 6px;">
                  <input
                    type="text"
                    .value=${metaKey}
                    @input=${(e: Event) => update({ metaKey: (e.target as HTMLInputElement).value })}
                    placeholder="Key (e.g. editedBy)"
                    style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.72rem;"
                  />
                  <input
                    type="text"
                    .value=${metaValue}
                    @input=${(e: Event) => update({ metaValue: (e.target as HTMLInputElement).value })}
                    placeholder="Author / Value"
                    style="padding: 6px 8px; border-radius: 6px; background: ${inputBg}; border: 1px solid ${borderCol}; color: #f4f4f5; font-size: 0.72rem;"
                  />
                </div>
                <button
                  type="button"
                  ?disabled=${studio.isBusy}
                  @click=${() =>
                    studio.updateMetadata({
                      [metaKey.trim() || "editedBy"]: metaValue,
                      lastEditedAt: new Date().toISOString(),
                    })}
                  style="padding: 7px; border-radius: 7px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #f4f4f5; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
                >
                  Update Metadata
                </button>
              </div>
            </div>
          `
        : ""}

      <!-- TAB 3: MATERIALS & SAMPLE INSTANCES (Lessons 2.2 & 2.3) -->
      ${tab === "materials"
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              <div style="display: flex; flex-wrap: wrap; gap: 5px; max-height: 92px; overflow-y: auto; padding: 6px; border-radius: 7px; background: ${inputBg}; border: 1px solid ${borderCol};">
                ${studio.materials.length > 0
                  ? studio.materials.map(
                      (m) => BUI.html`
                        <button
                          type="button"
                          @click=${() =>
                            update({
                              selectedMaterialId: m.id,
                              matEditHex: m.hex,
                              matEditAlpha: m.a,
                            })}
                          style="
                            display: inline-flex; align-items: center; gap: 5px; padding: 4px 7px; border-radius: 6px; cursor: pointer;
                            border: 1px solid ${selectedMaterialId === m.id ? "#ffffff" : borderCol};
                            background: ${selectedMaterialId === m.id ? subCardBg : "transparent"};
                            color: #e4e4e7; font-size: 0.65rem; font-family: monospace;
                          "
                        >
                          <span style="width: 10px; height: 10px; border-radius: 3px; background: ${m.hex}; border: 1px solid rgba(255,255,255,0.28);"></span>
                          <span>#${m.id}</span>
                        </button>
                      `
                    )
                  : BUI.html`<span style="font-size: 0.69rem; color: #71717a;">Click Scan to load model materials.</span>`}
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <input
                  type="color"
                  .value=${matEditHex}
                  @input=${(e: Event) =>
                    update({ matEditHex: (e.target as HTMLInputElement).value })}
                  style="width: 36px; height: 28px; border-radius: 6px; border: 1px solid ${borderCol}; background: transparent; cursor: pointer; padding: 0;"
                />
                <label style="flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  Opacity (${Math.round((matEditAlpha / 255) * 100)}%)
                  <input
                    type="range"
                    min="25"
                    max="255"
                    step="5"
                    .value=${String(matEditAlpha)}
                    @input=${(e: Event) =>
                      update({ matEditAlpha: parseInt((e.target as HTMLInputElement).value, 10) || 255 })}
                    style="width: 100%; accent-color: #ffffff; cursor: pointer;"
                  />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button
                  type="button"
                  ?disabled=${studio.isBusy}
                  @click=${() =>
                    studio.updateMaterial({
                      materialId: selectedMaterialId,
                      hex: matEditHex,
                      alpha: matEditAlpha,
                      doubleSided: true,
                    })}
                  style="padding: 7px; border-radius: 7px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #f4f4f5; font-size: 0.7rem; font-weight: 700; cursor: pointer;"
                >
                  Edit Selected Mat
                </button>
                <button
                  type="button"
                  ?disabled=${studio.isBusy}
                  @click=${() => studio.bulkScaleMaterialsOpacity(0.5)}
                  style="padding: 7px; border-radius: 7px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #f4f4f5; font-size: 0.7rem; font-weight: 700; cursor: pointer;"
                >
                  50% All Opacity
                </button>
              </div>

              <button
                type="button"
                ?disabled=${studio.isBusy}
                @click=${() =>
                  studio.applySampleMaterialEdit({
                    scope: "all",
                    categoryRegex: "WINDOW",
                    materialId: selectedMaterialId,
                  })}
                style="padding: 7px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.2); background: #b45309; color: #ffffff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
              >
                Apply Material to All Sample Instances
              </button>
            </div>
          `
        : ""}

      <!-- TAB 4: GEOMETRY & REPRESENTATIONS (Lesson 2.4) -->
      ${tab === "geometry"
        ? BUI.html`
            <div style="display: flex; flex-direction: column; gap: 9px; padding: 11px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px;">
                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                  Shell Preset
                  <select
                    .value=${geomShape}
                    @change=${(e: Event) =>
                      update({ geomShape: (e.target as HTMLSelectElement).value as GeometryShapePreset })}
                    style="padding: 6px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.73rem;"
                  >
                    <option value="disc">Disc Geometry (Shell)</option>
                    <option value="box">Box Block (Shell)</option>
                    <option value="column">Column Cylinder (Shell)</option>
                    <option value="sphere">Sphere Node (Shell)</option>
                  </select>
                </label>

                <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                  Target Scope
                  <select
                    .value=${geomScope}
                    @change=${(e: Event) =>
                      update({ geomScope: (e.target as HTMLSelectElement).value as "selected" | "category" | "all" })}
                    style="padding: 6px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.73rem;"
                  >
                    <option value="selected">Selected Elements</option>
                    <option value="category">IFC Category Filter</option>
                    <option value="all">Entire Model</option>
                  </select>
                </label>
              </div>

              ${geomScope === "category"
                ? BUI.html`
                    <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.67rem; color: #a1a1aa; font-weight: 600;">
                      IFC Category
                      <input
                        type="text"
                        list="toc-frag-cats"
                        .value=${geomCategory}
                        @input=${(e: Event) => update({ geomCategory: (e.target as HTMLInputElement).value })}
                        style="padding: 6px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.73rem;"
                      />
                    </label>
                  `
                : ""}

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.66rem; color: #a1a1aa;">
                  Size / Radius (m)
                  <input
                    type="number"
                    step="0.25"
                    min="0.15"
                    .value=${String(geomSize)}
                    @input=${(e: Event) => update({ geomSize: Number((e.target as HTMLInputElement).value) })}
                    style="padding: 6px 7px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.74rem;"
                  />
                </label>
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.66rem; color: #a1a1aa;">
                  Height (m)
                  <input
                    type="number"
                    step="0.25"
                    min="0.15"
                    .value=${String(geomHeight)}
                    @input=${(e: Event) => update({ geomHeight: Number((e.target as HTMLInputElement).value) })}
                    style="padding: 6px 7px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.74rem;"
                  />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button
                  type="button"
                  ?disabled=${studio.isBusy}
                  @click=${() =>
                    studio.updateExistingRepresentations({
                      shape: geomShape,
                      scope: geomScope,
                      categoryRegex: geomCategory,
                      size: geomSize,
                      height: geomHeight,
                    })}
                  style="padding: 7px; border-radius: 7px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #f4f4f5; font-size: 0.69rem; font-weight: 700; cursor: pointer;"
                >
                  Update Repr (In-Place)
                </button>
                <button
                  type="button"
                  ?disabled=${studio.isBusy}
                  @click=${() =>
                    studio.createAndAssignGeometry({
                      shape: geomShape,
                      scope: geomScope,
                      categoryRegex: geomCategory,
                      size: geomSize,
                      height: geomHeight,
                    })}
                  style="padding: 7px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.2); background: #2563eb; color: #ffffff; font-size: 0.69rem; font-weight: 700; cursor: pointer;"
                >
                  Create & Assign (tempId)
                </button>
              </div>

              <div style="height: 1px; background: ${borderCol}; margin: 2px 0;"></div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.7rem; font-weight: 700; color: #e4e4e7;">Spawn New Element</span>
                <span style="font-size: 0.65rem; color: #a1a1aa;">Reprs: ${studio.schema?.representations ?? 0}</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 6px; align-items: end;">
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  X (m)
                  <input
                    type="number"
                    step="1"
                    .value=${String(spawnX)}
                    @input=${(e: Event) => update({ spawnX: Number((e.target as HTMLInputElement).value) })}
                    style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                  />
                </label>
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  Y (m)
                  <input
                    type="number"
                    step="1"
                    .value=${String(spawnY)}
                    @input=${(e: Event) => update({ spawnY: Number((e.target as HTMLInputElement).value) })}
                    style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                  />
                </label>
                <label style="display: flex; flex-direction: column; gap: 2px; font-size: 0.65rem; color: #a1a1aa;">
                  Z (m)
                  <input
                    type="number"
                    step="1"
                    .value=${String(spawnZ)}
                    @input=${(e: Event) => update({ spawnZ: Number((e.target as HTMLInputElement).value) })}
                    style="padding: 5px 6px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${inputBg}; color: #f4f4f5; font-size: 0.72rem;"
                  />
                </label>
                <input
                  type="color"
                  .value=${matEditHex}
                  @input=${(e: Event) => update({ matEditHex: (e.target as HTMLInputElement).value })}
                  style="width: 30px; height: 28px; border-radius: 5px; border: 1px solid ${borderCol}; background: transparent; cursor: pointer;"
                />
              </div>

              <button
                type="button"
                ?disabled=${studio.isBusy}
                @click=${() =>
                  studio.spawnNewGeometryElement({
                    shape: geomShape,
                    size: geomSize,
                    height: geomHeight,
                    x: spawnX,
                    y: spawnY,
                    z: spawnZ,
                    hex: matEditHex,
                    category: "IFCBUILDINGELEMENTPROXY",
                  })}
                style="padding: 7px; border-radius: 7px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #ffffff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
              >
                Create New BIM Element (Chained Requests)
              </button>
            </div>
          `
        : ""}

      <!-- Compact History & Export Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 8px 10px; border-radius: 9px; background: ${cardBg}; border: 1px solid ${borderCol};">
        <div style="display: inline-flex; align-items: center; gap: 4px;">
          <button
            type="button"
            ?disabled=${studio.isBusy || studio.activeRequests.length === 0}
            @click=${() => studio.undoLastEdit()}
            style="padding: 5px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #e4e4e7; font-size: 0.68rem; font-weight: 600; cursor: pointer;"
          >
            Undo (${studio.activeRequests.length})
          </button>
          <button
            type="button"
            ?disabled=${studio.isBusy || studio.undoneRequests.length === 0}
            @click=${() => studio.redoLastEdit()}
            style="padding: 5px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${subCardBg}; color: #e4e4e7; font-size: 0.68rem; font-weight: 600; cursor: pointer;"
          >
            Redo
          </button>
        </div>
        <div style="display: inline-flex; align-items: center; gap: 5px;">
          <button
            type="button"
            ?disabled=${studio.isBusy}
            @click=${() => studio.resetAllEdits()}
            style="padding: 5px 9px; border-radius: 6px; border: 1px solid rgba(248, 113, 113, 0.35); background: rgba(239, 68, 68, 0.14); color: #fca5a5; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
          >
            Reset
          </button>
          <button
            type="button"
            ?disabled=${studio.isBusy}
            @click=${() => studio.saveAndDownloadFrag()}
            style="padding: 5px 9px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.22); background: ${subCardBg}; color: #ffffff; font-size: 0.68rem; font-weight: 700; cursor: pointer;"
          >
            Export .FRAG
          </button>
        </div>
      </div>

      <div
        style="
          padding: 6px 9px; border-radius: 7px; font-size: 0.68rem; font-weight: 600;
          background: ${inputBg};
          border: 1px solid ${studio.statusTone === "warn" ? "rgba(245, 158, 11, 0.45)" : borderCol};
          color: ${studio.statusTone === "warn" ? "#fcd34d" : "#d4d4d8"};
        "
      >
        ${studio.statusMessage}
      </div>

      <datalist id="toc-frag-cats">
        ${categoryOptions.map((c) => BUI.html`<option value=${c}></option>`)}
      </datalist>
    </div>
  `;
};
