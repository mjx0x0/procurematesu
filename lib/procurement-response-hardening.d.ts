export interface ProcurementHardeningChunk {
  document_name: string;
  chunk_text: string;
  metadata?: Record<string, unknown>;
}

export function buildHighRiskProcurementResponse(
  query: string,
  chunks: ProcurementHardeningChunk[],
  conversationContext?: string
): string | null;

export function isHighRiskProcurementQuestion(
  query: string,
  conversationContext?: string
): boolean;
