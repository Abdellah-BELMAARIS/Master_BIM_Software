import * as FRAGS from "@thatopen/fragments";
import * as OBC from "@thatopen/components";

export interface DataEnhancerSource {
  name: string;
  description?: string;
  data: () => Promise<Record<string, any>[]>;
  matcher: (
    attributes: FRAGS.ItemData,
    data: Record<string, any>[]
  ) => Record<string, any>[];
}

export interface EnhancedDataRecord {
  modelId: string;
  expressId: number;
  guid?: string;
  category?: string;
  elementName?: string;
  propertyName: string;
  propertyValue: string;
  discipline?: string;
  author?: string;
  createdAt: number;
}

export type DataEnhancerResultMap = OBC.ModelIdDataMap<
  Record<string, Record<string, any>[]>
>;
