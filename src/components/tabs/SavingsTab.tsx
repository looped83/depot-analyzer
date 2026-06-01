import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';

interface Props { positions: DepotPosition[] }

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16'];

const ZYKLUS_LABEL: Record<number, string> = { 0: 'Kein Sparplan', 1: 'Zyklus 1', 2: 'Zyklus 2', 3: 'Zyklus 3' };

export function SavingsTab({ positions }: Props) {
  const saved = positions.filter((p) => p.sparbetrag > 0);
  const totalSpar = positions.reduce((s, p) => s + p.sparbetrag, 0);

  // By broker
  const brokerMap = new Map<string, number>();
  for (const p of saved) {
    brokerMap.set(p.broker, (brokerMap.get(p.broker) ?? 0) + p.sparbetrag);
  }
  const byBroker = [...brokerMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // By zyklus
  const zyklusMap = new Map<string, number>();
  for (const p of saved) {
    const label = p.zyklus !== null ? (ZYKLUS_LABEL[p.zyklus] ?? `Zyklus ${p.zyklus}`) : 'Kein Zyklus';
    zyklusMap.set(label, (zyklusMap.get(label) ?? 0) + p.sparbetrag);
  }
  const byZyklus = [...zyklusMap.entries()].map(([name, value]) => ({ name, value }));

  // By prio
  const prioMap = new Map<string, number>();
  for (const p of saved) {
    const label = p.prio ?? 'Keine Prio';
    prioMap.set(label, (prioMap.get(label) ?? 0) + p.sparbetrag);
  }

  // Overweight candidates (large portfolio weight, still being saved)
  const totalWert = positions.reduce((s, p) => s + p.wert, 0);
  const overweight = saved
    .filter((p) => p.portfolioWeight > 5)
    .sort((a, b) => b.portfolioWeight - a.portfolioWeight);

  // Underweight quality (Prio A, Aufbau, but low weight)
  const underweightQuality = positions
    .filter((p) => p.prio === 'A' && p.status === 'Aufbau' && p.portfolioWeight < 3)
    .sort((a, b) => b.dividendScore - a.dividendScore);

  const bySpar = [...saved].sort((a, b) => b.sparbetrag - a.sparbetrag);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Gesamte Sparrate" value={`${totalSpar} €`} sub="Pro Zyklus" color="blue" />
        <KPICard title="Aktive Sparpläne" value={String(saved.length)} sub={`von ${positions.length} Positionen`} color="teal" />
        <KPICard title="Ø Sparbetrag" value={`${saved.length > 0 ? (totalSpar / saved.length).toFixed(0) : 0} €`} sub="Pro Position" color="green" />
        <KPICard title="Reinvestition/Jahr" value={fmt(totalSpar * 12)} sub="Hochrechnung (12 Monate)" color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Broker Pie */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">Sparrate je Broker</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byBroker} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={2}>
                {byBroker.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => `${v} €`} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Zyklus Bar */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">Sparrate je Zyklus</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byZyklus} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(v: unknown) => [`${v} €`, 'Sparbetrag']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {byZyklus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rebalancing Hints */}
      {overweight.length > 0 && (
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10 p-4">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">⚠️ Mögliche Übergewichtungen (weiterhin bespart)</h3>
          <div className="flex flex-wrap gap-2">
            {overweight.map((p) => (
              <span key={p.symbol} className="text-xs bg-yellow-100 dark:bg-yellow-800/40 text-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                {p.symbol} ({p.portfolioWeight.toFixed(1)}%, {p.sparbetrag}€)
              </span>
            ))}
          </div>
        </div>
      )}

      {underweightQuality.length > 0 && (
        <div className="rounded-xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10 p-4">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">✅ Untergewichtete Qualitätspositionen (Prio A, &lt;3% Gewicht)</h3>
          <div className="flex flex-wrap gap-2">
            {underweightQuality.map((p) => (
              <span key={p.symbol} className="text-xs bg-green-100 dark:bg-green-800/40 text-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                {p.symbol} – {p.name} ({p.portfolioWeight.toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full savings table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">Sparplan-Ranking – Kapitalfluss</h3>
        <SortableTable
          data={bySpar}
          rowKey={(r) => r.symbol}
          filterKeys={['symbol', 'name', 'broker', 'prio']}
          columns={[
            { key: 'symbol', label: 'Symbol', width: '80px' },
            { key: 'name', label: 'Name' },
            { key: 'broker', label: 'Broker', align: 'center' },
            { key: 'prio', label: 'Prio', align: 'center', render: (v) => (
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                v === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                v === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                v === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                v === 'D' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                'bg-gray-100 text-gray-600'
              }`}>{String(v || '—')}</span>
            )},
            { key: 'sparbetrag', label: 'Sparbetrag (€)', align: 'right', render: (v, _row) => (
              <div className="flex items-center gap-2 justify-end">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (v as number) / (bySpar[0]?.sparbetrag || 1) * 100)}%` }} />
                </div>
                <span className="font-mono">{String(v)} €</span>
              </div>
            )},
            { key: 'zyklus', label: 'Zyklus', align: 'center', render: (v) => <span>{v !== null ? String(v) : '—'}</span> },
            { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v) => fmtPct(v as number) },
            { key: 'wert', label: 'Wert (€)', align: 'right', render: (v) => fmt(v as number) },
            { key: 'dividendScore', label: 'D-Score', align: 'center', render: (v) => (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${(v as number) >= 75 ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : (v as number) >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>{String(v)}</span>
            )},
          ]}
        />
      </div>
    </div>
  );
}
