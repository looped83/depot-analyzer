import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { Card, PageHeading } from '../Card';
import { KPICard } from '../KPICard';
import { ChartTooltip } from '../ChartTooltip';
import { SortableTable } from '../tables/SortableTable';
import { fmtPct, fmtNum, fmt } from '../../lib/format';
import { PALETTE, AXIS, GRID, BAR_CURSOR } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

export function CAGRTab({ positions }: Props) {
  const active  = positions.filter((p) => p.wert > 0 && (p.cagr5j > 0 || p.yield > 0));
  const byCagr  = [...active].sort((a, b) => b.cagr5j - a.cagr5j);
  const byChowder = [...active].sort((a, b) => b.chowderScore - a.chowderScore);

  const avgCagr   = active.filter((p) => p.cagr5j > 0).reduce((s, p, _, a) => s + p.cagr5j / a.length, 0);
  const avgYield  = active.reduce((s, p, _, a) => s + p.yield / a.length, 0);
  const avgChowder = active.reduce((s, p, _, a) => s + p.chowderScore / a.length, 0);

  const stars              = active.filter((p) => p.yield >= avgYield && p.cagr5j >= avgCagr);
  const lowYieldHighGrowth = active.filter((p) => p.yield < avgYield && p.cagr5j >= avgCagr);
  const highYieldLowGrowth = active.filter((p) => p.yield > avgYield && p.cagr5j > 0 && p.cagr5j < avgCagr);

  const scatterData = active.map((p) => ({
    x: p.yield, y: p.cagr5j,
    symbol: p.symbol, name: p.name, chowder: p.chowderScore,
  }));

  const top10Chowder = byChowder.slice(0, 10);

  const ScatterTip = ({ active: a, payload }: { active?: boolean; payload?: { payload?: typeof scatterData[0] }[] }) => {
    if (!a || !payload?.length) return null;
    const d = payload[0].payload!;
    return (
      <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs shadow-xl">
        <p className="font-semibold text-slate-800 dark:text-zinc-200 mb-1">{d.symbol} — {d.name}</p>
        <p className="text-slate-500 dark:text-zinc-400">Yield: {fmtPct(d.x)} · CAGR: {fmtPct(d.y)}</p>
        <p className="text-slate-400 dark:text-zinc-500">Chowder: {fmtNum(d.chowder, 1)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeading title="Wachstum" />
      <div className="grid grid-cols-3 gap-3">
        <KPICard title="Ø CAGR 5J"      value={fmtPct(avgCagr)}    sub="Aktive Positionen" info="Compound Annual Growth Rate – durchschnittliches jährliches Dividendenwachstum über 5 Jahre." />
        <KPICard title="Ø Yield"         value={fmtPct(avgYield)}   sub="Aktive Positionen" info="Durchschnittliche Dividendenrendite aller aktiven Positionen." />
        <KPICard title="Ø Chowder Score" value={fmtNum(avgChowder, 1)} sub="Yield + CAGR" info="Chowder Score = Yield + CAGR 5J. Ab 12 gilt eine Position als attraktiv." />
      </div>

      {/* Scatter matrix */}
      <Card
        title="Yield vs. CAGR – Positionierungsmatrix"
        sub="Rechts oben = ideal (hoher Yield + starkes Wachstum) · Gestrichelte Linien = Ø"
      >
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="x" name="Yield %" type="number" {...AXIS} tickFormatter={(v) => `${v} %`}
                label={{ value: 'Yield %', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#94a3b8' }} />
              <YAxis dataKey="y" name="CAGR 5J %" type="number" {...AXIS} tickFormatter={(v) => `${v} %`}
                label={{ value: 'CAGR 5J %', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#94a3b8' }} />
              <ReferenceLine x={avgYield} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={avgCagr}  stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth={1.5} />
              <Tooltip content={(p) => <ScatterTip {...(p as unknown as { active?: boolean; payload?: { payload?: typeof scatterData[0] }[] })} />} />
              <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.65} r={5} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: '⭐ Stars',           count: stars.length,              symbols: stars,              color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' },
            { label: '📈 Wachstum',        count: lowYieldHighGrowth.length, symbols: lowYieldHighGrowth, color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' },
            { label: '⚠ Einkommens-Falle', count: highYieldLowGrowth.length, symbols: highYieldLowGrowth, color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' },
          ].map(({ label, count, symbols, color }) => (
            <div key={label} className={`rounded-xl p-3 ${color}`}>
              <p className="text-xs font-semibold">{label} ({count})</p>
              <p className="mt-1 text-xs opacity-70 font-mono leading-relaxed">
                {symbols.map((p) => p.symbol).join('  ') || '—'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Chowder bar */}
      <Card title="Top 10 Chowder Score (Yield + CAGR)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={top10Chowder} margin={{ bottom: 28, top: 4, right: 8 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis dataKey="symbol" {...AXIS} angle={-35} textAnchor="end" interval={0} />
            <YAxis {...AXIS} tickFormatter={(v) => fmtNum(v)} />
            <Tooltip cursor={BAR_CURSOR} content={(props) => <ChartTooltip {...props} formatter={(v) => fmtNum(v as number, 1)} />} />
            <Bar dataKey="chowderScore" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {top10Chowder.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* CAGR table */}
      <Card title="CAGR & Wachstums-Ranking" pad={false}>
        <div className="px-5 pt-3 pb-5">
          <SortableTable
            data={byCagr}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'typ', 'kategorie']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'cagr5j', label: 'CAGR 5J', align: 'right',
                render: (v) => (
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-14 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (v as number) / (byCagr[0]?.cagr5j || 1) * 100)}%` }} />
                    </div>
                    <span className={`font-mono tabular-nums ${(v as number) < 3 && (v as number) > 0 ? 'text-amber-500' : ''}`}>
                      {fmtPct(v as number)}
                    </span>
                  </div>
                )},
              { key: 'yield', label: 'Yield', align: 'right', render: (v) => fmtPct(v as number) },
              { key: 'chowderScore', label: 'Chowder', align: 'right',
                render: (v) => (
                  <span className={`font-mono font-semibold tabular-nums ${
                    (v as number) >= 12 ? 'text-emerald-600 dark:text-emerald-400' :
                    (v as number) >= 8  ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                  }`}>{fmtNum(v as number, 1)}</span>
                )},
              { key: 'wert',     label: 'Wert',     align: 'right', render: (v) => fmt(v as number) },
              { key: 'typ',      label: 'Typ',       align: 'center' },
              { key: 'kategorie',label: 'Kategorie' },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
