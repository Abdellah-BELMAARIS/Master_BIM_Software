import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { SmartViews } from "../../../bim-components/SmartViews";
import { SmartViewsTableData } from "./types";

export const setDefaults = (
  components: OBC.Components,
  table: BUI.Table<SmartViewsTableData>,
  onRefresh?: () => void
) => {
  table.headersHidden = true;
  table.noIndentation = true;
  table.hiddenColumns = ["ViewId"];
  table.columns = [
    { name: "Name", width: "minmax(0, 1fr)" },
    { name: "Summary", width: "auto" },
    { name: "Actions", width: "auto" },
  ];

  table.dataTransform = {
    Name: (value, rowData) => {
      const viewId = String(rowData.ViewId || "");
      const smartViews = components.get(SmartViews);
      const view = smartViews.list.get(viewId);
      const hasCam = Boolean(view?.camera);
      return BUI.html`
        <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 2px 0;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <bim-icon
              icon=${hasCam ? "solar:camera-bold" : "solar:layers-minimalistic-bold"}
              style="color: #38bdf8; flex-shrink: 0;"
            ></bim-icon>
            <bim-label style="font-size: 0.82rem; font-weight: 600; color: #f8fafc; overflow: hidden; text-overflow: ellipsis;">
              ${String(value || "")}
            </bim-label>
          </div>
          ${view?.description
            ? BUI.html`<span style="font-size: 0.7rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${view.description}</span>`
            : BUI.html``}
        </div>
      `;
    },
    Summary: (value) => {
      return BUI.html`
        <span style="font-size: 0.7rem; color: #38bdf8; background: rgba(56, 189, 248, 0.14); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 2px 6px; white-space: nowrap;">
          ${String(value || "")}
        </span>
      `;
    },
    Actions: (_value, rowData) => {
      const viewId = String(rowData.ViewId || "");
      const smartViews = components.get(SmartViews);

      const onApply = async (e: Event) => {
        const btn = e.currentTarget as BUI.Button;
        if (btn) btn.loading = true;
        try {
          await smartViews.apply(viewId);
        } finally {
          if (btn) btn.loading = false;
        }
      };

      const onUpdateCamera = () => {
        const view = smartViews.list.get(viewId);
        if (!view) return;
        const camState = smartViews.captureCameraState();
        if (camState) {
          view.camera = camState;
          onRefresh?.();
        }
      };

      const onUpdateView = () => {
        const updated = smartViews.updateViewWithCurrentState(viewId);
        if (updated) {
          onRefresh?.();
        }
      };

      const onDelete = () => {
        smartViews.delete(viewId);
      };

      return BUI.html`
        <div style="display: flex; align-items: center; gap: 3px;">
          <bim-button
            @click=${onApply}
            icon="flowbite:play-outline"
            tooltip-title="Apply Viewpoint"
          ></bim-button>
          <bim-button
            @click=${onUpdateView}
            icon="solar:refresh-circle-bold"
            tooltip-title="Update Viewpoint (Sync Current Camera, Visibility & Overrides)"
          ></bim-button>
          <bim-button
            @click=${onUpdateCamera}
            icon="solar:camera-bold"
            tooltip-title="Save Current Camera Viewpoint Pose"
          ></bim-button>
          <bim-button
            @click=${onDelete}
            icon="flowbite:trash-bin-outline"
            tooltip-title="Remove Coordination Viewpoint"
          ></bim-button>
        </div>
      `;
    },
  };
};

