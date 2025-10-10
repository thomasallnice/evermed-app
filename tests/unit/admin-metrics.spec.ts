import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
if (process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

describe.runIf(hasDb)('Admin metrics API', () => {
  const prisma = new PrismaClient();

  it('returns metrics JSON shape and aggregates', async () => {
    const sessionA = 'session-hash-A';
    const sessionB = 'session-hash-B';
    await prisma.analyticsEvent.createMany({ data: [
      { eventType: 'feature_usage', eventName: 'first_upload_done', metadata: {}, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'page_view', eventName: 'explain_viewed', metadata: {}, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'feature_usage', eventName: 'explain_helpful', metadata: { value: 'yes' }, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'feature_usage', eventName: 'share_pack_created', metadata: {}, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'feature_usage', eventName: 'share_pack_recipient_feedback', metadata: { thumbs: 'up' }, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'feature_usage', eventName: 'profile_suggestion_shown', metadata: {}, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'feature_usage', eventName: 'profile_suggestion_accepted', metadata: {}, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'performance', eventName: 'latency_ms', metadata: { stage: 'explain', ms: 1234, latency_ms: 1234 }, sessionId: sessionA, createdAt: new Date() },
      { eventType: 'error', eventName: 'unsafe_report', metadata: { severity: 'P1' }, sessionId: sessionB, createdAt: new Date() },
      { eventType: 'feature_usage', eventName: 'answer_generated', metadata: { citations: false }, sessionId: sessionB, createdAt: new Date() },
    ]});

    await prisma.tokenUsage.createMany({ data: [
      { userId: 'test-user-A', feature: 'ask', model: 'gpt-5-mini', tokensIn: 100, tokensOut: 50, costUsd: 0.012, createdAt: new Date() },
      { userId: 'test-user-A', feature: 'explain', model: 'gpt-5-mini', tokensIn: 200, tokensOut: 80, costUsd: 0.024, createdAt: new Date() },
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

