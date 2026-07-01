import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { ChartTooltip } from '../ChartTooltip';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';
import { AXIS, GRID, BAR_CURSOR } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

export function PerformanceTab({ positions }: Props) {
  const withCostBasis = positions.filter((p) => p.einstandswert > 0);
  const missingCostBasis = positions.filter((p) => p.wert > 0 && p.einstandswert <= 0).length;

  if (withCostBasis.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-1">Keine Kaufkurs-Daten vorhanden</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-md mx-auto">
          Ergänze die Spalten „Kaufkurs" (Kaufpreis pro Anteil) und „Stückzahl" in deiner Depot-Datei,
          um hier Gewinn und Verlust je Position auszuwerten.
        </p>
      </div>
    );
  }

  const totalEinstand = withCostBasis.reduce((s, p) => s + p.einstandswert, 0);
  const totalWert = withCostBasis.reduce((s, p) => s + p.wert, 0);
  const totalGewinnVerlust = totalWert - totalEinstand;
  const totalGewinnVerlustPct = totalEinstand > 0 ? (totalGewinnVerlust / totalEinstand) * 100 : 0;

  const winners = withCostBasis.filter((p) => p.gewinnVerlust > 0);
  const losers = withCostBasis.filter((p) => p.gewinnVerlust < 0);

  const sortedByPct = [...withCostBasis].sort((a, b) => b.gewinnVerlustPct - a.gewinnVerlustPct);
  const TOP_N = 10;
  const topWinners = [...winners].sort((a, b) => b.gewinnVerlust - a.gewinnVerlust).slice(0, TOP_N);
  const topLosers = [...losers].sort((a, b) => a.gewinnVerlust - b.gewinnVerlust).slice(0, TOP_N);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Einstandswert" value={fmt(totalEinstand)} sub={`${withCostBasis.length} Positionen mit Kaufkurs`} info="Summe aus Kaufkurs × Stückzahl über alle Positionen mit hinterlegtem Kaufkurs." />
        <KPICard title="Aktueller Wert" value={fmt(totalWert)} sub="Zum Kurs von heute" />
        <KPICard title="Gewinn / Verlust" value={fmt(totalGewinnVerlust)} sub={fmtPct(totalGewinnVerlustPct)} info="Aktueller Wert minus Einstandswert, über alle Positionen mit Kaufkurs." />
        <KPICard title="Gewinner / Verlierer" value={`${winners.length} / ${losers.length}`} sub="Positionen im Plus / Minus" />
      </div>

      {missingCostBasis > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Unvollständige Kaufkurs-Daten</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-300/60">
            {missingCostBasis} {missingCostBasis === 1 ? 'Position hat' : 'Positionen haben'} keinen hinterlegten
            Kaufkurs oder keine Stückzahl und {missingCostBasis === 1 ? 'wird' : 'werden'} in dieser Auswertung nicht berücksichtigt.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Top Gewinner" sub={`Größter Gewinn zuerst${winners.length > TOP_N ? ` · Top ${TOP_N} von ${winners.length}` : ''}`}>
          {topWinners.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(140, topWinners.length * 26)}>
              <BarChart data={topWinners} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid {...GRID} horizontal={false} />
                <XAxis type="number" {...AXIS} tickFormatter={(v) => fmt(v as number)} />
                <YAxis type="category" dataKey="symbol" {...AXIS} width={52} />
                <Tooltip cursor={BAR_CURSOR} content={(props) => <ChartTooltip {...props} formatter={(v) => fmt(v as number)} />} />
                <Bar dataKey="gewinnVerlust" fill="#10b981" fillOpacity={0.85} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 dark:text-zinc-500 text-center py-8">Keine Positionen im Plus.</p>
          )}
        </Card>

        <Card title="Top Verlierer" sub={`Größter Verlust zuerst${losers.length > TOP_N ? ` · Top ${TOP_N} von ${losers.length}` : ''}`}>
          {topLosers.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(140, topLosers.length * 26)}>
              <BarChart data={topLosers} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid {...GRID} horizontal={false} />
                <XAxis type="number" {...AXIS} tickFormatter={(v) => fmt(v as number)} />
                <YAxis type="category" dataKey="symbol" {...AXIS} width={52} />
                <Tooltip cursor={BAR_CURSOR} content={(props) => <ChartTooltip {...props} formatter={(v) => fmt(v as number)} />} />
                <Bar dataKey="gewinnVerlust" fill="#ef4444" fillOpacity={0.85} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 dark:text-zinc-500 text-center py-8">Keine Positionen im Minus.</p>
          )}
        </Card>
      </div>

      <Card title="Performance je Position" pad={false}>
        <div className="px-5 pt-3 pb-5">
          <SortableTable
            data={sortedByPct}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'kaufkurs', label: 'Kaufkurs', align: 'right', render: (v) => fmt(v as number, 2) },
              { key: 'aktuellerKurs', label: 'Kurs aktuell', align: 'right', render: (v) => fmt(v as number, 2) },
              { key: 'einstandswert', label: 'Einstand', align: 'right', render: (v) => fmt(v as number) },
              { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
              { key: 'gewinnVerlust', label: 'G/V (€)', align: 'right',
                render: (v) => (
                  <span className={`font-mono tabular-nums font-semibold ${(v as number) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {fmt(v as number)}
                  </span>
                )},
              { key: 'gewinnVerlustPct', label: 'G/V (%)', align: 'right',
                render: (v) => (
                  <span className={`font-mono tabular-nums font-semibold ${(v as number) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {fmtPct(v as number)}
                  </span>
                )},
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
