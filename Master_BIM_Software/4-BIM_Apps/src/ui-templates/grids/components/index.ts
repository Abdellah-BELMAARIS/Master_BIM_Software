import * as BUI from "@thatopen/ui";
import { ComponentsGrid } from "./src";
import { viewportTemplate } from "../../containers";

export interface ComponentsGridState {
  viewport?: HTMLElement;
}

export const componentsGridTemplate: BUI.StatefullComponent<ComponentsGridState> = (
  state: ComponentsGridState
) => {
  const { viewport } = state;

  const onGridCreated = (element?: Element) => {
    if (!element) return;
    const grid = element as ComponentsGrid;

    grid.elements = {
      viewport: {
        template: viewportTemplate,
        initialState: { viewport },
      },
    };

    grid.layouts = {
      models: {
        template: `
          "viewport" 1fr
          / 1fr
        `,
      },
    };

    grid.layout = "models";
  };

  return BUI.html`
    <bim-grid ${BUI.ref(onGridCreated)}></bim-grid>
  `;
};

export * from "./src";

