import * as BUI from "@thatopen/ui";

export interface ViewportContainerState {
  viewport?: HTMLElement;
}

export const viewportTemplate: BUI.StatefullComponent<ViewportContainerState> = (
  state: ViewportContainerState
) => {
  const { viewport } = state;
  let content: HTMLElement;

  if (viewport) {
    content = viewport;
  } else {
    const [missingLabel] = BUI.Component.create(() => BUI.html`
      <bim-label style="align-self: center; justify-self: center; font-size: 1.1rem; color: var(--text-secondary);">
        No viewport has been defined
      </bim-label>
    `);
    content = missingLabel;
  }

  return BUI.html`
    <div class="viewport-container" style="display: grid; width: 100%; height: 100%; place-items: center;">
      ${content}
    </div>
  `;
};

