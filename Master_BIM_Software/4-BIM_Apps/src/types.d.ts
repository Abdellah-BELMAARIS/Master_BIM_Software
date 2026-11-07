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
    }
  }
}
