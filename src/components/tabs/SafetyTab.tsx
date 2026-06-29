import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { SortableTable } from '../tables/SortableTable';
import { fmtPct, fmtNum, fmt } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

type RiskLevel = 'green' | 'yellow' | 'red';

function riskLevel(p: DepotPosition): RiskLevel {
  if (p.status === 'Verkauf') return 'red';
  if (p.yield > 9 || (p.cagr5j < 0 && p.cagr5j !== 0)) return 'red';
  if (p.yield > 6.5 || p.cagr5j < 2 || p.status === 'Beobachten') return 'yellow';
  return 'green';
}

function safetyScore(p: DepotPosition): number {
  let score = 50;
  if (p.cagr5j >= 8)   score += 20;
  else if (p.cagr5j >= 5) score += 12;
  else if (p.cagr5j >= 2) score += 4;
  else if (p.cagr5j < 0)  score -= 20;

  if (p.yield <= 4)     score += 10;
  else if (p.yield <= 6.5) score += 4;
  else if (p.yield <= 9)   score -= 10;
  else score -= 20;

  if (p.prio === 'A')        score += 10;
  else if (p.prio === 'B')  score += 5;
  else if (p.prio === 'C')  score -= 5;
  else if (p.prio === 'D')  score -= 10;
  else if (p.prio === 'E')  score -= 20;

  if (p.status === 'Beobachten') score -= 10;
  if (p.status === 'Verkauf')    score -= 20;

  return Math.max(0, Math.min(100, score));
}

const RISK_COLOR: Record<RiskLevel, string> = {
  green:  '#10b981',
  yellow: '#f59e0b',
  red:    '#ef4444',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  green:  'Sicher',
  yellow: 'Beobachten',
  red:    'Risiko',
};

