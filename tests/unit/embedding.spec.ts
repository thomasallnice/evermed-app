import { describe, it, expect, vi } from 'vitest';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn(async ({ input }) => ({ data: input.map(() => ({ embedding: [0.1, 0.2] })) })),
    },
  })),
}));

describe('embedBatch', () => {
  it('returns embeddings when API key present', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const { embedBatch } = await import('../../apps/web/src/lib/embedding');
    const vectors = await embedBatch(['hello']);
    expect(vectors[0]).toEqual([0.1, 0.2]);
  });

  it('returns empty vectors when API key missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { embedBatch } = await import('../../apps/web/src/lib/embedding');
    const vectors = await embedBatch(['hello']);
    expect(vectors[0]).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
