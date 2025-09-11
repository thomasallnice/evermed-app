import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

describe.runIf(hasDb)('Admin metrics API', () => {
  const prisma = new PrismaClient();

  it('returns metrics JSON shape and aggregates', async () => {
    const uidA = 'userA';
    const uidB = 'userB';
    await prisma.analyticsEvent.createMany({ data: [
      { userId: uidA, name: 'first_upload_done', meta: {}, createdAt: new Date() },
      { userId: uidA, name: 'explain_viewed', meta: {}, createdAt: new Date() },
      { userId: uidA, name: 'explain_helpful', meta: { value: 'yes' }, createdAt: new Date() },
      { userId: uidA, name: 'share_pack_created', meta: {}, createdAt: new Date() },
      { userId: uidA, name: 'share_pack_recipient_feedback', meta: { thumbs: 'up' }, createdAt: new Date() },
      { userId: uidA, name: 'profile_suggestion_shown', meta: {}, createdAt: new Date() },
      { userId: uidA, name: 'profile_suggestion_accepted', meta: {}, createdAt: new Date() },
      { userId: uidA, name: 'latency_ms', meta: { stage: 'explain', ms: 1234 }, createdAt: new Date() },
      { userId: uidB, name: 'unsafe_report', meta: { severity: 'P1' }, createdAt: new Date() },
      { userId: uidB, name: 'answer_generated', meta: { citations: false }, createdAt: new Date() },
    ]});

    await prisma.tokenUsage.createMany({ data: [
      { userId: uidA, feature: 'ask', model: 'gpt-5-mini', tokensIn: 100, tokensOut: 50, costUsd: 0.012, createdAt: new Date() },
      { userId: uidA, feature: 'explain', model: 'gpt-5-mini', tokensIn: 200, tokensOut: 80, costUsd: 0.024, createdAt: new Date() },
    ]});

    const { GET } = await import('../../apps/web/src/app/api/admin/metrics/route');
    const res = await GET(new Request('http://localhost/api/admin/metrics', { headers: { 'x-admin': '1' } }) as any);
    const j = await (res as Response).json();
    expect(j.last7).toBeTruthy();
    expect(typeof j.last7.activation).toBe('number');
    expect(j.last7.preparation).toBeTruthy();
    expect(Array.isArray(j.last30.tokens)).toBe(true);

    const { GET: GET_TOK } = await import('../../apps/web/src/app/api/admin/usage/tokens/route');
    const res2 = await GET_TOK(new Request('http://localhost/api/admin/usage/tokens?days=7', { headers: { 'x-admin': '1' } }) as any);
    const j2 = await (res2 as Response).json();
    expect(Array.isArray(j2.byFeatureModel)).toBe(true);
  });
});

