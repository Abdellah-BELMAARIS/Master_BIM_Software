import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { ComponentsGrid } from "./src";
import { viewportTemplate } from "../../containers";
import { itemsDataTemplate, modelsTemplate } from "../../sections";

export interface ComponentsGridState {
  components?: OBC.Components;
  viewport?: HTMLElement;
}

export const componentsGridTemplate: BUI.StatefullComponent<ComponentsGridState> = (
  state: ComponentsGridState
) => {
  const { components, viewport } = state;

  const onGridCreated = (element?: Element) => {
    if (!element || !components) return;
    const grid = element as ComponentsGrid;

    grid.elements = {
      viewport: {
        template: viewportTemplate,
        initialState: { viewport },
      },
      itemsData: {
        template: itemsDataTemplate,
        initialState: { components },
      },
      models: {
        template: modelsTemplate,
        initialState: { components },
      },
    };

    grid.layouts = {
      models: {
        template: `
          "models viewport itemsData" 1fr
          / 19rem 1fr 22rem
        `,
      },
    };

    grid.layout = "models";
  };

  return BUI.html`
    <bim-grid ${BUI.ref(onGridCreated)} style="width: 100%; height: 100%; display: block;"></bim-grid>
  `;
};

export * from "./src";

