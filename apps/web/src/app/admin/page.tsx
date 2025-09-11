import React from 'react';

async function fetchMetrics() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/admin/metrics`, { headers: { 'x-admin': '1' }, cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const data = await fetchMetrics();
  const last7 = data?.last7 || {};
  const last30 = data?.last30 || {};
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
      <p className="text-sm text-neutral-600 mb-6">Read-only metrics. No PHI.</p>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Tile title="Activation (7d)" value={`${last7.activation ?? 0}%`} />
        <Tile title="Clarity (helpful, 7d)" value={`${last7.clarity ?? 0}%`} />
        <Tile title="Preparation (WAU w/ pack, 7d)" value={`${last7.preparation?.wauWithSharePct ?? 0}%`} />
        <Tile title="Recipient thumbs-up (7d)" value={`${last7.preparation?.recipientThumbsUpPct ?? 0}%`} />
        <Tile title="Trust (accept rate, 7d)" value={`${last7.trust ?? 0}%`} />
        <Tile title="Safety P0/P1 (7d)" value={`${last7.safety?.p0 ?? 0} / ${last7.safety?.p1 ?? 0}`} />
        <Tile title="No-citation answers (7d)" value={`${last7.safety?.noCitationPct ?? 0}%`} />
        <Tile title="Latency p95 (ms, 7d)" value={`${last7.latencyP95Ms ?? 0}`} />
        <Tile title="DAU/WAU/MAU" value={`${last7.usage?.dau ?? 0} / ${last7.usage?.wau ?? 0} / ${last7.usage?.mau ?? 0}`} />
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-medium mb-2">Tokens/Costs (30d)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Feature</th>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">In</th>
                <th className="py-2 pr-4">Out</th>
                <th className="py-2 pr-4">Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {(last30.tokens || []).map((t: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-4">{t.feature}</td>
                  <td className="py-2 pr-4">{t.model}</td>
                  <td className="py-2 pr-4">{t.tokensIn}</td>
                  <td className="py-2 pr-4">{t.tokensOut}</td>
                  <td className="py-2 pr-4">{(t.costUsd || 0).toFixed?.(4) ?? t.costUsd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Tile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <div className="text-neutral-500 text-xs">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

