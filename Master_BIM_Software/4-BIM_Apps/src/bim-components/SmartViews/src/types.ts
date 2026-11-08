import * as OBC from "@thatopen/components";

export interface SmartViewVisibility {
  exceptions?: {
    queries?: Set<string>;
    items?: OBC.ModelIdMap;
  };
}

export interface SmartViewColors {
  queries?: Map<string, Set<string>>;
  items?: Map<string, OBC.ModelIdMap>;
}

export interface SmartViewCameraState {
  position: [number, number, number];
  target: [number, number, number];
  isOrtho: boolean;
}

export interface SmartView {
  id: string;
  name: string;
  description?: string;
  defaultVisibility: boolean;
  visibility?: SmartViewVisibility;
  colors?: SmartViewColors;
  camera?: SmartViewCameraState;
  createdAt: number;
}
