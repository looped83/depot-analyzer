import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { ChartTooltip } from '../ChartTooltip';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct, fmtNum } from '../../lib/format';
import { PALETTE, AXIS, GRID, BAR_CURSOR } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

const ZYKLUS_LABEL: Record<number, string> = { 0: 'Kein Sparplan', 1: 'Zyklus 1', 2: 'Zyklus 2', 3: 'Zyklus 3' };

export function SavingsTab({ positions }: Props) {
  const saved = positions.filter((p) => p.sparbetrag > 0);
  const totalSpar = positions.reduce((s, p) => s + p.sparbetrag, 0);
  const totalWert = positions.reduce((s, p) => s + p.wert, 0);

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

  const active = positions.filter(p => p.wert > 0);
  const aufbauPositions = positions.filter(p => p.status === 'Aufbau');
  const aufbauSaved = aufbauPositions.filter(p => p.sparbetrag > 0);
  const prioAPositions = positions.filter(p => p.prio === 'A');
  const prioASaved = prioAPositions.filter(p => p.sparbetrag > 0);

  const sparPerPrio = saved.reduce((acc, p) => {
    const prio = p.prio ?? 'Keine';
    acc.set(prio, (acc.get(prio) ?? 0) + p.sparbetrag);
    return acc;
  }, new Map<string, number>());

  const prioASpar = sparPerPrio.get('A') ?? 0;
  const prioBSpar = sparPerPrio.get('B') ?? 0;
  const highPrioPct = totalSpar > 0 ? ((prioASpar + prioBSpar) / totalSpar * 100) : 0;

  const efficiencyScore = Math.min(100, Math.round(
    (aufbauPositions.length > 0 ? (aufbauSaved.length / aufbauPositions.length) * 30 : 30) +
    (prioAPositions.length > 0 ? (prioASaved.length / prioAPositions.length) * 30 : 30) +
    (highPrioPct > 60 ? 20 : highPrioPct > 30 ? 10 : 0) +
    (saved.length >= 5 ? 10 : saved.length >= 3 ? 5 : 0) +
    (overweight.length === 0 ? 10 : 0)
  ));

  const EXTRA_MONTHLY = 3000;
  const totalMonthlyInvest = totalSpar + EXTRA_MONTHLY;

  const avgYieldSaved = saved.length > 0 ? saved.reduce((s, p) => s + p.yield, 0) / saved.length : 0;
  const futureYears = [1, 3, 5, 10];
  const growthRate = 0.06;
  const futureProjection = futureYears.map(y => {
    let value = 0;
    for (let m = 0; m < y * 12; m++) {
      value = (value + totalMonthlyInvest) * (1 + growthRate / 12);
    }
    const addedDiv = value * (avgYieldSaved / 100);
    return { year: y, label: `${y}J`, value, addedDiv };
  });

  const growthChart = Array.from({ length: 61 }, (_, m) => {
    let v = 0;
    for (let i = 0; i < m; i++) v = (v + totalMonthlyInvest) * (1 + growthRate / 12);
    return { month: m, value: v, label: m % 12 === 0 ? `${m / 12}J` : '' };
  }).filter((_, i) => i % 3 === 0);

  const noSparHighPrio = positions.filter(p =>
    p.prio && ['A', 'B'].includes(p.prio) && p.status === 'Aufbau' && p.sparbetrag === 0
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Gesamte Sparrate"   value={`${fmtNum(totalSpar)} €`}    sub="Pro Zyklus" info="Summe aller aktiven Sparplanbeträge pro Ausführungszyklus." />
        <KPICard title="Aktive Sparpläne"   value={fmtNum(saved.length)}       sub={`von ${fmtNum(positions.length)} Positionen`} />
        <KPICard title="Ø Sparbetrag"       value={`${saved.length > 0 ? fmtNum(Math.round(totalSpar / saved.length)) : 0} €`} sub="Pro Position" />
        <KPICard title="Reinvestition/Jahr" value={fmt(totalSpar * 12)}        sub="Hochrechnung (12 Monate)" info="Monatliche Sparrate hochgerechnet auf 12 Monate." />
        <KPICard title="Sparquote"          value={totalWert > 0 ? fmtPct((totalSpar * 12 / totalWert) * 100, 1) : '—'} sub="Jährl. Sparrate / Depotwert" info="Verhältnis der jährlichen Sparrate zum aktuellen Depotwert. Höhere Werte beschleunigen den Vermögensaufbau." />
        <KPICard title="Effizienz-Score"    value={fmtNum(efficiencyScore)}     sub={efficiencyScore >= 70 ? 'Gut ausgerichtet' : 'Optimierbar'} info="Bewertet wie gut die Sparpläne auf Prioritäten und Aufbau-Positionen ausgerichtet sind (0-100)." />
      </div>

      {/* Sparplan Efficiency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Aufbau-Abdeckung</div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${aufbauSaved.length === aufbauPositions.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {aufbauSaved.length} / {aufbauPositions.length}
            </span>
            <span className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Aufbau-Positionen bespart</span>
          </div>
          <div className="mt-2 w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${aufbauPositions.length > 0 ? (aufbauSaved.length / aufbauPositions.length * 100) : 0}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Prio-A Abdeckung</div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${prioASaved.length === prioAPositions.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {prioASaved.length} / {prioAPositions.length}
            </span>
            <span className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Prio-A-Positionen bespart</span>
          </div>
          <div className="mt-2 w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full"
              style={{ width: `${prioAPositions.length > 0 ? (prioASaved.length / prioAPositions.length * 100) : 0}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Fokus auf High-Prio</div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${highPrioPct > 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {fmtNum(highPrioPct)} %
            </span>
            <span className="text-xs text-slate-400 dark:text-zinc-500 mb-1">des Kapitals in Prio A/B</span>
          </div>
          <div className="mt-2 w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${highPrioPct}%` }} />
          </div>
        </div>
      </div>

      {/* Future Value Projection */}
      {totalSpar > 0 && (
        <Card title="Sparplan-Zukunftsprojektion" sub={`Sparrate ${fmtNum(totalSpar)} € + 3.000 € Einmalkäufe = ${fmtNum(totalMonthlyInvest)} €/Monat · 6 % Wachstum p.a.`}>
          <div className="grid grid-cols-4 gap-3 mt-3 mb-3">
            {futureProjection.map(f => (
              <div key={f.year} className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3 text-center">
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-1">In {f.year} {f.year === 1 ? 'Jahr' : 'Jahren'}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(f.value)}</div>
                <div className="text-xs text-slate-400 dark:text-zinc-500">+ {fmt(f.addedDiv)} Div/Jahr</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={growthChart} margin={{ top: 4, right: 20, bottom: 10 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="month" {...AXIS} tickFormatter={(v) => `${fmtNum(v / 12)}J`}
                ticks={[0, 12, 24, 36, 48, 60]} />
              <YAxis {...AXIS} tickFormatter={(v) => `${fmtNum(v / 1000)}k`} />
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => fmt(v as number)} labelFormatter={(l) => `Monat ${l}`} />} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Optimization suggestions */}
      {noSparHighPrio.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Optimierung: Prio A/B ohne Sparplan ({noSparHighPrio.length})</p>
          <p className="text-xs text-blue-600/70 dark:text-blue-300/60 mb-2">
            Diese hoch priorisierten Aufbau-Positionen werden nicht bespart. Ein Sparplan würde den Vermögensaufbau beschleunigen.
          </p>
          <div className="flex flex-wrap gap-2">
            {noSparHighPrio.map(p => (
              <span key={p.symbol} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-mono">
                {p.symbol} (Prio {p.prio}) · Yield {fmtPct(p.yield)}
              </span>
            ))}
          </div>
        </div>
      )}

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
              <Tooltip cursor={BAR_CURSOR} content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} €`} />} />
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
                {p.symbol} ({fmtPct(p.portfolioWeight, 1)}, {fmtNum(p.sparbetrag)} €)
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
                {p.symbol} – {p.name} ({fmtPct(p.portfolioWeight, 1)})
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
