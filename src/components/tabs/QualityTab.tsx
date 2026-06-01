import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { ChartTooltip } from '../ChartTooltip';
import { SortableTable } from '../tables/SortableTable';
import { fmtPct } from '../../lib/format';
import { PALETTE, AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

interface QualityDimension {
  label: string;
  score: number;   // 0–100
  detail: string;
}

function completeness(p: DepotPosition): number {
  let s = 0;
  if (p.yield > 0)   s += 20;
  if (p.cagr5j > 0)  s += 20;
  if (p.isin)         s += 15;
  if (p.prio)         s += 15;
  if (p.ausschuettungsmonate) s += 15;
  if (p.ratingScore > 0) s += 15;
  return s;
}

export function QualityTab({ positions }: Props) {
  const all    = positions;
  const active = positions.filter((p) => p.wert > 0);

  // Data completeness
  const withYield    = all.filter((p) => p.yield > 0).length;
  const withCagr     = all.filter((p) => p.cagr5j > 0).length;
  const withIsin     = all.filter((p) => !!p.isin).length;
  const withPrio     = all.filter((p) => !!p.prio).length;
  const withMonths   = all.filter((p) => !!p.ausschuettungsmonate).length;
  const withRating   = all.filter((p) => p.ratingScore > 0).length;

  const completenessRows = [
    { label: 'Yield vorhanden',         count: withYield,  total: all.length },
    { label: 'CAGR 5J vorhanden',       count: withCagr,   total: all.length },
    { label: 'ISIN vorhanden',          count: withIsin,   total: all.length },
    { label: 'Priorität gesetzt',       count: withPrio,   total: all.length },
    { label: 'Ausschüttungsmonate',     count: withMonths, total: all.length },
    { label: 'Rating-Score vorhanden',  count: withRating, total: all.length },
  ].map((r) => ({ ...r, pct: (r.count / r.total) * 100 }));

  const avgCompleteness = completenessRows.reduce((s, r) => s + r.pct, 0) / completenessRows.length;

  // Score distribution buckets
  const buckets = [
    { label: '0–24',  min: 0,  max: 25 },
    { label: '25–49', min: 25, max: 50 },
    { label: '50–74', min: 50, max: 75 },
    { label: '75–100',min: 75, max: 101 },
  ];
  const scoreDistrib = buckets.map(({ label, min, max }) => ({
    label,
    count: all.filter((p) => p.dividendScore >= min && p.dividendScore < max).length,
  }));

  const ratingDistrib = buckets.map(({ label, min, max }) => ({
    label,
    count: all.filter((p) => p.ratingScore >= min && p.ratingScore < max).length,
  }));

  // Prio distribution
  const prioDistrib = ['A', 'B', 'C', 'D', '—'].map((prio) => ({
    name: `Prio ${prio}`,
    value: all.filter((p) => (p.prio ?? '—') === prio).length,
  })).filter((d) => d.value > 0);

  // Status distribution
  const statusMap = new Map<string, number>();
  for (const p of all) statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);
  const statusDistrib = [...statusMap.entries()].map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Weighted quality score (dividend score weighted by portfolio weight)
  const totalWert = active.reduce((s, p) => s + p.wert, 0);
  const weightedQuality = totalWert > 0
    ? active.reduce((s, p) => s + p.dividendScore * (p.wert / totalWert), 0)
    : 0;

  // Per-position completeness
  const withCompleteness = all.map((p) => ({ ...p, completenessScore: completeness(p) }))
    .sort((a, b) => a.completenessScore - b.completenessScore);

  // Quality dimensions for scorecard
  const dimensions: QualityDimension[] = [
    {
      label: 'Datenvollständigkeit',
      score: avgCompleteness,
      detail: `Ø ${avgCompleteness.toFixed(0)} % der Felder befüllt`,
    },
    {
      label: 'Prioritäten-Abdeckung',
      score: (withPrio / all.length) * 100,
      detail: `${withPrio} von ${all.length} Positionen mit Prio`,
    },
    {
      label: 'CAGR-Abdeckung',
      score: (withCagr / all.length) * 100,
      detail: `${withCagr} von ${all.length} mit CAGR-Daten`,
    },
    {
      label: 'Rating-Abdeckung',
      score: (withRating / all.length) * 100,
      detail: `${withRating} von ${all.length} mit Rating-Score`,
    },
    {
      label: 'Gewichteter D-Score',
      score: weightedQuality,
      detail: `Dividendenqualität gewichtet nach Depotwert`,
    },
  ];

  const overallQuality = dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Gesamtqualität"       value={`${overallQuality.toFixed(0)} / 100`} sub="Ø aller Dimensionen" />
        <KPICard title="Datenvollständigkeit" value={`${avgCompleteness.toFixed(0)} %`}     sub="Ø über alle Felder" />
        <KPICard title="Gew. D-Score"         value={weightedQuality.toFixed(1)}            sub="Nach Depotwert gewichtet" />
        <KPICard title="Positionen gesamt"    value={String(all.length)}                    sub={`davon ${active.length} aktiv`} />
      </div>

      {/* Quality scorecard */}
      <Card title="Qualitäts-Scorecard">
        <div className="space-y-3 mt-2">
          {dimensions.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 dark:text-zinc-300">{d.label}</span>
                <span className="text-slate-400 dark:text-zinc-500">{d.detail}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      d.score >= 75 ? 'bg-emerald-500' : d.score >= 50 ? 'bg-blue-500' : d.score >= 25 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(100, d.score)}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold tabular-nums w-10 text-right ${
                  d.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                  d.score >= 50 ? 'text-blue-600 dark:text-blue-400' :
                  d.score >= 25 ? 'text-amber-500' : 'text-red-500'
                }`}>{d.score.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Data completeness bars */}
      <Card title="Datenvollständigkeit je Feld">
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={completenessRows} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" {...AXIS} domain={[0, 100]} tickFormatter={(v) => `${v} %`} />
              <YAxis type="category" dataKey="label" {...AXIS} width={160} />
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${(v as number).toFixed(0)} %`} />} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {completenessRows.map((r, i) => (
                  <Cell key={i} fill={r.pct >= 80 ? '#10b981' : r.pct >= 50 ? '#3b82f6' : '#f59e0b'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Score distributions + prio + status */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Dividenden-Score Verteilung">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scoreDistrib} margin={{ bottom: 4, top: 4, right: 8 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} Positionen`} />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {scoreDistrib.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Rating-Score Verteilung">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ratingDistrib} margin={{ bottom: 4, top: 4, right: 8 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} Positionen`} />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {ratingDistrib.map((_, i) => <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Prioritäten-Verteilung">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={prioDistrib} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={65} innerRadius={30}
                paddingAngle={2} strokeWidth={0}>
                {prioDistrib.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} Positionen`} />} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Status-Verteilung">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusDistrib} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={65} innerRadius={30}
                paddingAngle={2} strokeWidth={0}>
                {statusDistrib.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} Positionen`} />} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Completeness table – worst first */}
      <Card title="Datenvollständigkeit je Position – schlechteste zuerst" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable
            data={withCompleteness}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'status']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'completenessScore', label: 'Vollständigkeit', align: 'right',
                render: (v) => {
                  const n = v as number;
                  return (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${n >= 75 ? 'bg-emerald-500' : n >= 50 ? 'bg-blue-500' : n >= 25 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${n}%` }} />
                      </div>
                      <span className="font-mono tabular-nums">{n} %</span>
                    </div>
                  );
                }},
              { key: 'yield',       label: 'Yield',  align: 'right',
                render: (v) => <span className={`font-mono tabular-nums ${(v as number) === 0 ? 'text-red-400' : ''}`}>{fmtPct(v as number)}</span> },
              { key: 'cagr5j',      label: 'CAGR',   align: 'right',
                render: (v) => <span className={`font-mono tabular-nums ${(v as number) === 0 ? 'text-red-400' : ''}`}>{fmtPct(v as number)}</span> },
              { key: 'prio',        label: 'Prio',   align: 'center',
                render: (v) => <span className={!v ? 'text-red-400 font-semibold' : ''}>{String(v || '—')}</span> },
              { key: 'ratingScore', label: 'Rating', align: 'right',
                render: (v) => <span className={`font-mono tabular-nums ${(v as number) === 0 ? 'text-red-400' : ''}`}>{String(v)}</span> },
              { key: 'status',      label: 'Status', align: 'center' },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
