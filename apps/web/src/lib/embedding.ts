import OpenAI from 'openai';

const MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedBatch(chunks: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[embedding] OPENAI_API_KEY not set; skipping embeddings');
    return chunks.map(() => []);
  }
  try {
    const res = await client.embeddings.create({
      model: MODEL,
      input: chunks,
    });
    return res.data.map((d) => d.embedding as number[]);
  } catch (err) {
    console.error('[embedding] error:', err);
    return chunks.map(() => []);
  }
}
