export interface ExtractedPRItem {
  item_description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

export interface ExtractedPRDetails {
  department: string | null;
  purpose: string | null;
  items: ExtractedPRItem[];
  total_amount: number;
}

export function extractPRDetailsRuleBased(text: string): ExtractedPRDetails;

export function hasCompletePRDetails(extracted: ExtractedPRDetails | null | undefined): boolean;

export function hasExplicitPricedItemDetails(value: string): boolean;

export function mergePRDetailsFromDepartmentReply(
  purpose: string | null | undefined,
  reply: string,
  existing?: ExtractedPRDetails | null
): ExtractedPRDetails;
