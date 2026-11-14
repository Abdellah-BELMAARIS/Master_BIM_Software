import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { BimProSuite } from "../../bim-components/BimProSuite";

export interface ProStudioSectionState {
  components: OBC.Components;
  fireRatingDraft?: string;
  phaseTagDraft?: string;
  costUsdDraft?: string;
  notesDraft?: string;
}

/**
 * Advanced Pro BIM Studio Panel:
 * - Live Element Property Override Editor & .FRAG Binary Snapshot Exporter
 */
export const proStudioTemplate: BUI.StatefullComponent<ProStudioSectionState> = (
  state: ProStudioSectionState,
) => {
  const { components } = state;
  const pro = components.get(BimProSuite);

  const target = pro.selectedEditTarget;
  let fireDraft = state.fireRatingDraft ?? target?.fireRating ?? "";
  let phaseDraft = state.phaseTagDraft ?? target?.phaseTag ?? "";
  let costDraft = state.costUsdDraft ?? target?.costUsd ?? "";
  let notesDraft = state.notesDraft ?? target?.notes ?? "";

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 11px; width: 100%; height: 100%; padding: 14px 16px; box-sizing: border-box;">
      <!-- Pro Studio Header -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(19, 20, 24, 0.94));
          border: 1px solid rgba(192, 132, 252, 0.4);
        "
      >
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.86rem; font-weight: 800; color: #f8fafc;">BIM Pro Studio</span>
            <span style="font-size: 0.60rem; padding: 1px 6px; border-radius: 4px; background: rgba(168, 85, 247, 0.25); color: #d8b4fe; font-weight: 700;">EDIT · FRAG</span>
          </div>
          <span style="font-size: 0.69rem; color: #94a3b8;">Live Property Overrides &amp; .FRAG Binary Export</span>
        </div>
      </div>

      <!-- Status Strip -->
      <div style="padding: 6px 10px; border-radius: 7px; background: rgba(32, 33, 38, 0.68); border: 1px solid rgba(148, 163, 184, 0.22); font-size: 0.70rem; color: #e2e8f0;">
        ${pro.statusMessage}
      </div>

      <!-- Live Property Override Editor & .FRAG Binary Exporter -->
      <div style="display: flex; flex-direction: column; gap: 9px; padding: 12px; border-radius: 10px; background: rgba(19, 20, 24, 0.85); border: 1px solid rgba(192, 132, 252, 0.32);">
        <div style="display: flex; gap: 6px;">
          <button
            type="button"
            @click=${() => pro.inspectSelectedForEdit()}
            style="flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(192, 132, 252, 0.5); background: rgba(168, 85, 247, 0.2); color: #e9d5ff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
          >
            Pick Selected Element
          </button>
          <button
            type="button"
            @click=${() => pro.exportFragBinary()}
            style="flex: 1; padding: 8px 10px; border-radius: 8px; border: none; background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
            title="Compile and download Fragment buffer (.frag)"
          >
            Export .FRAG Binary
          </button>
        </div>

        ${target
      ? BUI.html`
              <div style="padding: 8px 10px; border-radius: 8px; background: rgba(32, 33, 38, 0.7); border: 1px solid rgba(148, 163, 184, 0.2);">
                <div style="font-size: 0.76rem; font-weight: 700; color: #f8fafc;">${target.name}</div>
                <div style="font-size: 0.66rem; color: #7dd3fc;">${target.category} · LocalID #${target.localId}</div>
              </div>

              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                <span>Fire Rating / Specification</span>
                <input type="text" .value=${fireDraft} @input=${(e: Event) => { fireDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
              </label>
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                <span>Construction Stage / Phase</span>
                <input type="text" .value=${phaseDraft} @input=${(e: Event) => { phaseDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
              </label>
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                <span>Unit Cost Override (USD)</span>
                <input type="number" .value=${costDraft} @input=${(e: Event) => { costDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
              </label>
              <label style="display: flex; flex-direction: column; gap: 3px; font-size: 0.68rem; color: #94a3b8;">
                <span>Engineer Notes</span>
                <input type="text" .value=${notesDraft} @input=${(e: Event) => { notesDraft = (e.target as HTMLInputElement).value; }} style="padding: 6px 8px; border-radius: 6px; background: rgba(32, 33, 38,0.9); border: 1px solid rgba(148,163,184,0.3); color: #f8fafc; font-size: 0.72rem;" />
              </label>
              <button
                type="button"
                @click=${() => pro.saveSelectedEdits({ fireRating: fireDraft, phaseTag: phaseDraft, costUsd: costDraft, notes: notesDraft })}
                style="padding: 8px 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; font-size: 0.74rem; font-weight: 700; cursor: pointer;"
              >
                Save Element Override
              </button>
            `
      : BUI.html`
              <div style="padding: 18px; text-align: center; font-size: 0.72rem; color: #64748b;">
                Click any BIM element in the 3D scene, then click "Pick Selected Element" to edit parameters and sync to DataEnhancer / Firestore.
              </div>
            `}
      </div>
    </div>
  `;
};
