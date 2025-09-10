import { describe, it, expect } from 'vitest';

describe('skeleton', () => {
  it('runs unit tests in CI', () => {
    const example = {
      title: 'CBC from Jan 1, 2025',
      keyFindings: [{ text: 'Hemoglobin slightly low' }],
      questions: ['Recheck in 3 months?'],
      watch: ['Fatigue, pallor'],
      sources: [{ documentId: 'doc_123', anchor: 'p1.l3' }],
      disclaimer: 'Example only',
      meta: { latencyMs: 1234 },
    };
    expect(example.title).toContain('CBC');
  });
});
