import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import "../../components/GanttChart";
import { type GanttTask } from "../../components/GanttChart";

export interface GanttPanelState {
  components: OBC.Components;
  tasks: GanttTask[];
}

// Elements that can be spatially contained in a building storey
const STRUCTURAL_CATEGORIES = [
  /WALL/,
  /SLAB/,
  /COLUMN/,
  /BEAM/,
  /STAIR/,
  /DOOR/,
  /WINDOW/,
  /RAILING/,
  /COVERING/,
  /PLATE/,
  /MEMBER/,
];

const levelQuery = (levelName: string): GanttTask["query"] => [
  {
    categories: STRUCTURAL_CATEGORIES,
    relation: {
      name: "ContainedInStructure",
      query: {
        categories: [/BUILDINGSTOREY/],
        attributes: { queries: [{ name: /Name/, value: new RegExp(levelName) }] },
      },
    },
  },
];

const LEVEL_COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f39c12",
  "#2ecc71",
  "#1abc9c",
  "#3498db",
  "#5b6abf",
  "#9b59b6",
  "#c0392b",
];

export const demoTasks: GanttTask[] = Array.from({ length: 9 }, (_, i) => {
  const level = i + 1;
  const startMonth = i;        // Jan, Feb, Mar … Sep
  const endMonth = i + 1;      // Feb, Mar, Apr … Oct
  return {
    id: `nivel-${level}`,
    name: `Nivel ${level}`,
    color: LEVEL_COLORS[i],
    startDate: new Date(2025, startMonth, 1),
    endDate: new Date(2025, endMonth, 15),
    query: levelQuery(`Nivel ${level}`),
  };
});

export const ganttPanelTemplate: BUI.StatefullComponent<GanttPanelState> = (
  state,
) => {
  const { tasks } = state;

  return BUI.html`
    <bim-panel-section
      fixed
      label="Construction Sequence"
      icon="mdi:chart-gantt"
      style="height: 100%; overflow: hidden;"
    >
      <bim-gantt-chart
        style="height: 100%;"
        .tasks=${tasks}
      ></bim-gantt-chart>
    </bim-panel-section>
  `;
};
