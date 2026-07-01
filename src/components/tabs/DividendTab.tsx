import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card, PageHeading } from '../Card';
import { ChartTooltip } from '../ChartTooltip';
import { computeTotals } from '../../lib/calculations';
import { computeFreibetrag } from '../../lib/insights';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct, fmtNum } from '../../lib/format';
import { PALETTE, AXIS, GRID, BAR_CURSOR } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

export function DividendTab({ positions }: Props) {
  const [divSearch, setDivSearch] = useState('');
  const totals   = computeTotals(positions);
  const freibetragInfo = computeFreibetrag(positions);
  const active   = positions.filter((p) => p.wert > 0);
  const byDiv    = [...active].sort((a, b) => b.annualDividend - a.annualDividend);
  const byYield  = [...active].sort((a, b) => b.yield - a.yield);
  const top15    = byDiv.slice(0, 15);

  const incomeDiv = active.filter((p) => ['Income','High Yield'].includes(p.kategorie))
                         .reduce((s, p) => s + p.annualDividend, 0);
  const growthDiv = totals.totalAnnualDiv - incomeDiv;
  const incomePct = totals.totalAnnualDiv > 0 ? (incomeDiv / totals.totalAnnualDiv) * 100 : 50;
  const growthPct = 100 - incomePct;

  const highYield = active.filter((p) => p.yield > 6);
  const lowYield  = active.filter((p) => p.yield > 0 && p.yield < 1.5);

  const netAnnualDiv = freibetragInfo.annualDiv - freibetragInfo.taxAmount;
  const divPerThousand = totals.totalWert > 0 ? (totals.totalAnnualDiv / totals.totalWert) * 1000 : 0;
  const weightedChowder = totals.totalWert > 0
    ? active.reduce((s, p) => s + p.chowderScore * (p.wert / totals.totalWert), 0) : 0;

  const topGrowers = [...active].filter(p => p.cagr5j > 0).sort((a, b) => b.cagr5j - a.cagr5j).slice(0, 5);
  const divChampions = [...active].filter(p => p.chowderScore >= 12).sort((a, b) => b.chowderScore - a.chowderScore);

  const freqDistrib = [
    { name: 'Monatlich', value: active.filter(p => p.ausschuettungsfrequenz === 'monatlich').reduce((s, p) => s + p.annualDividend, 0) },
    { name: 'Quartalsweise', value: active.filter(p => p.ausschuettungsfrequenz === 'quartalsweise').reduce((s, p) => s + p.annualDividend, 0) },
    { name: 'Jährlich', value: active.filter(p => p.ausschuettungsfrequenz === 'jährlich').reduce((s, p) => s + p.annualDividend, 0) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      <PageHeading title="Dividenden-Analyse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Brutto / Jahr"       value={fmt(totals.totalAnnualDiv)}    sub="Vor Steuern" info="Jährliche Dividende vor Abzug von Kapitalertragsteuer und Solidaritätszuschlag." />
        <KPICard title="Netto / Jahr"         value={fmt(netAnnualDiv)}             sub={freibetragInfo.taxAmount > 0 ? `${fmt(freibetragInfo.taxAmount)} Steuer` : 'Kein Steuerabzug'} info="Nach Abzug von 26,375 % KapESt + SolZ auf den Betrag über dem Sparerpauschbetrag (2.000 €, verheiratet)." />
        <KPICard title="Netto / Monat"        value={fmt(netAnnualDiv / 12)}        sub="Nach Steuer" />
        <KPICard title="Depot-Yield"          value={fmtPct(totals.weightedYield)}  sub="Gewichtet" info="Nach Depotwert gewichtete Dividendenrendite. Große Positionen beeinflussen den Wert stärker." />
        <KPICard title="Dividende je 1.000 €" value={fmt(divPerThousand)}           sub="Effizienz-Kennzahl" info="Wie viel Dividende du pro 1.000 € investiertem Kapital erhältst." />
        <KPICard title="Ø Chowder Score"      value={fmtNum(weightedChowder, 1)}    sub={weightedChowder >= 12 ? 'Gut' : 'Ausbaufähig'} info="Chowder Score = Yield + CAGR 5J. Werte ab 12 gelten als attraktiv." />
      </div>

      {/* Tax and Freibetrag overview */}
      <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Steuer & Sparerpauschbetrag</div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
            freibetragInfo.remaining > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}>{freibetragInfo.remaining > 0 ? `${fmt(freibetragInfo.remaining)} frei` : 'Ausgeschöpft'}</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${
            freibetragInfo.remaining > 0 ? 'bg-emerald-500' : 'bg-amber-500'
          }`} style={{ width: `${Math.min(100, (freibetragInfo.used / freibetragInfo.freibetrag) * 100)}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div>
            <div className="text-slate-400 dark:text-zinc-500">Brutto</div>
            <div className="font-semibold text-slate-700 dark:text-zinc-300">{fmt(freibetragInfo.annualDiv)}</div>
          </div>
          <div>
            <div className="text-slate-400 dark:text-zinc-500">Freibetrag</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(freibetragInfo.used)}</div>
          </div>
          <div>
            <div className="text-slate-400 dark:text-zinc-500">Steuerpflichtig</div>
            <div className="font-semibold text-slate-700 dark:text-zinc-300">{fmt(freibetragInfo.taxable)}</div>
          </div>
          <div>
            <div className="text-slate-400 dark:text-zinc-500">KapESt + SolZ</div>
            <div className="font-semibold text-red-500">{fmt(freibetragInfo.taxAmount)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Income vs. Growth">
          <div className="mt-3">
            <div className="w-full h-2.5 rounded-full overflow-hidden flex">
              <div className="bg-amber-400 transition-all" style={{ width: `${incomePct}%` }} />
              <div className="bg-blue-500 flex-1" />
            </div>
            <div className="flex justify-between mt-3 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
                  <span className="text-xs text-slate-500 dark:text-zinc-400">Income / High Yield</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">{fmt(incomeDiv)}</div>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">{fmtPct(incomePct, 1)} der Dividende</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="text-xs text-slate-500 dark:text-zinc-400">Growth / Accum.</span>
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">{fmt(growthDiv)}</div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{fmtPct(growthPct, 1)} der Dividende</div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Dividende nach Frequenz">
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={freqDistrib} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={45} innerRadius={22} paddingAngle={2} strokeWidth={0}>
                {freqDistrib.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => fmt(v as number)} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 text-xs text-slate-400 dark:text-zinc-500">
            {freqDistrib.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                {d.name}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Yield-Ausreißer" info="Positionen mit ungewöhnlich hohem (> 6 %) oder niedrigem (< 1,5 %) Yield im Vergleich zum Depot-Durchschnitt.">
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                High Yield &gt; 6 % ({highYield.length})
              </div>
              {highYield.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {highYield.map((p) => (
                    <span key={p.symbol} className="text-xs font-mono bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg">
                      {p.symbol} <span className="opacity-60">{fmtPct(p.yield, 1)}</span>
                    </span>
                  ))}
                </div>
              ) : <span className="text-xs text-slate-300 dark:text-zinc-600">—</span>}
            </div>
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
              <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-600" />
                Low Yield &lt; 1,5 % ({lowYield.length})
              </div>
              {lowYield.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {lowYield.map((p) => (
                    <span key={p.symbol} className="text-xs font-mono bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded-lg">
                      {p.symbol} <span className="opacity-60">{fmtPct(p.yield, 1)}</span>
                    </span>
                  ))}
                </div>
              ) : <span className="text-xs text-slate-300 dark:text-zinc-600">—</span>}
            </div>
          </div>
        </Card>
      </div>

      {/* Dividend Growth Stars */}
      {topGrowers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card title="Top Dividendenwachstum (CAGR 5J)" sub="Positionen mit stärkstem historischem Wachstum">
            <div className="space-y-2 mt-2">
              {topGrowers.map((p, i) => (
                <div key={p.symbol} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 dark:text-zinc-600 w-4">{i + 1}</span>
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-zinc-200 w-12">{p.symbol}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (p.cagr5j / (topGrowers[0]?.cagr5j || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 w-14 text-right">{fmtPct(p.cagr5j)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title={`Chowder Champions (${divChampions.length})`} sub="Yield + CAGR ≥ 12 = starke Gesamtrendite">
            {divChampions.length > 0 ? (
              <div className="space-y-2 mt-2">
                {divChampions.slice(0, 8).map(p => (
                  <div key={p.symbol} className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-violet-700 dark:text-violet-300 w-12 shrink-0">{p.symbol}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.min(100, (p.chowderScore / 25) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-semibold text-violet-700 dark:text-violet-300 w-8 text-right shrink-0">{fmtNum(p.chowderScore, 1)}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 w-24 text-right shrink-0">{fmtPct(p.yield, 1)} + {fmtPct(p.cagr5j, 1)}</span>
                  </div>
                ))}
                {divChampions.length > 8 && (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 text-center pt-1">+{divChampions.length - 8} weitere</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">Keine Positionen mit Chowder ≥ 12</p>
            )}
          </Card>
        </div>
      )}

      <Card title="Top Dividendenbeiträger – Jährlich">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top15} margin={{ bottom: 28, top: 4, right: 8 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis dataKey="symbol" {...AXIS} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={(v) => `${fmtNum(v)} €`} {...AXIS} />
            <Tooltip cursor={BAR_CURSOR}
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

      <Card
        title="Dividendenanalyse – Alle Positionen"
        pad={false}
        headerRight={
          <input
            className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500/40 placeholder-zinc-600 text-zinc-200 w-36"
            placeholder="Suchen …"
            value={divSearch}
            onChange={(e) => setDivSearch(e.target.value)}
          />
        }
      >
        <div className="px-5 pt-3 pb-5">
          <SortableTable
            data={byDiv}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'kategorie']}
            filter={divSearch}
            onFilterChange={setDivSearch}
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
                    <span>{fmtPct(v as number, 1)}</span>
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
        <div className="px-5 pt-3 pb-5">
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
