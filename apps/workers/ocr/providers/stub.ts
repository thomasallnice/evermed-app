export type OcrLine = { text: string; anchor: string };
export type OcrPage = { page: number; lines: OcrLine[] };
export type OcrResult = { pages: OcrPage[] };

export interface OcrProvider {
  extract(storagePath: string): Promise<OcrResult>;
}

// Default stub provider: synthesizes text and anchors for testing.
export class StubOcrProvider implements OcrProvider {
  async extract(storagePath: string): Promise<OcrResult> {
    const base = storagePath.toLowerCase();
    if (base.includes('sample_cbc')) {
      return {
        pages: [
          { page: 1, lines: [
            { text: 'Complete Blood Count (CBC)', anchor: 'p1.l1' },
            { text: 'Hemoglobin 12.9 g/dL', anchor: 'p1.l2' },
            { text: 'WBC 6.2 K/uL', anchor: 'p1.l3' },
          ]},
        ],
      };
    }
    // Generic fallback
    return {
      pages: [
        { page: 1, lines: [
          { text: 'Document uploaded.', anchor: 'p1.l1' },
          { text: 'OCR not configured (stub).', anchor: 'p1.l2' },
        ]},
      ],
    };
  }
}

