import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ReferenceLine,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { computeTotals } from '../../lib/calculations';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';

interface Props { positions: DepotPosition[] }

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316'];

export function DividendTab({ positions }: Props) {
  const totals = computeTotals(positions);
  const active = positions.filter((p) => p.wert > 0);

  const byDiv = [...active].sort((a, b) => b.annualDividend - a.annualDividend);
  const byYield = [...active].sort((a, b) => b.yield - a.yield);

  // Income vs Growth split
  const incomePositions = active.filter((p) => ['Income', 'High Yield'].includes(p.kategorie));
  const growthPositions = active.filter((p) => !['Income', 'High Yield'].includes(p.kategorie));
  const incomeDiv = incomePositions.reduce((s, p) => s + p.annualDividend, 0);
  const growthDiv = growthPositions.reduce((s, p) => s + p.annualDividend, 0);

  // Top contributors for chart
  const top15 = byDiv.slice(0, 15);

  // Yield outliers
  const highYield = active.filter((p) => p.yield > 6);
  const lowYield = active.filter((p) => p.yield > 0 && p.yield < 1.5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Jährl. Dividende" value={fmt(totals.totalAnnualDiv)} sub="Brutto gesamt" color="green" />
        <KPICard title="Ø Monatliche Dividende" value={fmt(totals.totalMonthlyDiv)} sub="Jahresdividende / 12" color="green" />
        <KPICard title="Depot-Yield (gew.)" value={fmtPct(totals.weightedYield)} sub="Gewichteter Ø-Yield" color="teal" />
        <KPICard title="Yield-on-Portfolio" value={fmtPct(totals.weightedYield)} sub="Ertrag / Gesamtkapital" color="blue" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-1">Income vs. Growth</h3>
          <div className="flex gap-4 mt-2">
            <div className="flex-1">
              <div className="text-xs opacity-60">Income / High Yield</div>
              <div className="text-xl font-bold">{fmt(incomeDiv)}</div>
              <div className="text-xs opacity-60">{totals.totalAnnualDiv > 0 ? ((incomeDiv / totals.totalAnnualDiv) * 100).toFixed(1) : 0}% der Dividende</div>
            </div>
            <div className="flex-1">
              <div className="text-xs opacity-60">Growth / Accumulation</div>
              <div className="text-xl font-bold">{fmt(growthDiv)}</div>
              <div className="text-xs opacity-60">{totals.totalAnnualDiv > 0 ? ((growthDiv / totals.totalAnnualDiv) * 100).toFixed(1) : 0}% der Dividende</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-1">Yield-Ausreißer</h3>
          <div className="text-xs opacity-60 mt-2">High Yield (&gt;6%): {highYield.map((p) => p.symbol).join(', ') || '—'}</div>
          <div className="text-xs opacity-60 mt-1">Low Yield (&lt;1.5%): {lowYield.map((p) => p.symbol).join(', ') || '—'}</div>
        </div>
      </div>

      {/* Top Dividend Contributors */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">Top Dividendenbeiträger (Jährlich)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={top15} margin={{ bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
            <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: '#94a3b8' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}€`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip formatter={(v: unknown) => [fmt(v as number), 'Jährliche Dividende']} />
            <Bar dataKey="annualDividend" radius={[4, 4, 0, 0]}>
              {top15.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full dividend table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">Dividendenanalyse – Alle Positionen</h3>
        <SortableTable
          data={byDiv}
          rowKey={(r) => r.symbol}
          filterKeys={['symbol', 'name', 'kategorie']}
          columns={[
            { key: 'symbol', label: 'Symbol', width: '80px' },
            { key: 'name', label: 'Name' },
            { key: 'wert', label: 'Wert (€)', align: 'right', render: (v) => fmt(v as number) },
            { key: 'yield', label: 'Yield %', align: 'right', render: (v) => (
              <span className={`font-mono ${(v as number) > 6 ? 'text-orange-600 dark:text-orange-400 font-semibold' : (v as number) < 1.5 ? 'text-gray-400' : ''}`}>
                {fmtPct(v as number)}
              </span>
            )},
            { key: 'annualDividend', label: 'Jährl. Div.', align: 'right', render: (v) => fmt(v as number) },
            { key: 'monthlyDividend', label: 'Monatl. Ø', align: 'right', render: (v) => fmt(v as number) },
            { key: 'dividendContribution', label: '% Ertrag', align: 'right',
              render: (v, row) => (
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (row as DepotPosition).dividendContribution)}%` }} />
                  </div>
                  <span>{(v as number).toFixed(1)}%</span>
                </div>
              )
            },
            { key: 'ausschuettungsfrequenz', label: 'Frequenz', align: 'center', render: (v) => (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{String(v)}</span>
            )},
            { key: 'kategorie', label: 'Kategorie' },
          ]}
        />
      </div>

      {/* Yield Ranking */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">Yield-Ranking</h3>
        <SortableTable
          data={byYield}
          rowKey={(r) => r.symbol}
          columns={[
            { key: 'symbol', label: 'Symbol', width: '80px' },
            { key: 'name', label: 'Name' },
            { key: 'yield', label: 'Yield %', align: 'right', render: (v) => (
              <div className="flex items-center gap-2 justify-end">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (v as number) / (byYield[0]?.yield || 1) * 100)}%` }} />
                </div>
                <span className="font-mono">{fmtPct(v as number)}</span>
              </div>
            )},
            { key: 'cagr5j', label: 'CAGR 5J', align: 'right', render: (v) => fmtPct(v as number) },
            { key: 'wert', label: 'Wert (€)', align: 'right', render: (v) => fmt(v as number) },
            { key: 'typ', label: 'Typ', align: 'center' },
          ]}
        />
      </div>
    </div>
  );
}
