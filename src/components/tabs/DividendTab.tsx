import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { ChartTooltip } from '../ChartTooltip';
import { computeTotals } from '../../lib/calculations';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';
import { PALETTE, AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

export function DividendTab({ positions }: Props) {
  const totals   = computeTotals(positions);
  const active   = positions.filter((p) => p.wert > 0);
  const byDiv    = [...active].sort((a, b) => b.annualDividend - a.annualDividend);
  const byYield  = [...active].sort((a, b) => b.yield - a.yield);
  const top15    = byDiv.slice(0, 15);

  const incomeDiv = active.filter((p) => ['Income','High Yield'].includes(p.kategorie))
                         .reduce((s, p) => s + p.annualDividend, 0);
  const growthDiv = totals.totalAnnualDiv - incomeDiv;

  const highYield = active.filter((p) => p.yield > 6);
  const lowYield  = active.filter((p) => p.yield > 0 && p.yield < 1.5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Jährl. Dividende"   value={fmt(totals.totalAnnualDiv)}    sub="Brutto gesamt" />
        <KPICard title="Ø Monatl. Dividende" value={fmt(totals.totalMonthlyDiv)}   sub="Jahresdividende / 12" />
        <KPICard title="Depot-Yield (gew.)"  value={fmtPct(totals.weightedYield)}  sub="Gewichteter Ø-Yield" />
        <KPICard title="Yield-on-Portfolio"  value={fmtPct(totals.weightedYield)}  sub="Ertrag / Gesamtkapital" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Income vs. Growth">
          <div className="flex gap-6 mt-1">
            {[
              { label: 'Income / High Yield',     val: incomeDiv },
              { label: 'Growth / Accumulation',   val: growthDiv },
            ].map(({ label, val }) => (
              <div key={label} className="flex-1">
                <p className="text-xs text-slate-400 dark:text-zinc-500">{label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{fmt(val)}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  {totals.totalAnnualDiv > 0 ? ((val / totals.totalAnnualDiv) * 100).toFixed(1) : 0} % der Dividende
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Yield-Ausreißer">
          <div className="mt-2 space-y-2">
            <div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">High Yield &gt; 6 %&nbsp;</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                {highYield.length ? highYield.map((p) => p.symbol).join('  ') : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">Low Yield &lt; 1.5 %&nbsp;</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                {lowYield.length ? lowYield.map((p) => p.symbol).join('  ') : '—'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Top Dividendenbeiträger – Jährlich">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top15} margin={{ bottom: 28, top: 4, right: 8 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis dataKey="symbol" {...AXIS} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)} €`} {...AXIS} />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...props}
                  formatter={(v) => fmt(v as number)}
                  labelFormatter={(l) => String(l)}
                />
              )}
            />
            <Bar dataKey="annualDividend" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {top15.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Dividendenanalyse – Alle Positionen" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable
            data={byDiv}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'kategorie']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
              { key: 'yield', label: 'Yield', align: 'right',
                render: (v) => (
                  <span className={`font-mono tabular-nums ${(v as number) > 6 ? 'text-amber-600 dark:text-amber-400 font-semibold' : (v as number) < 1.5 ? 'text-slate-300 dark:text-zinc-600' : ''}`}>
                    {fmtPct(v as number)}
                  </span>
                )},
              { key: 'annualDividend',       label: 'Jährl.',    align: 'right', render: (v) => fmt(v as number) },
              { key: 'monthlyDividend',      label: 'Ø Monat',   align: 'right', render: (v) => fmt(v as number) },
              { key: 'dividendContribution', label: '% Ertrag',  align: 'right',
                render: (v, row) => (
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-12 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, (row as DepotPosition).dividendContribution)}%` }} />
                    </div>
                    <span>{(v as number).toFixed(1)} %</span>
                  </div>
                )},
              { key: 'ausschuettungsfrequenz', label: 'Frequenz', align: 'center',
                render: (v) => (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-slate-500 dark:text-zinc-400">
                    {String(v)}
                  </span>
                )},
              { key: 'kategorie', label: 'Kategorie' },
            ]}
          />
        </div>
      </Card>

      <Card title="Yield-Ranking" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable
            data={byYield}
            rowKey={(r) => r.symbol}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'yield', label: 'Yield', align: 'right',
                render: (v) => (
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-20 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, (v as number) / (byYield[0]?.yield || 1) * 100)}%` }} />
                    </div>
                    <span className="font-mono tabular-nums">{fmtPct(v as number)}</span>
                  </div>
                )},
              { key: 'cagr5j', label: 'CAGR 5J', align: 'right', render: (v) => fmtPct(v as number) },
              { key: 'wert',   label: 'Wert',     align: 'right', render: (v) => fmt(v as number) },
              { key: 'typ',    label: 'Typ',       align: 'center' },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
