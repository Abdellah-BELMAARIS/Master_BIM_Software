export interface EnhancedDataRecord {
  modelId: string;
  expressId: number;
  propertyName: string;
  propertyValue: string;
  category?: string;
  author?: string;
  createdAt: number;
}

export interface DataEnhancerSource {
  id: string;
  name: string;
  type: "firestore" | "memory" | "rest";
  endpoint?: string;
}

