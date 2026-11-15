export const PROCUREMENT_SCOPE_RESPONSE: string;
export const UNSUPPORTED_LAW_REFERENCE_RESPONSE: string;
export function hasUnsupportedLawReference(query: string): boolean;

export interface ProcurementScopeDecision {
  allowed: boolean;
  reason: 'empty' | 'security' | 'off_topic' | 'procurement' | 'draft_continuation' | 'contextual_follow_up' | 'small_talk';
}

export function getProcurementScopeDecision(
  query: string,
  options?: { activePRDraft?: boolean; recentProcurementContext?: boolean }
): ProcurementScopeDecision;


export function buildProcurementSmallTalkResponse(query: string, userName?: string): string;