export function SafetyTab({ positions }: Props) {
  const active = positions.filter((p) => p.wert > 0);

  const withRisk = active.map((p) => ({
    ...p,
    risk: riskLevel(p),
    safetyScore: safetyScore(p),
  }));

  const reds    = withRisk.filter((p) => p.risk === 'red');
  const yellows = withRisk.filter((p) => p.risk === 'yellow');
  const greens  = withRisk.filter((p) => p.risk === 'green');

  const traps = active.filter((p) => p.yield > 6 && p.cagr5j < 2 && p.cagr5j >= 0);
  const avgSafety = withRisk.reduce((s, p) => s + p.safetyScore, 0) / (withRisk.length || 1);

  const scatterData = active
    .filter((p) => p.cagr5j !== 0 || p.yield !== 0)
    .map((p) => ({
      x: p.yield, y: p.cagr5j,
      symbol: p.symbol, risk: riskLevel(p), safety: safetyScore(p),
    }));

  const SafetyTip = ({ active: a, payload }: { active?: boolean; payload?: { payload?: typeof scatterData[0] }[] }) => {
    if (!a || !payload?.length) return null;
    const d = payload[0].payload!;
    return (
      <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs shadow-xl">
        <p className="font-semibold text-slate-800 dark:text-zinc-200 mb-1">{d.symbol}</p>
        <p className="text-slate-500 dark:text-zinc-400">Yield {fmtPct(d.x)} · CAGR {fmtPct(d.y)}</p>
        <p className="mt-0.5" style={{ color: RISK_COLOR[d.risk] }}>
          {RISK_LABEL[d.risk]} · Safety {d.safety}
        </p>
      </div>
    );
  };

  const sortedBySafety = [...withRisk].sort((a, b) => a.safetyScore - b.safetyScore);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Sichere Positionen"   value={String(greens.length)}           sub={`von ${active.length} aktiven`} />
        <KPICard title="Zu beobachten"        value={String(yellows.length)}          sub="Yield hoch od. CAGR niedrig" />
        <KPICard title="Risiko-Positionen"    value={String(reds.length)}             sub="Sofortiger Handlungsbedarf" />
        <KPICard title="Ø Safety Score"       value={fmtNum(avgSafety)}               sub="0 = kritisch · 100 = sicher" info="Gewichteter Score aus CAGR, Yield, Prio und Status. Höhere Werte bedeuten geringeres Risiko." />
      </div>

      {/* Risk matrix scatter */}
      <Card
        title="Sicherheitsmatrix – Yield vs. CAGR"
        sub="Grün = sicher · Gelb = beobachten · Rot = Risiko · Rechts unten = Dividend-Trap-Zone"
      >
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="x" name="Yield %" type="number" {...AXIS}
                tickFormatter={(v) => `${v} %`}
                label={{ value: 'Yield %', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }} />
              <YAxis dataKey="y" name="CAGR %" type="number" {...AXIS}
                tickFormatter={(v) => `${v} %`}
                label={{ value: 'CAGR 5J %', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#94a3b8' }} />
              {/* Danger zone: high yield + low growth */}
              <ReferenceLine x={6.5}  stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={2}    stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine x={9}    stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
              <Tooltip content={(p) => <SafetyTip {...(p as unknown as { active?: boolean; payload?: { payload?: typeof scatterData[0] }[] })} />} />
              <Scatter data={scatterData} r={5} isAnimationActive={false}>
                {scatterData.map((d, i) => (
                  <Cell key={i} fill={RISK_COLOR[d.risk]} fillOpacity={0.75} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500 dark:text-zinc-400">
            <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />Yield &lt; 6.5 % &amp; CAGR &ge; 2 %</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Gelbe Linien = Warngrenze</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Rote Linie = Hochrisiko-Yield (&gt; 9 %)</span>
          </div>
        </div>
      </Card>

      {/* Dividend traps */}
      {traps.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
            Mögliche Dividend Traps – Hoher Yield (&gt;6 %) ohne Dividendenwachstum ({traps.length})
          </p>
          <p className="text-xs text-red-600/70 dark:text-red-400/60 mb-2">
            Hohe Ausschüttung ohne Wachstum kann auf eine zukünftige Dividendenkürzung hindeuten.
          </p>
          <div className="flex flex-wrap gap-2">
            {traps.map((p) => (
              <span key={p.symbol} className="text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-2 py-1 rounded-full font-mono">
                {p.symbol} Yield {fmtPct(p.yield, 1)} · CAGR {fmtPct(p.cagr5j, 1)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk group cards */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Risiko-Positionen', items: reds,    bg: 'bg-red-50/60 dark:bg-red-950/30 border-red-100 dark:border-red-900/50',       text: 'text-red-700 dark:text-red-400' },
          { label: 'Zu beobachten',     items: yellows, bg: 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50', text: 'text-amber-700 dark:text-amber-400' },
          { label: 'Sichere Positionen', items: greens, bg: 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-400' },
        ] as const).map(({ label, items, bg, text }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${text}`}>{label}</div>
            <div className={`text-2xl font-bold ${text}`}>{items.length}</div>
            <div className="text-xs opacity-60 mt-1 font-mono leading-relaxed">
              {items.map((p) => p.symbol).join(', ') || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Stresstest */}
      <Card title="Portfolio-Stresstest" sub="Was passiert bei einer Dividendenkürzung der Top 5 Positionen?">
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { label: 'Aktuell', pct: 0 },
            { label: '-20 % Kürzung', pct: 20 },
            { label: '-50 % Kürzung', pct: 50 },
          ].map(({ label, pct }) => {
            const top5 = [...active].sort((a, b) => b.annualDividend - a.annualDividend).slice(0, 5);
            const top5Div = top5.reduce((s, p) => s + p.annualDividend, 0);
            const totalDiv = active.reduce((s, p) => s + p.annualDividend, 0);
            const lost = top5Div * (pct / 100);
            const remaining = totalDiv - lost;
            return (
              <div key={label} className={`rounded-xl border p-4 text-center ${
                pct === 0 ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                : pct <= 20 ? 'border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20'
              }`}>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">{label}</div>
                <div className={`text-xl font-bold ${pct === 0 ? 'text-emerald-600 dark:text-emerald-400' : pct <= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmt(remaining)} /Jahr
                </div>
                <div className="text-xs opacity-50 mt-0.5">{fmt(remaining / 12)} /Monat</div>
                {pct > 0 && <div className="text-xs opacity-40 mt-1">-{fmt(lost)} Verlust</div>}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
          Betroffene Top 5: {[...active].sort((a, b) => b.annualDividend - a.annualDividend).slice(0, 5).map(p =>
            <span key={p.symbol} className="font-mono bg-slate-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded mx-0.5">{p.symbol}</span>
          )}
        </div>
      </Card>

      {/* Safety ranking table */}
      <Card title="Safety Ranking – Alle aktiven Positionen" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable
            data={sortedBySafety}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'status']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'safetyScore', label: 'Safety', align: 'right',
                render: (v) => {
                  const n = v as number;
                  const color = n >= 60 ? 'text-emerald-600 dark:text-emerald-400' : n >= 40 ? 'text-amber-500' : 'text-red-500';
                  return (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-14 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${n >= 60 ? 'bg-emerald-500' : n >= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${n}%` }} />
                      </div>
                      <span className={`font-mono font-semibold tabular-nums ${color}`}>{n}</span>
                    </div>
                  );
                }},
              { key: 'yield', label: 'Yield', align: 'right',
                render: (v) => (
                  <span className={`font-mono tabular-nums ${(v as number) > 9 ? 'text-red-500 font-semibold' : (v as number) > 6.5 ? 'text-amber-500' : ''}`}>
                    {fmtPct(v as number)}
                  </span>
                )},
              { key: 'cagr5j', label: 'CAGR 5J', align: 'right',
                render: (v) => (
                  <span className={`font-mono tabular-nums ${(v as number) < 0 ? 'text-red-500 font-semibold' : (v as number) < 2 ? 'text-amber-500' : ''}`}>
                    {fmtPct(v as number)}
                  </span>
                )},
              { key: 'status', label: 'Status', align: 'center',
                render: (v) => (
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${
                    v === 'Verkauf'    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                    v === 'Beobachten'? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                    'bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                  }`}>{String(v)}</span>
                )},
              { key: 'wert',  label: 'Wert',  align: 'right', render: (v) => fmt(v as number) },
              { key: 'prio',  label: 'Prio',  align: 'center' },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
