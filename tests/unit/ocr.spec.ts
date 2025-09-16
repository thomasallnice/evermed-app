import { describe, it, expect, vi, afterEach } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('runOcr', () => {
  it('returns text when extractor succeeds', async () => {
    process.env.PDF_EXTRACT_URL = 'https://extractor.example.com/extract';
    process.env.PDF_EXTRACT_TIMEOUT_MS = '1000';
    const response = new Response(JSON.stringify({ text: 'Hello OCR' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const { runOcr } = await import('../../apps/web/src/lib/ocr');
    const result = await runOcr(Buffer.from('data'), 'application/pdf');
    expect(result).toEqual({ text: 'Hello OCR' });
  });

  it('returns null and logs when extractor fails', async () => {
    process.env.PDF_EXTRACT_URL = 'https://extractor.example.com/extract';
    const response = new Response('oops', { status: 500 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { runOcr } = await import('../../apps/web/src/lib/ocr');
    const result = await runOcr(Buffer.from('data'), 'application/pdf');
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('skips when extractor URL missing', async () => {
    delete process.env.PDF_EXTRACT_URL;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { runOcr } = await import('../../apps/web/src/lib/ocr');
    const result = await runOcr(Buffer.from('data'), 'application/pdf');
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[ocr] extractor URL not configured; skipping');
  });
});
