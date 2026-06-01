import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';
import { PALETTE, AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

const PRIO_MULT: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0.5 };

type Strategy = 'prio' | 'equal';

function calcTargets(active: DepotPosition[], strategy: Strategy): Map<string, number> {
  const map = new Map<string, number>();
  if (strategy === 'equal') {
    const t = 100 / active.length;
    active.forEach((p) => map.set(p.symbol, t));
  } else {
    const total = active.reduce((s, p) => s + (PRIO_MULT[p.prio ?? ''] ?? 1.5), 0);
    active.forEach((p) => map.set(p.symbol, ((PRIO_MULT[p.prio ?? ''] ?? 1.5) / total) * 100));
  }
  return map;
}

export function RebalancingTab({ positions }: Props) {
  const active = positions.filter((p) => p.wert > 0);
  const totalWert = active.reduce((s, p) => s + p.wert, 0);
  const totalSpar = positions.reduce((s, p) => s + p.sparbetrag, 0);

  const [strategy, setStrategy] = useState<Strategy>('prio');
  const [budget, setBudget]     = useState(Math.max(totalSpar, 200));

  const targets = calcTargets(active, strategy);

  const rows = active.map((p) => {
    const targetPct   = targets.get(p.symbol) ?? 0;
    const currentPct  = p.portfolioWeight;
    const deltaPct    = targetPct - currentPct;
    const deltaEur    = (deltaPct / 100) * totalWert;
    return { ...p, targetPct, deltaPct, deltaEur };
  }).sort((a, b) => b.deltaPct - a.deltaPct);

  // Monthly buy list: only underweights, allocate budget proportionally
  const underweight = rows.filter((r) => r.deltaPct > 0.1);
  const totalDeficit = underweight.reduce((s, r) => s + r.deltaPct, 0);
  const buyList = underweight
    .map((r) => ({ ...r, monthlyBuy: totalDeficit > 0 ? (r.deltaPct / totalDeficit) * budget : 0 }))
    .sort((a, b) => b.monthlyBuy - a.monthlyBuy)
    .slice(0, 10);

  const overweight  = rows.filter((r) => r.deltaPct < -0.5).sort((a, b) => a.deltaPct - b.deltaPct);
  const inBalance   = rows.filter((r) => Math.abs(r.deltaPct) <= 0.5);

  const maxDeviation = Math.max(...rows.map((r) => Math.abs(r.deltaPct)));
  const avgDeviation = rows.reduce((s, r) => s + Math.abs(r.deltaPct), 0) / (rows.length || 1);

  const chartData = rows.map((r) => ({
    symbol: r.symbol,
    current: +r.portfolioWeight.toFixed(2),
    target:  +r.targetPct.toFixed(2),
    delta:   +r.deltaPct.toFixed(2),
  })).sort((a, b) => b.delta - a.delta).slice(0, 20);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Monatliches Budget" value={`${budget} €`}              sub="Für Rebalancing" />
        <KPICard title="Untergewichtet"     value={String(underweight.length)} sub="Positionen" />
        <KPICard title="Übergewichtet"      value={String(overweight.length)}  sub="Positionen" />
        <KPICard title="Ø Abweichung"       value={`${avgDeviation.toFixed(1)} %`} sub="Vom Zielgewicht" />
      </div>

      {/* Strategy + Budget */}
      <Card title="Strategie & Budget">
        <div className="flex flex-wrap gap-6 mt-2 items-end">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 block mb-2">Zielgewicht-Strategie</label>
            <div className="flex gap-2">
              {([['prio', 'Prio-gewichtet (A=4x, B=3x, C=2x, D=1x)'], ['equal', 'Gleichgewichtet']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setStrategy(val)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
                    strategy === val
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 block mb-2">Monatliches Rebalancing-Budget (€)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={50} max={5000} step={50} value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-40 accent-blue-500" />
              <span className="text-sm font-mono tabular-nums w-16 text-slate-700 dark:text-zinc-300">{budget} €</span>
            </div>
          </div>
        </div>

        {strategy === 'prio' && (
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-3">
            Prio-gewichtet: Positionen ohne Prio erhalten Faktor 1.5. Das Zielgewicht basiert auf dem Verhältnis der Prio-Faktoren, nicht auf absoluten Prozenten.
          </p>
        )}
      </Card>

      {/* Monthly buy list */}
      {buyList.length > 0 && (
        <Card title={`Empfohlene Käufe diesen Monat – Budget ${fmt(budget)}`}
          sub="Untergewichtete Positionen proportional aufstocken">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {buyList.map((r, i) => (
              <div key={r.symbol}
                className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-sm text-slate-800 dark:text-zinc-200">{r.symbol}</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmt(r.monthlyBuy)}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{r.name}</p>
                <div className="flex gap-2 mt-1.5 text-xs">
                  <span className="text-slate-400 dark:text-zinc-500">Ist <span className="font-semibold text-slate-600 dark:text-zinc-400">{r.portfolioWeight.toFixed(1)}%</span></span>
                  <span className="text-slate-400 dark:text-zinc-500">→ Ziel <span className="font-semibold text-blue-600 dark:text-blue-400">{r.targetPct.toFixed(1)}%</span></span>
                </div>
                <div className="mt-1.5 w-full h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (r.portfolioWeight / r.targetPct) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Delta bar chart */}
      <Card title="Abweichung vom Zielgewicht (Top 20)"
        sub="Grün = untergewichtet (kaufen) · Rot/Orange = übergewichtet (nicht weiter besparen)">
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ bottom: 28, top: 4, right: 8 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="symbol" {...AXIS} angle={-35} textAnchor="end" interval={0} />
              <YAxis {...AXIS} tickFormatter={(v) => `${v.toFixed(1)} %`} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
              <Tooltip
                formatter={(v: unknown) => [`${(v as number).toFixed(2)} %`, 'Δ Gewicht']}
                contentStyle={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="delta" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.delta > 0 ? '#10b981' : '#f97316'} fillOpacity={0.82} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Overweight warning */}
      {overweight.length > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20 p-4">
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
            Übergewichtete Positionen – Sparplan pausieren oder reduzieren ({overweight.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {overweight.map((r) => (
              <span key={r.symbol} className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full font-mono">
                {r.symbol} +{Math.abs(r.deltaPct).toFixed(1)} % über Ziel
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full table */}
      <Card title="Alle Positionen – Ist vs. Ziel" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable
            data={rows}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'prio']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'prio', label: 'Prio', align: 'center',
                render: (v) => (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    v === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                    v === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                    v === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                    v === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                    v === 'E' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                    'bg-slate-100 dark:bg-zinc-700 text-slate-500'
                  }`}>{String(v || '—')}</span>
                )},
              { key: 'portfolioWeight', label: 'Ist %',    align: 'right', render: (v) => fmtPct(v as number) },
              { key: 'targetPct',       label: 'Ziel %',   align: 'right',
                render: (v) => <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">{fmtPct(v as number)}</span> },
              { key: 'deltaPct', label: 'Delta', align: 'right',
                render: (v) => {
                  const n = v as number;
                  return (
                    <span className={`font-mono font-semibold tabular-nums ${
                      n > 0.5 ? 'text-emerald-600 dark:text-emerald-400' :
                      n < -0.5 ? 'text-orange-500' : 'text-slate-400'
                    }`}>{n > 0 ? '+' : ''}{n.toFixed(2)} %</span>
                  );
                }},
              { key: 'deltaEur', label: 'Delta (€)', align: 'right',
                render: (v) => {
                  const n = v as number;
                  return (
                    <span className={`font-mono tabular-nums ${n > 0 ? 'text-emerald-600 dark:text-emerald-400' : n < 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                      {n > 0 ? '+' : ''}{fmt(Math.abs(n))}
                    </span>
                  );
                }},
              { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
