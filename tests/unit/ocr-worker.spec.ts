import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { processOcr } from '../../apps/workers/ocr';

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

describe.runIf(hasDb)('OCR worker stub', () => {
  const prisma = new PrismaClient();
  let personId = '';
  let documentId = '';

  beforeAll(async () => {
    const p = await prisma.person.create({ data: { ownerId: 'userA' } });
    personId = p.id;
    const d = await prisma.document.create({ data: {
      personId,
      kind: 'pdf',
      filename: 'sample_cbc.pdf',
      storagePath: 'documents/sample_cbc.pdf',
      sha256: 'seeded',
    }});
    documentId = d.id;
  });

  it('persists chunks with anchors', async () => {
    await processOcr(documentId, 'documents/sample_cbc.pdf');
    const chunks = await prisma.docChunk.findMany({ where: { documentId }, orderBy: { chunkId: 'asc' } });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].sourceAnchor).toBeDefined();
  });
});

