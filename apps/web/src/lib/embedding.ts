const DEFAULT_MODEL = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';
const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('[embedding] OPENAI_API_KEY missing; skipping');
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  const payload = {
    input: trimmed,
    model: DEFAULT_MODEL,
  };

  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`[embedding] provider returned ${response.status}: ${body}`);
      return null;
    }

    const data = await response.json();
    const vector = data?.data?.[0]?.embedding;
    if (!Array.isArray(vector)) return null;
    return vector as number[];
  } catch (error: any) {
    console.warn('[embedding] request failed', error?.message || error);
    return null;
  }
}

export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const batches: (number[] | null)[] = [];
  for (const chunk of texts) {
    batches.push(await embedText(chunk));
  }
  return batches;
}
