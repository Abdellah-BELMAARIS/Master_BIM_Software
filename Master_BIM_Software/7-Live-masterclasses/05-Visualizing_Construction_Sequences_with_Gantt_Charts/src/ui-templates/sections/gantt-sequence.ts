import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import "../../components/GanttChart";
import { GanttSequencer, GanttGroupingMode } from "../../bim-components/GanttSequencer";
import type { GanttTask } from "../../components/GanttChart";

export interface GanttSequenceSectionState {
  components: OBC.Components;
  showAddForm?: boolean;
  newTaskName?: string;
  newTaskStart?: string;
  newTaskEnd?: string;
  newTaskCategory?: string;
  newTaskColor?: string;
}

export const ganttSequenceTemplate: BUI.StatefullComponent<GanttSequenceSectionState> = (
  state: GanttSequenceSectionState,
  update,
) => {
  const { components } = state;
  const sequencer = components.get(GanttSequencer);

  const today = new Date().toISOString().slice(0, 10);
  const twoWeeks = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  let draftName = state.newTaskName ?? "";
  let draftStart = state.newTaskStart ?? today;
  let draftEnd = state.newTaskEnd ?? twoWeeks;
  let draftCategory = state.newTaskCategory ?? "IFCWALL|IFCSLAB";
  let draftColor = state.newTaskColor ?? "#38bdf8";

  const onCsvSelected = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    await sequencer.importCsvText(text);
    input.value = "";
  };

  return BUI.html`
    <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%; padding: 10px 14px; box-sizing: border-box;">
      <!-- Controls Toolbar -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
          <div style="display: inline-flex; border-radius: 7px; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.25);">
            <button
              type="button"
              @click=${() => sequencer.generateSequence("storeys")}
              style="padding: 5px 10px; border: none; font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${sequencer.groupingMode === "storeys" ? "rgba(56, 189, 248, 0.25)" : "rgba(32, 33, 38, 0.8)"}; color: ${sequencer.groupingMode === "storeys" ? "#7dd3fc" : "#94a3b8"};"
            >
              By Storeys
            </button>
            <button
              type="button"
              @click=${() => sequencer.generateSequence("disciplines")}
              style="padding: 5px 10px; border: none; border-left: 1px solid rgba(148,163,184,0.2); font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${sequencer.groupingMode === "disciplines" ? "rgba(56, 189, 248, 0.25)" : "rgba(32, 33, 38, 0.8)"}; color: ${sequencer.groupingMode === "disciplines" ? "#7dd3fc" : "#94a3b8"};"
            >
              By Disciplines
            </button>
            <button
              type="button"
              @click=${() => sequencer.generateSequence("rebar")}
              style="padding: 5px 10px; border: none; border-left: 1px solid rgba(148,163,184,0.2); font-size: 0.71rem; font-weight: 700; cursor: pointer; background: ${sequencer.groupingMode === "rebar" ? "rgba(225, 29, 72, 0.28)" : "rgba(32, 33, 38, 0.8)"}; color: ${sequencer.groupingMode === "rebar" ? "#fda4af" : "#94a3b8"};"
            >
              Structure &amp; Ferraillage
            </button>
          </div>

          <button
            type="button"
            @click=${() => sequencer.generateSequence(sequencer.groupingMode as GanttGroupingMode)}
            style="padding: 5px 11px; border-radius: 7px; border: 1px solid rgba(56, 189, 248, 0.5); background: rgba(56, 189, 248, 0.18); color: #7dd3fc; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
          >
            ${sequencer.isBusy ? "Scanning..." : "Auto-Generate"}
          </button>

          <button
            type="button"
            @click=${() => (sequencer.isPlaying ? sequencer.pause() : sequencer.play())}
            style="padding: 5px 12px; border-radius: 7px; border: none; background: ${sequencer.isPlaying ? "#f59e0b" : "linear-gradient(135deg, #059669, #10b981)"}; color: #ffffff; font-size: 0.72rem; font-weight: 700; cursor: pointer;"
          >
            ${sequencer.isPlaying ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            @click=${() => sequencer.reset()}
            style="padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(148, 163, 184, 0.28); background: rgba(32, 33, 38, 0.85); color: #e2e8f0; font-size: 0.71rem; font-weight: 600; cursor: pointer;"
          >
            Reset
          </button>

          <select
            .value=${String(sequencer.speedMultiplier)}
            @change=${(e: Event) => sequencer.setSpeed(Number((e.target as HTMLSelectElement).value))}
            style="padding: 5px 7px; border-radius: 7px; border: 1px solid rgba(148, 163, 184, 0.28); background: rgba(32, 33, 38, 0.9); color: #e2e8f0; font-size: 0.71rem; font-weight: 600;"
            title="Playback speed"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>
        </div>

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
          <button
            type="button"
            @click=${() => sequencer.toggleGhostMode()}
            style="padding: 5px 10px; border-radius: 7px; border: 1px solid ${sequencer.isGhostActive ? "#a855f7" : "rgba(148, 163, 184, 0.28)"}; background: ${sequencer.isGhostActive ? "rgba(168, 85, 247, 0.25)" : "rgba(32, 33, 38, 0.85)"}; color: ${sequencer.isGhostActive ? "#e9d5ff" : "#cbd5e1"}; font-size: 0.71rem; font-weight: 700; cursor: pointer;"
          >
            ${sequencer.isGhostActive ? "Ghost: ON" : "Ghost: OFF"}
          </button>

          <button
            type="button"
            @click=${() => update({ showAddForm: !state.showAddForm })}
            style="padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(148, 163, 184, 0.28); background: rgba(32, 33, 38, 0.85); color: #e2e8f0; font-size: 0.71rem; font-weight: 600; cursor: pointer;"
          >
            ${state.showAddForm ? "Close Form" : "+ Task"}
          </button>

          <label
            style="padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(148, 163, 184, 0.28); background: rgba(32, 33, 38, 0.85); color: #e2e8f0; font-size: 0.71rem; font-weight: 600; cursor: pointer;"
          >
            Import CSV
            <input type="file" accept=".csv" style="display: none;" @change=${onCsvSelected} />
          </label>

          <button
            type="button"
            @click=${() => sequencer.exportCsv()}
            style="padding: 5px 10px; border-radius: 7px; border: 1px solid rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.14); color: #34d399; font-size: 0.71rem; font-weight: 700; cursor: pointer;"
          >
            Export CSV
          </button>
        </div>
      </div>

      ${state.showAddForm
        ? BUI.html`
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 8px; background: rgba(19, 20, 24, 0.9); border: 1px solid rgba(56, 189, 248, 0.3);">
              <input
                type="text"
                placeholder="Task name (e.g. Level 1 Columns)"
                .value=${draftName}
                @input=${(e: Event) => { draftName = (e.target as HTMLInputElement).value; }}
                style="flex: 1.4; min-width: 140px; padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.3); background: rgba(32,33,38,0.9); color: #f8fafc; font-size: 0.71rem;"
              />
              <input
                type="date"
                .value=${draftStart}
                @input=${(e: Event) => { draftStart = (e.target as HTMLInputElement).value; }}
                style="padding: 5px 7px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.3); background: rgba(32,33,38,0.9); color: #f8fafc; font-size: 0.71rem;"
              />
              <input
                type="date"
                .value=${draftEnd}
                @input=${(e: Event) => { draftEnd = (e.target as HTMLInputElement).value; }}
                style="padding: 5px 7px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.3); background: rgba(32,33,38,0.9); color: #f8fafc; font-size: 0.71rem;"
              />
              <input
                type="text"
                placeholder="IFC Regex (IFCCOLUMN|IFCBEAM)"
                .value=${draftCategory}
                @input=${(e: Event) => { draftCategory = (e.target as HTMLInputElement).value; }}
                style="flex: 1; min-width: 130px; padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.3); background: rgba(32,33,38,0.9); color: #f8fafc; font-size: 0.71rem;"
              />
              <input
                type="color"
                .value=${draftColor}
                @input=${(e: Event) => { draftColor = (e.target as HTMLInputElement).value; }}
                style="width: 30px; height: 26px; border: none; border-radius: 4px; background: transparent; cursor: pointer;"
              />
              <button
                type="button"
                @click=${async () => {
                  await sequencer.addCustomTask({
                    name: draftName,
                    startDate: draftStart,
                    endDate: draftEnd,
                    categoryRegex: draftCategory,
                    color: draftColor,
                  });
                  update({ showAddForm: false, newTaskName: "" });
                }}
                style="padding: 5px 12px; border-radius: 6px; border: none; background: #0284c7; color: #fff; font-size: 0.71rem; font-weight: 700; cursor: pointer;"
              >
                Add
              </button>
            </div>
          `
        : ""}

      <!-- Interactive SVG Gantt Chart -->
      <div style="flex: 1; min-height: 150px; border-radius: 9px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(11, 15, 23, 0.88); overflow: hidden;">
        <bim-gantt-chart
          .tasks=${sequencer.tasks}
          .playheadRatio=${sequencer.playheadRatio}
          .activeTaskId=${sequencer.activeTaskId}
          @playheadchange=${(e: CustomEvent<{ date: Date; ratio: number }>) => {
            void sequencer.setPlayheadDate(e.detail.date, e.detail.ratio);
          }}
          @taskclick=${(e: CustomEvent<{ task: GanttTask }>) => {
            void sequencer.focusTask(e.detail.task);
          }}
        ></bim-gantt-chart>
      </div>

      <!-- Status Strip -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 8px; border-radius: 6px; background: rgba(32, 33, 38, 0.65); font-size: 0.69rem; color: #cbd5e1;">
        <span>${sequencer.statusMessage}</span>
        <span style="color: #94a3b8; font-weight: 600;">${Math.round(sequencer.playheadRatio * 100)}%</span>
      </div>
    </div>
  `;
};
