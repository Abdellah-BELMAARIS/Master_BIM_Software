import * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "bim-label": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        icon?: string;
        img?: string;
        vertical?: boolean;
        "label-hidden"?: boolean;
        "icon-hidden"?: boolean;
      };
      "bim-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string;
        icon?: string;
        active?: boolean;
        disabled?: boolean;
        "label-hidden"?: boolean;
        "icon-hidden"?: boolean;
        onclick?: (e: any) => void;
      };
      "bim-text-input": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        value?: string;
        debounce?: number;
        disabled?: boolean;
        vertical?: boolean;
        oninput?: (e: any) => void;
      };
      "bim-grid": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        floating?: boolean;
        layout?: string;
        ref?: any;
      };
    }
  }
}
