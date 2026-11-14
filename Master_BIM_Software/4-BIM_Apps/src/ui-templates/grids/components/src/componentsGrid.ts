import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { viewportTemplate } from "../../../containers";
import {
  itemsDataTemplate,
  modelsTemplate,
  queriesTemplate,
  dataSourcesTemplate,
  smartViewsSectionTemplate,
  gisTemplate,
} from "../../../sections";
import { ComponentsGrid, ComponentsGridLayout } from "./types";

export interface ComponentsGridConfig {
  components: OBC.Components;
  viewport: HTMLElement;
  projectId?: string;
}

/**
 * Module 4 — Lesson 3.14: Configured Multi-Layout BUI.Grid
 * Maps Viewer, Models, Queries, Properties, Enhance, and SmartViews layouts
 * with their corresponding icons for gridSidebarTemplate.
 */
export const createComponentsGridLayouts = (
  grid: ComponentsGrid,
  config: ComponentsGridConfig
) => {
  const { components, viewport, projectId } = config;

  grid.elements = {
    viewport: {
      template: viewportTemplate,
      initialState: { viewport },
    },
    models: {
      template: modelsTemplate,
      initialState: { components },
    },
    itemsData: {
      template: itemsDataTemplate,
      initialState: { components },
    },
    queries: {
      template: queriesTemplate,
      initialState: { components },
    },
    dataSources: {
      template: dataSourcesTemplate,
      initialState: { components, projectId },
    },
    smartViews: {
      template: smartViewsSectionTemplate,
      initialState: { components },
    },
    gis: {
      template: gisTemplate,
      initialState: { components },
    },
  };

  grid.layouts = {
    Viewer: {
      icon: "solar:eye-bold",
      template: `
        "viewport" 1fr
        / 1fr
      `,
    },
    Models: {
      icon: "tabler:folders",
      template: `
        "models viewport" 1fr
        / 22rem 1fr
      `,
    },
    Queries: {
      icon: "material-symbols:search",
      template: `
        "queries viewport" 1fr
        / 23rem 1fr
      `,
    },
    Properties: {
      icon: "solar:document-bold",
      template: `
        "viewport itemsData" 1fr
        / 1fr 24rem
      `,
    },
    Enhance: {
      icon: "solar:database-bold",
      template: `
        "viewport dataSources" 1fr
        / 1fr 24rem
      `,
    },
    SmartViews: {
      icon: "solar:layers-minimalistic-bold",
      template: `
        "smartViews viewport" 1fr
        / 23rem 1fr
      `,
    },
    GIS: {
      icon: "material-symbols:public",
      template: `
        "gis viewport" 1fr
        / 23rem 1fr
      `,
    },
  };

  grid.layout = "Viewer" satisfies ComponentsGridLayout[number];
  return grid;
};

export * from "./types";
