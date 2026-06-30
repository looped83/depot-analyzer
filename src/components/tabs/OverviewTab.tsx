import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { KPICard } from '../KPICard';
import { Card, StatusBadge, PrioBadge } from '../Card';
import { computeTotals, computeMonthlyCalendar } from '../../lib/calculations';
import { computeHealthScore, generateRecommendations, computeFreibetrag } from '../../lib/insights';
import { SortableTable } from '../tables/SortableTable';
import { fmt, fmtPct, fmtNum } from '../../lib/format';
import { PALETTE, BAR_CURSOR } from '../../lib/chartTheme';
import { AlertTriangle, Zap } from 'lucide-react';
interface Props { positions: DepotPosition[] }

function aggregateBy(positions: DepotPosition[], key: keyof DepotPosition) {
  const map = new Map<string, number>();
  for (const p of positions) { const k = String(p[key] ?? '—'); map.set(k, (map.get(k) ?? 0) + p.wert); }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

const Tip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload?: { name?: string } }[] }) =>
  active && payload?.length ? (
    <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-700 dark:text-zinc-300">{payload[0].payload?.name ?? payload[0].name}</p>
      <p className="text-slate-400">{fmt(payload[0].value)}</p>
    </div>
  ) : null;

export function OverviewTab({ positions }: Props) {
  const totals = computeTotals(positions);
  const health = computeHealthScore(positions);
  const recommendations = generateRecommendations(positions);
  const freibetrag = computeFreibetrag(positions);
  const calendar = computeMonthlyCalendar(positions);
  const byWert = [...positions].sort((a, b) => b.wert - a.wert);
  const active = positions.filter(p => p.wert > 0);
  const top10  = byWert.slice(0, 10);
  const top5W  = top10.slice(0, 5).reduce((s, p) => s + p.portfolioWeight, 0);
  const top10W = top10.reduce((s, p) => s + p.portfolioWeight, 0);
  const aufbau = positions.filter((p) => p.status === 'Aufbau');
  const erledigt = positions.filter((p) => p.status === 'Erledigt');
  const beobachten = positions.filter((p) => p.status === 'Beobachten' && p.wert > 0);
  const verkauf = positions.filter((p) => p.status === 'Verkauf' && p.wert > 0);

  const monthlyPayers = active.filter(p => p.ausschuettungsfrequenz === 'monatlich').length;
  const quarterlyPayers = active.filter(p => p.ausschuettungsfrequenz === 'quartalsweise').length;

  const netDiv = freibetrag.annualDiv - freibetrag.taxAmount;
  const monthsWithIncome = calendar.filter(m => m.expectedIncome > 0).length;

  const topActions = recommendations.filter(r => r.priority === 'high').slice(0, 3);
  const healthColor = health.overall >= 70 ? 'text-emerald-600 dark:text-emerald-400'
    : health.overall >= 50 ? 'text-amber-500' : 'text-red-500';
  const healthBg = health.overall >= 70 ? 'from-emerald-500' : health.overall >= 50 ? 'from-amber-500' : 'from-red-500';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Gesamtwert"      value={fmt(totals.totalWert)}        sub="Alle Positionen" info="Summe aller Positionswerte im Depot." />
        <KPICard title="Positionen"       value={fmtNum(positions.length)}      sub={`${fmtNum(aufbau.length)} Aufbau · ${fmtNum(erledigt.length)} Erledigt`} />
        <KPICard title="Depot-Yield"      value={fmtPct(totals.weightedYield)}  sub="Gewichtet" info="Nach Depotwert gewichtete Dividendenrendite aller aktiven Positionen." />
        <KPICard title="Jährl. Dividende" value={fmt(totals.totalAnnualDiv)}    sub="Brutto, aktuell" info="Erwartete jährliche Brutto-Dividende basierend auf aktuellen Yields und Werten." />
        <KPICard title="Ø Monat"          value={fmt(totals.totalMonthlyDiv)}   sub="Dividende / 12" info="Jahresdividende geteilt durch 12. Die tatsächliche monatliche Verteilung kann abweichen." />
        <KPICard title="Sparrate"         value={`${fmtNum(totals.totalSparbetrag)} €`} sub="Pro Zyklus" info="Summe aller aktiven Sparpläne pro Ausführungszyklus." />
      </div>

      {/* Portfolio Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-slate-100 dark:stroke-zinc-800" />
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                strokeDasharray={`${health.overall * 0.975} 100`}
                strokeLinecap="round"
                className={health.overall >= 70 ? 'stroke-emerald-500' : health.overall >= 50 ? 'stroke-amber-500' : 'stroke-red-500'} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${healthColor}`}>{fmtNum(health.overall)}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Portfolio Health</div>
            <div className={`text-lg font-bold ${healthColor}`}>
              {health.overall >= 80 ? 'Ausgezeichnet' : health.overall >= 65 ? 'Gut' : health.overall >= 50 ? 'Befriedigend' : 'Verbesserungsbedarf'}
            </div>
            <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
              {health.dimensions.filter(d => d.score >= 70).length} / {health.dimensions.length} Dimensionen im grünen Bereich
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Netto-Dividende (nach Steuer)</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(netDiv)} <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">/ Jahr</span></div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            {fmt(netDiv / 12)} / Monat · {freibetrag.remaining > 0
              ? <span className="text-emerald-600 dark:text-emerald-400">{fmt(freibetrag.remaining)} Freibetrag frei</span>
              : <span className="text-amber-500">{fmt(freibetrag.taxAmount)} Steuer/Jahr</span>
            }
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Cashflow-Abdeckung</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{monthsWithIncome} <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">/ 12 Monate</span></div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            {monthlyPayers} monatl. · {quarterlyPayers} quartalsw. Zahler
          </div>
          {monthsWithIncome < 12 && (
            <div className="mt-1.5 w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(monthsWithIncome / 12) * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Urgent Actions */}
      {topActions.length > 0 && (
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Nächste Schritte ({recommendations.filter(r => r.priority === 'high').length} wichtig)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {topActions.map(action => (
              <div key={action.id} className="flex items-start gap-2 bg-white/60 dark:bg-zinc-800/60 rounded-xl p-3">
                <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{action.title}</div>
                  <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{action.impact}</div>
                  {action.symbols && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {action.symbols.slice(0, 4).map(s => (
                        <span key={s} className="text-[10px] font-mono bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Overview + Concentration */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={top5W > 50 ? 'border-amber-200 dark:border-amber-800/50' : ''}>
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Top 5 Konzentration</div>
          <div className="text-3xl font-semibold text-slate-900 dark:text-white">{fmtPct(top5W, 1)}</div>
          <div className={`mt-1 text-xs ${top5W > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-zinc-500'}`}>
            {top5W > 50 ? 'Erhöhtes Klumpenrisiko' : 'Im normalen Bereich'}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Top 10 Gewichtung</div>
          <div className="text-3xl font-semibold text-slate-900 dark:text-white">{fmtPct(top10W, 1)}</div>
          <div className="mt-1 text-xs text-slate-400 dark:text-zinc-500">von {fmtNum(positions.length)} Positionen</div>
        </Card>
        {beobachten.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800/50">
            <div className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-2">Unter Beobachtung</div>
            <div className="text-3xl font-semibold text-amber-600 dark:text-amber-400">{beobachten.length}</div>
            <div className="mt-1 text-xs text-amber-500/70">{fmt(beobachten.reduce((s, p) => s + p.wert, 0))} gebunden</div>
          </Card>
        )}
        {verkauf.length > 0 && (
          <Card className="border-red-200 dark:border-red-800/50">
            <div className="text-xs font-medium text-red-500 uppercase tracking-wider mb-2">Zum Verkauf</div>
            <div className="text-3xl font-semibold text-red-600 dark:text-red-400">{verkauf.length}</div>
            <div className="mt-1 text-xs text-red-500/70">{fmt(verkauf.reduce((s, p) => s + p.wert, 0))} freisetzbar</div>
          </Card>
        )}
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
            <XAxis type="number" tickFormatter={(v) => `${fmtNum(v / 1000)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={30} axisLine={false} tickLine={false} />
            <Tooltip cursor={BAR_CURSOR} content={<Tip />} />
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
                <span>{fmtPct(v as number, 1)}</span>
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
              { key: 'portfolioWeight', label: 'Gewicht', align: 'right', render: (v) => `${fmtPct(v as number, 1)}` },
              { key: 'prio', label: 'Prio', align: 'center', render: (v) => <PrioBadge prio={v as string|null} /> },
              { key: 'status', label: 'Status', align: 'center', render: (v) => <StatusBadge status={String(v)} /> },
            ]} />
        </div>
      </Card>
    </div>
  );
}
