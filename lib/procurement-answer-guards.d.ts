export interface ProcurementAnswerChunk {
  document_name?: string;
  document_type?: string;
  chunk_text?: string;
  metadata?: Record<string, unknown>;
}

export function buildVerifiedProcurementAnswer(
  query: string,
  chunks: ProcurementAnswerChunk[]
): string | null;

export function isSmallValueProcurementQuestion(query: string): boolean;
export function isHistoricalRa9184Question(query: string): boolean;
