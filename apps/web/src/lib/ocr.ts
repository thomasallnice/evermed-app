const DEFAULT_TIMEOUT = Number(process.env.PDF_EXTRACT_TIMEOUT_MS || 20000);
const DEFAULT_MAX_BYTES = Number(process.env.PDF_MAX_BYTES || 25_000_000);

export async function runOcr(buffer: Buffer, mimeType: string): Promise<{ text: string } | null> {
  const url = process.env.PDF_EXTRACT_URL;
  if (!url) {
    console.warn('[ocr] extractor URL not configured; skipping');
    return null;
  }

  if (DEFAULT_MAX_BYTES && buffer.length > DEFAULT_MAX_BYTES) {
    console.warn('[ocr] input exceeds PDF_MAX_BYTES; skipping OCR');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  const array = buffer instanceof Buffer ? Uint8Array.from(buffer) : new Uint8Array(buffer);
  const payload = array.buffer;

  try {
    const headers: Record<string, string> = { 'Content-Type': mimeType };
    if (process.env.PDF_EXTRACT_BEARER) {
      headers.Authorization = `Bearer ${process.env.PDF_EXTRACT_BEARER}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`[ocr] extractor returned ${response.status}: ${body}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    let text = '';
    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => ({}));
      text = typeof payload?.text === 'string' ? payload.text : '';
    } else {
      text = await response.text();
    }

    text = text.trim();
    if (!text) return null;
    return { text };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.warn('[ocr] extractor request timed out');
    } else {
      console.warn('[ocr] extractor request failed', error?.message || error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
