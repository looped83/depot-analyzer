import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { computeTotals } from '../../lib/calculations';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';

const COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#84cc16','#f97316','#ec4899','#6b7280',
];

interface Props { positions: DepotPosition[] }

function aggregateBy(positions: DepotPosition[], key: keyof DepotPosition) {
  const map = new Map<string, number>();
  for (const p of positions) {
    const k = String(p[key] ?? 'Unbekannt');
    map.set(k, (map.get(k) ?? 0) + p.wert);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm shadow-lg">
        <p className="font-semibold">{payload[0].name}</p>
        <p>{fmt(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function OverviewTab({ positions }: Props) {
  const totals = computeTotals(positions);
  const byWert = [...positions].sort((a, b) => b.wert - a.wert);
  const top10 = byWert.slice(0, 10);
  const top5Weight = top10.slice(0, 5).reduce((s, p) => s + p.portfolioWeight, 0);
  const top10Weight = top10.reduce((s, p) => s + p.portfolioWeight, 0);

  const byBroker = aggregateBy(positions, 'broker');
  const byKat = aggregateBy(positions, 'kategorie');
  const byTyp = aggregateBy(positions, 'typ');

  const statusCounts = positions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const erledigt = positions.filter((p) => p.status === 'Erledigt');
  const aufbau = positions.filter((p) => p.status === 'Aufbau');

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Gesamtwert" value={fmt(totals.totalWert)} sub="Alle Positionen" color="blue" />
        <KPICard title="Positionen" value={String(positions.length)} sub={`${aufbau.length} Aufbau / ${erledigt.length} Erledigt`} color="teal" />
        <KPICard title="Depot-Yield" value={fmtPct(totals.weightedYield)} sub="Gewichtet" color="green" />
        <KPICard title="Jährl. Dividende" value={fmt(totals.totalAnnualDiv)} sub="Brutto, aktuell" color="green" />
        <KPICard title="Monatl. Ø-Dividende" value={fmt(totals.totalMonthlyDiv)} sub="Ø pro Monat" color="purple" />
        <KPICard title="Gesamte Sparrate" value={`${totals.totalSparbetrag} €`} sub="pro Zyklus" color="yellow" />
      </div>

      {/* Concentration */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl border p-4 ${top5Weight > 50 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-700' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="text-xs uppercase font-semibold opacity-60 mb-1">Konzentrationsrisiko Top 5</div>
          <div className="text-2xl font-bold">{top5Weight.toFixed(1)}%</div>
          <div className="text-xs opacity-60">{top5Weight > 50 ? '⚠️ Erhöhtes Klumpenrisiko' : '✓ Im normalen Bereich'}</div>
        </div>
        <div className="rounded-xl border dark:border-gray-700 p-4">
          <div className="text-xs uppercase font-semibold opacity-60 mb-1">Top 10 Gewichtung</div>
          <div className="text-2xl font-bold">{top10Weight.toFixed(1)}%</div>
          <div className="text-xs opacity-60">von {positions.length} Positionen</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Nach Kategorie', data: byKat },
          { title: 'Nach Broker', data: byBroker },
          { title: 'Nach Typ', data: byTyp },
        ].map(({ title, data }) => (
          <div key={title} className="rounded-xl border dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold mb-3">{title}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => fmt(v as number)} />
                <Legend iconSize={10} formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Broker Bar */}
      <div className="rounded-xl border dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Depotwert je Broker</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={byBroker} layout="vertical" margin={{ left: 10, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {byBroker.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Table */}
      <div className="rounded-xl border dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Top 10 Positionen nach Depotwert</h3>
        <SortableTable
          data={top10}
          rowKey={(r) => r.symbol}
          columns={[
            { key: 'symbol', label: 'Symbol', width: '80px' },
            { key: 'name', label: 'Name' },
            { key: 'kategorie', label: 'Kategorie', width: '100px' },
            { key: 'broker', label: 'Broker', width: '60px', align: 'center' },
            { key: 'wert', label: 'Wert (€)', align: 'right', render: (v) => fmt(v as number) },
            {
              key: 'portfolioWeight',
              label: 'Gewichtung',
              align: 'right',
              render: (v, row) => (
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (row as DepotPosition).portfolioWeight / (top10[0]?.portfolioWeight || 1) * 100)}%` }} />
                  </div>
                  <span>{(v as number).toFixed(1)}%</span>
                </div>
              ),
            },
            { key: 'yield', label: 'Yield %', align: 'right', render: (v) => fmtPct(v as number) },
            { key: 'status', label: 'Status', align: 'center', render: (v) => (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                v === 'Aufbau' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                v === 'Erledigt' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                v === 'Beobachten' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
              }`}>{String(v)}</span>
            )},
          ]}
        />
      </div>

      {/* Full positions table */}
      <div className="rounded-xl border dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Alle Positionen – Größenranking</h3>
        <SortableTable
          data={byWert}
          rowKey={(r) => r.symbol}
          filterKeys={['symbol', 'name', 'broker', 'kategorie', 'status']}
          columns={[
            { key: 'symbol', label: 'Symbol', width: '80px' },
            { key: 'name', label: 'Name' },
            { key: 'broker', label: 'Broker', width: '60px', align: 'center' },
            { key: 'typ', label: 'Typ', width: '60px', align: 'center' },
            { key: 'kategorie', label: 'Kategorie' },
            { key: 'wert', label: 'Wert (€)', align: 'right', render: (v) => fmt(v as number) },
            { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v) => `${(v as number).toFixed(1)}%` },
            { key: 'prio', label: 'Prio', align: 'center', render: (v) => <span>{String(v || '—')}</span> },
            { key: 'status', label: 'Status', align: 'center', render: (v) => (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                v === 'Aufbau' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                v === 'Erledigt' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                v === 'Beobachten' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
              }`}>{String(v)}</span>
            )},
          ]}
        />
      </div>
    </div>
  );
}
