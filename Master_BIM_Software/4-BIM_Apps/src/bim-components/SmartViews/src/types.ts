import * as OBC from "@thatopen/components";

export interface SmartView {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  isOrtho: boolean;
  hidden?: OBC.ModelIdMap;
  styles?: Record<string, OBC.ModelIdMap>;
  createdAt: number;
}

