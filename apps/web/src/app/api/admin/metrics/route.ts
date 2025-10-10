import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

// Use Prisma-generated types directly instead of hardcoded types
// This ensures compatibility with the actual database schema
type AnalyticsEvent = Prisma.AnalyticsEventGetPayload<{}>;
type TokenUsage = Prisma.TokenUsageGetPayload<{}>;

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin') === '1'; // TODO: replace with Supabase role check
}

function pct(numer: number, denom: number) {
  return denom > 0 ? Math.round((numer / denom) * 1000) / 10 : 0; // 1 decimal place
}

function p95(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function within24h(a: Date, b: Date) {
  return Math.abs(+a - +b) <= 24 * 3600 * 1000;
}

type Tiles = {
  activation: number;
  clarity: number;
  preparation: { wauWithSharePct: number; recipientThumbsUpPct: number };
  retention: number;
  trust: number;
  safety: { p0: number; p1: number; noCitationPct: number };
  latencyP95Ms: number;
  usage: { dau: number; wau: number; mau: number; uploadsPerUser: number; avgPagesPerDoc: number | null };
  tokens: { feature: string; model: string; tokensIn: number; tokensOut: number; costUsd: number }[];
};

async function computeTiles(days: number): Promise<Tiles> {
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 3600 * 1000);
  const ev: AnalyticsEvent[] = await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since } } });

  // Group events by sessionId (privacy-preserving aggregation)
  const bySession = new Map<string, AnalyticsEvent[]>();
  for (const e of ev) {
    const sid = String(e.sessionId || '');
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid)!.push(e);
  }

  // Activation: % sessions with first_upload_done and explain_viewed within 24h
  let activated = 0;
  let newSessions = 0;
  for (const [sid, list] of bySession.entries()) {
    const ups = list.filter((x) => x.eventName === 'first_upload_done');
    if (ups.length) newSessions++;
    const expl = list.filter((x) => x.eventName === 'explain_viewed');
    if (ups.length && expl.length) {
      const ok = ups.some((u) => expl.some((x) => within24h(u.createdAt, x.createdAt)));
      if (ok) activated++;
    }
  }
  const activation = pct(activated, Math.max(1, newSessions));

  // Clarity: % "Explain helpful = Yes"
  const helpful = ev.filter((x) => x.eventName === 'explain_helpful');
  const helpfulYes = helpful.filter((x) => {
    const m = (x.metadata ?? {}) as any;
    const v = String(m?.value ?? m?.thumbs ?? '').toLowerCase();
    return v === 'yes' || v === 'up';
  }).length;
  const clarity = pct(helpfulYes, helpful.length || 0);

  // Preparation: % WAU sessions creating ≥1 pack; recipient thumbs-up %
  const wauSessions = new Set(ev.map((x) => String(x.sessionId || '')));
  const shareCreatedSessions = new Set(ev.filter((x) => x.eventName === 'share_pack_created').map((x) => String(x.sessionId || '')));
  const prepPct = pct(shareCreatedSessions.size, Math.max(1, wauSessions.size));
  const recip = ev.filter((x) => x.eventName === 'share_pack_recipient_feedback');
  const recipUp = recip.filter((x) => String(((x.metadata ?? {}) as any)?.thumbs || '').toLowerCase() === 'up').length;
  const recipientThumbsUpPct = pct(recipUp, recip.length || 0);

  // Retention (simple): sessions with any event ≥30d ago who are active in this window
  const pastSince = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
  const pastEv = await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: pastSince, lt: since } }, select: { sessionId: true } });
  const cohort = new Set(pastEv.map((x) => String(x.sessionId || '')));
  let retained = 0;
  for (const sid of cohort) {
    if (wauSessions.has(sid)) retained++;
  }
  const retention = pct(retained, cohort.size || 0);

  // Trust: profile_suggestion_accept_rate
  const shown = ev.filter((x) => x.eventName === 'profile_suggestion_shown').length;
  const accepted = ev.filter((x) => x.eventName === 'profile_suggestion_accepted').length;
  const trust = pct(accepted, shown || 0);

  // Safety: incidents and % answers without citations
  const incidents = ev.filter((x) => x.eventName === 'unsafe_report');
  const p0 = incidents.filter((x) => String(((x.metadata ?? {}) as any)?.severity || '').toUpperCase() === 'P0').length;
  const p1 = incidents.filter((x) => String(((x.metadata ?? {}) as any)?.severity || '').toUpperCase() === 'P1').length;
  const answers = ev.filter((x) => x.eventName === 'answer_generated');
  const noCite = answers.filter((x) => !Boolean(((x.metadata ?? {}) as any)?.citations));
  const noCitationPct = pct(noCite.length, answers.length || 0);

  // Latency: p95 of latency_ms metadata.latency_ms
  const lats = ev.filter((x) => x.eventName === 'api_latency' || x.eventName === 'latency_ms').map((x) => Number(((x.metadata ?? {}) as any)?.latency_ms || ((x.metadata ?? {}) as any)?.ms || 0)).filter((n) => n > 0);
  const latencyP95Ms = p95(lats);

  // Usage (using sessions as proxy for users - privacy-preserving)
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 3600 * 1000);
  const dau = new Set(ev.filter((x) => x.createdAt >= oneDayAgo).map((x) => String(x.sessionId || ''))).size;
  const wau = wauSessions.size;
  const mau = new Set((await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) } }, select: { sessionId: true, createdAt: true } })).map((x) => String(x.sessionId || ''))).size;
  const uploads = ev.filter((x) => x.eventName === 'first_upload_done');
  const uploadSessions = new Set(uploads.map((x) => String(x.sessionId || ''))).size;
  const uploadsPerUser = uploadSessions ? Math.round((uploads.length / uploadSessions) * 10) / 10 : 0;

  // Avg pages/doc unavailable from events in MVP
  const avgPagesPerDoc: number | null = null;

  // Tokens/Costs aggregation
  const tus: TokenUsage[] = await prisma.tokenUsage.findMany({ where: { createdAt: { gte: since } } });
  const tokensMap = new Map<string, { feature: string; model: string; tokensIn: number; tokensOut: number; costUsd: number }>();
  for (const t of tus) {
    const k = `${t.feature}|${t.model}`;
    if (!tokensMap.has(k)) tokensMap.set(k, { feature: t.feature, model: t.model, tokensIn: 0, tokensOut: 0, costUsd: 0 });
    const agg = tokensMap.get(k)!;
    agg.tokensIn += t.tokensIn;
    agg.tokensOut += t.tokensOut;
    agg.costUsd += Number(t.costUsd || 0);
  }
  const tokens = Array.from(tokensMap.values());

  return {
    activation,
    clarity,
    preparation: { wauWithSharePct: prepPct, recipientThumbsUpPct },
    retention,
    trust,
    safety: { p0, p1, noCitationPct },
    latencyP95Ms,
    usage: { dau, wau, mau, uploadsPerUser, avgPagesPerDoc },
    tokens,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const last7 = await computeTiles(7);
  const last30 = await computeTiles(30);
  return NextResponse.json({ last7, last30 });
}

