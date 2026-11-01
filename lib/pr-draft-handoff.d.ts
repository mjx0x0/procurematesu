export interface PRDraftHandoffItem {
  item_description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

export interface PRDraftHandoffPayload {
  version: 1;
  department: string;
  purpose: string;
  items: PRDraftHandoffItem[];
  total_amount: number;
}

export const PR_DRAFT_HANDOFF_VERSION: 1;
export function createPRDraftHandoffPayload(input: unknown): PRDraftHandoffPayload;
export function encodePRDraftHandoff(input: unknown): string;
export function decodePRDraftHandoff(token: string): PRDraftHandoffPayload;
export function readPRDraftHandoff(searchParams: URLSearchParams): PRDraftHandoffPayload | null;
