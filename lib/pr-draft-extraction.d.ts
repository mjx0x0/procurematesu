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

export type PRItemAction =
  | { action: 'added'; items: ExtractedPRItem[]; added: ExtractedPRItem[] }
  | { action: 'updated'; items: ExtractedPRItem[]; index: number }
  | { action: 'duplicate'; items: ExtractedPRItem[]; reason: string }
  | { action: 'clarify' | 'unrecognized'; items: ExtractedPRItem[]; reason: string };

export function extractPRDetailsRuleBased(text: string): ExtractedPRDetails;
export function parsePRItems(text: string, options?: { purpose?: string; department?: string | null }): ExtractedPRItem[];
export function hasCompletePRDetails(extracted: ExtractedPRDetails | null | undefined): boolean;
export function isCompleteItem(item: ExtractedPRItem | null | undefined): boolean;
export function getMissingItemFields(items: ExtractedPRItem[]): Array<{ index: number; description: string; missing: string[] }>;
export function hasExplicitPricedItemDetails(text: string): boolean;
export function mergePRDetailsFromDepartmentReply(
  purpose: string | null | undefined,
  reply: string,
  existing?: ExtractedPRDetails | null
): ExtractedPRDetails;
export function applyPRItemMessage(
  existingItems: ExtractedPRItem[],
  message: string,
  options?: { purpose?: string; department?: string | null }
): PRItemAction;

export function isPlausibleDraftReply(step: string, message: string): boolean;
