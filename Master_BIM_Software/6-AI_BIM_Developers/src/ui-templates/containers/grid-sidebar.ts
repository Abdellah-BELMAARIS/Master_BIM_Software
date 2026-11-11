import * as BUI from "@thatopen/ui";

export interface GridSidebarState {
  grid: BUI.Grid<any, any>;
}

/**
 * Module 4 — Lesson 3.14: Multi-Layout Grid Switcher Rail
 * Vertical BIM toolbar synchronized with BUI.Grid layouts & icons.
 */
export const gridSidebarTemplate: BUI.StatefullComponent<GridSidebarState> = (
  state: GridSidebarState,
  update
) => {
  const { grid } = state;

  const onLayoutChange = (layoutName: string) => {
    grid.layout = layoutName;
    update();
  };

  return BUI.html`
    <bim-toolbar vertical style="background: rgba(15, 23, 42, 0.96); border-right: 1px solid rgba(56, 189, 248, 0.22); height: 100%; padding: 6px 4px;">
      <bim-toolbar-section>
        ${Object.entries(grid.layouts).map(([name, layoutDef]) => {
          const isActive = grid.layout === name;
          return BUI.html`
            <bim-button
              @click=${() => onLayoutChange(name)}
              .active=${isActive}
              icon=${layoutDef.icon || "mdi:view-dashboard-outline"}
              tooltip=${`Switch to ${name} layout`}
              label=${name}
              style=${isActive ? "--bim-button-background: rgba(56, 189, 248, 0.25); color: #38bdf8;" : ""}
            ></bim-button>
          `;
        })}
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};

