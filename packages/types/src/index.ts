export type PersonId = string;
export type DocumentId = string;

export interface ExplainPayload {
  title: string; // e.g., "CBC from Mar 5, 2025"
  keyFindings: { text: string }[]; // <= 3
  questions: string[]; // 2–3
  watch: string[];
  sources: { documentId: DocumentId; anchor?: string }[];
  disclaimer: string;
  meta?: { latencyMs?: number };
}

