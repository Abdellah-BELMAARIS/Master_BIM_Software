import * as React from "react";

type BimIntrinsicElements = {
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
    tooltip?: string;
    onclick?: (e: any) => void;
  };
  "bim-context-menu": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  "bim-panel-section": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    label?: string;
    icon?: string;
    fixed?: boolean;
    collapsed?: boolean;
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
};

declare global {
  namespace JSX {
    interface IntrinsicElements extends BimIntrinsicElements {}
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends BimIntrinsicElements {}
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends BimIntrinsicElements {}
  }
}
