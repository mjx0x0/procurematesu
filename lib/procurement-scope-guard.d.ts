export const PROCUREMENT_SCOPE_RESPONSE: string;

export interface ProcurementScopeDecision {
  allowed: boolean;
  reason: 'empty' | 'security' | 'off_topic' | 'procurement' | 'draft_continuation' | 'small_talk';
}

export function getProcurementScopeDecision(
  query: string,
  options?: { activePRDraft?: boolean }
): ProcurementScopeDecision;


export function buildProcurementSmallTalkResponse(query: string): string;
