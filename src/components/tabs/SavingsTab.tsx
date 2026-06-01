import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { ChartTooltip } from '../ChartTooltip';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';
import { PALETTE, AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

const ZYKLUS_LABEL: Record<number, string> = { 0: 'Kein Sparplan', 1: 'Zyklus 1', 2: 'Zyklus 2', 3: 'Zyklus 3' };

export function SavingsTab({ positions }: Props) {
  const saved = positions.filter((p) => p.sparbetrag > 0);
  const totalSpar = positions.reduce((s, p) => s + p.sparbetrag, 0);

  const brokerMap = new Map<string, number>();
  for (const p of saved) {
    brokerMap.set(p.broker, (brokerMap.get(p.broker) ?? 0) + p.sparbetrag);
  }
  const byBroker = [...brokerMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const zyklusMap = new Map<string, number>();
  for (const p of saved) {
    const label = p.zyklus !== null ? (ZYKLUS_LABEL[p.zyklus] ?? `Zyklus ${p.zyklus}`) : 'Kein Zyklus';
    zyklusMap.set(label, (zyklusMap.get(label) ?? 0) + p.sparbetrag);
  }
  const byZyklus = [...zyklusMap.entries()].map(([name, value]) => ({ name, value }));

  const overweight = saved.filter((p) => p.portfolioWeight > 5).sort((a, b) => b.portfolioWeight - a.portfolioWeight);
  const underweightQuality = positions
    .filter((p) => p.prio === 'A' && p.status === 'Aufbau' && p.portfolioWeight < 3)
    .sort((a, b) => b.dividendScore - a.dividendScore);

  const bySpar = [...saved].sort((a, b) => b.sparbetrag - a.sparbetrag);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Gesamte Sparrate"   value={`${totalSpar} €`}                                       sub="Pro Zyklus" />
        <KPICard title="Aktive Sparpläne"   value={String(saved.length)}                                   sub={`von ${positions.length} Positionen`} />
        <KPICard title="Ø Sparbetrag"       value={`${saved.length > 0 ? (totalSpar / saved.length).toFixed(0) : 0} €`} sub="Pro Position" />
        <KPICard title="Reinvestition/Jahr" value={fmt(totalSpar * 12)}                                    sub="Hochrechnung (12 Monate)" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Sparrate je Broker">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byBroker} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={70} innerRadius={32} paddingAngle={2} strokeWidth={0}>
                {byBroker.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} €`} />} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Sparrate je Zyklus">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byZyklus} margin={{ bottom: 10, top: 4, right: 8 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={(v) => `${v} €`} />
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} €`} />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {byZyklus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {overweight.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Mögliche Übergewichtungen (weiterhin bespart)</p>
          <div className="flex flex-wrap gap-2">
            {overweight.map((p) => (
              <span key={p.symbol} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-mono">
                {p.symbol} ({p.portfolioWeight.toFixed(1)}%, {p.sparbetrag}€)
              </span>
            ))}
          </div>
        </div>
      )}

      {underweightQuality.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Untergewichtete Qualitätspositionen (Prio A, &lt;3% Gewicht)</p>
          <div className="flex flex-wrap gap-2">
            {underweightQuality.map((p) => (
              <span key={p.symbol} className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded-full font-mono">
                {p.symbol} – {p.name} ({p.portfolioWeight.toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      <Card title="Sparplan-Ranking – Kapitalfluss" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable
            data={bySpar}
            rowKey={(r) => r.symbol}
            filterKeys={['symbol', 'name', 'broker', 'prio']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px',
                render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'broker', label: 'Broker', align: 'center' },
              { key: 'prio', label: 'Prio', align: 'center',
                render: (v) => (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    v === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                    v === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                    v === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                    v === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                    v === 'E' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                    'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                  }`}>{String(v || '—')}</span>
                )},
              { key: 'sparbetrag', label: 'Sparbetrag (€)', align: 'right',
                render: (v) => (
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-16 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (v as number) / (bySpar[0]?.sparbetrag || 1) * 100)}%` }} />
                    </div>
                    <span className="font-mono tabular-nums">{String(v)} €</span>
                  </div>
                )},
              { key: 'zyklus', label: 'Zyklus', align: 'center',
                render: (v) => <span>{v !== null ? String(v) : '—'}</span> },
              { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v) => fmtPct(v as number) },
              { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
              { key: 'dividendScore', label: 'D-Score', align: 'center',
                render: (v) => (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg tabular-nums ${
                    (v as number) >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                    (v as number) >= 50 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' :
                    'bg-slate-50 dark:bg-zinc-800 text-slate-400'
                  }`}>{String(v)}</span>
                )},
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
