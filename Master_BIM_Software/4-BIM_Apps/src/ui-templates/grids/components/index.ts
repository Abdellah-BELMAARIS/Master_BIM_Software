import * as BUI from "@thatopen/ui";
import { ComponentsGrid } from "./src";
import { viewportTemplate } from "../../containers";

export const componentsGridTemplate = (_state: any) => {
  const onGridCreated = (element?: Element) => {
    if (!element) return;
    const grid = element as ComponentsGrid;

    grid.elements = {
      viewport: {
        template: viewportTemplate,
        initialState: {},
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

