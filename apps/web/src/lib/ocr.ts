import fetch from 'node-fetch';

export async function runOcr(buffer: Buffer, mimeType: string): Promise<{ text: string }> {
  const url = process.env.PDF_EXTRACT_URL;
  const bearer = process.env.PDF_EXTRACT_BEARER;
  const timeoutMs = Number(process.env.PDF_EXTRACT_TIMEOUT_MS || 20000);

  if (!url) {
    console.warn('[ocr] PDF_EXTRACT_URL not set, skipping OCR');
    return { text: '' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        Accept: 'application/json,text/plain',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: buffer,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as { text: string };
    }

    const text = await res.text();
    return { text };
  } catch (error) {
    console.error('[ocr] error:', error);
    return { text: '' };
  } finally {
    clearTimeout(timeout);
  }
}
