import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

const embedTextMock = vi.fn(async () => [0.1, 0.2, 0.3]);
vi.mock('@/lib/embedding', () => ({ embedText: embedTextMock }));

const personId = 'person_rag';

beforeEach(async () => {
  await prisma.docChunk.deleteMany({});
  await prisma.document.deleteMany({ where: { personId } });
  await prisma.person.upsert({ where: { id: personId }, update: {}, create: { id: personId, ownerId: 'user-rag' } });
});

afterEach(() => {
  embedTextMock.mockClear();
});

describe.runIf(hasDb)('retrieveChunks semantic behaviour', () => {
  it('uses embeddings when available', async () => {
    const doc = await prisma.document.create({
      data: { personId, kind: 'pdf', filename: 'file.pdf', storagePath: 'documents/f.pdf', sha256: 'hash' },
    });
    await prisma.docChunk.createMany({
      data: [
        { documentId: doc.id, chunkId: 0, text: 'First chunk about labs', sourceAnchor: null },
        { documentId: doc.id, chunkId: 1, text: 'Second chunk about medication', sourceAnchor: null },
      ],
    });
    await prisma.$executeRawUnsafe(
      `UPDATE "DocChunk" SET embedding = '[0.2,0.1,0.0]'::vector WHERE "documentId" = $1 AND "chunkId" = $2`,
      doc.id,
      0,
    );

    const { retrieveChunks } = await import('../../apps/web/src/lib/rag');
    const results = await retrieveChunks(personId, 'labs', 2);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(embedTextMock).toHaveBeenCalled();
  });
});
