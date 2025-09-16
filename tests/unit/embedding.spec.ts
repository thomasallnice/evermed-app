import { describe, it, expect, vi, afterEach } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('embedText', () => {
  it('returns embedding when OpenAI responds', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const mockResponse = new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2] }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { embedText } = await import('../../apps/web/src/lib/embedding');
    const vector = await embedText('hello world');
    expect(vector).toEqual([0.1, 0.2]);
  });

  it('returns null when API key missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const { embedText } = await import('../../apps/web/src/lib/embedding');
    const vector = await embedText('hello world');
    expect(vector).toBeNull();
  });
});
