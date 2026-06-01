import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card, StatusBadge, PrioBadge } from '../Card';
import { computeTotals } from '../../lib/calculations';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct } from '../../lib/format';

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#ef4444','#6366f1'];
interface Props { positions: DepotPosition[] }

function aggregateBy(positions: DepotPosition[], key: keyof DepotPosition) {
  const map = new Map<string, number>();
  for (const p of positions) { const k = String(p[key] ?? '—'); map.set(k, (map.get(k) ?? 0) + p.wert); }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

const Tip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) =>
  active && payload?.length ? (
    <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700 dark:text-zinc-300">{payload[0].name}</p>
      <p className="text-slate-400">{fmt(payload[0].value)}</p>
    </div>
  ) : null;

export function OverviewTab({ positions }: Props) {
  const totals = computeTotals(positions);
  const byWert = [...positions].sort((a, b) => b.wert - a.wert);
  const top10  = byWert.slice(0, 10);
  const top5W  = top10.slice(0, 5).reduce((s, p) => s + p.portfolioWeight, 0);
  const top10W = top10.reduce((s, p) => s + p.portfolioWeight, 0);
  const aufbau = positions.filter((p) => p.status === 'Aufbau');
  const erledigt = positions.filter((p) => p.status === 'Erledigt');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Gesamtwert"      value={fmt(totals.totalWert)}        sub="Alle Positionen" />
        <KPICard title="Positionen"       value={String(positions.length)}      sub={`${aufbau.length} Aufbau · ${erledigt.length} Erledigt`} />
        <KPICard title="Depot-Yield"      value={fmtPct(totals.weightedYield)}  sub="Gewichtet" />
        <KPICard title="Jährl. Dividende" value={fmt(totals.totalAnnualDiv)}    sub="Brutto, aktuell" />
        <KPICard title="Ø Monat"          value={fmt(totals.totalMonthlyDiv)}   sub="Dividende / 12" />
        <KPICard title="Sparrate"         value={`${totals.totalSparbetrag} €`} sub="Pro Zyklus" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className={top5W > 50 ? 'border-amber-200 dark:border-amber-800/50' : ''}>
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Konzentrationsrisiko Top 5</div>
          <div className="text-3xl font-semibold text-slate-900 dark:text-white">{top5W.toFixed(1)} %</div>
          <div className={`mt-1 text-xs ${top5W > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-zinc-500'}`}>
            {top5W > 50 ? '⚠ Erhöhtes Klumpenrisiko' : '✓ Im normalen Bereich'}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Top 10 Gewichtung</div>
          <div className="text-3xl font-semibold text-slate-900 dark:text-white">{top10W.toFixed(1)} %</div>
          <div className="mt-1 text-xs text-slate-400 dark:text-zinc-500">von {positions.length} Positionen</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ title: 'Kategorie', data: aggregateBy(positions,'kategorie') },
          { title: 'Broker',    data: aggregateBy(positions,'broker') },
          { title: 'Typ',       data: aggregateBy(positions,'typ') }].map(({ title, data }) => (
          <Card key={title} title={`Nach ${title}`}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={68} innerRadius={38} paddingAngle={2} strokeWidth={0}>
                  {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<Tip />} />
                <Legend iconSize={7} iconType="circle" formatter={(v) => <span className="text-xs text-slate-500 dark:text-zinc-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      <Card title="Depotwert je Broker">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={aggregateBy(positions,'broker')} layout="vertical" margin={{ left: 0, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={30} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={18}>
              {aggregateBy(positions,'broker').map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top 10 nach Depotwert" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable data={top10} rowKey={(r) => r.symbol} columns={[
            { key: 'symbol', label: 'Symbol', width: '80px', render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
            { key: 'name', label: 'Name' },
            { key: 'kategorie', label: 'Kategorie' },
            { key: 'broker', label: 'Broker', align: 'center' },
            { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
            { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v, row) => (
              <div className="flex items-center gap-2 justify-end">
                <div className="w-14 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100,(row as DepotPosition).portfolioWeight/(top10[0]?.portfolioWeight||1)*100)}%` }} />
                </div>
                <span>{(v as number).toFixed(1)} %</span>
              </div>
            )},
            { key: 'yield', label: 'Yield', align: 'right', render: (v) => fmtPct(v as number) },
            { key: 'status', label: 'Status', align: 'center', render: (v) => <StatusBadge status={String(v)} /> },
          ]} />
        </div>
      </Card>

      <Card title="Alle Positionen" pad={false}>
        <div className="px-5 pb-5">
          <SortableTable data={byWert} rowKey={(r) => r.symbol}
            filterKeys={['symbol','name','broker','kategorie','status']}
            columns={[
              { key: 'symbol', label: 'Symbol', width: '80px', render: (v) => <span className="font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">{String(v)}</span> },
              { key: 'name', label: 'Name' },
              { key: 'broker', label: 'Broker', align: 'center' },
              { key: 'typ', label: 'Typ', align: 'center' },
              { key: 'kategorie', label: 'Kategorie' },
              { key: 'wert', label: 'Wert', align: 'right', render: (v) => fmt(v as number) },
              { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v) => `${(v as number).toFixed(1)} %` },
              { key: 'prio', label: 'Prio', align: 'center', render: (v) => <PrioBadge prio={v as string|null} /> },
              { key: 'status', label: 'Status', align: 'center', render: (v) => <StatusBadge status={String(v)} /> },
            ]} />
        </div>
      </Card>
    </div>
  );
}
