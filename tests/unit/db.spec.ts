import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { canAccessPerson, canAccessDocument } from '../../db/rls-sim';

const resolvedDbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL; // for Prisma runtime
}
const hasDb = !!resolvedDbUrl;

describe('RLS simulation', () => {
  it('owner can access their person', () => {
    expect(canAccessPerson('userA', 'userA')).toBe(true);
  });
  it('other users cannot access', () => {
    expect(canAccessPerson('userA', 'userB')).toBe(false);
  });
  it('document access mirrors person ownership', () => {
    expect(canAccessDocument('userA', 'userA')).toBe(true);
    expect(canAccessDocument('userA', 'userB')).toBe(false);
  });
});

describe.runIf(hasDb)('DB shape and pgvector', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  it('DocChunk.embedding column exists as vector and allows NULL', async () => {
    type InfoSchemaTable = { table_name: string };
    // ensure the table exists
    const tables = await prisma.$queryRaw<InfoSchemaTable[]>`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'DocChunk'
    `;
    expect(tables.find((t: InfoSchemaTable) => t.table_name === 'DocChunk')).toBeTruthy();

    // check the column type
    const cols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; udt_name: string }>>`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'DocChunk' AND column_name = 'embedding'
    `;
    expect(cols.length).toBe(1);
    expect(cols[0].udt_name).toBe('vector');

    // insert a row with NULL embedding
    // Need one Document to satisfy FK; create minimal Person+Document
    const person = await prisma.person.create({ data: { ownerId: 'test-user' } });
    const doc = await prisma.document.create({
      data: {
        personId: person.id,
        kind: 'pdf',
        filename: 'test.pdf',
        storagePath: 'documents/test.pdf',
        sha256: 'deadbeef',
      },
    });
    const chunk = await prisma.docChunk.create({
      data: { documentId: doc.id, chunkId: 1, text: 'hello world' },
    });
    expect(chunk.documentId).toBe(doc.id);
  });
});
