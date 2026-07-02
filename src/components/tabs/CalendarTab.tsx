import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { computeMonthlyCalendar } from '../../lib/calculations';
import { KPICard } from '../KPICard';
import { Card, PageHeading } from '../Card';
import { fmt, fmtNum } from '../../lib/format';
import { AXIS, GRID, BAR_CURSOR } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

const FULL_MONTH: Record<string, string> = {
  Jan: 'Januar', Feb: 'Februar', Mär: 'März', Apr: 'April',
  Mai: 'Mai', Jun: 'Juni', Jul: 'Juli', Aug: 'August',
  Sep: 'September', Okt: 'Oktober', Nov: 'November', Dez: 'Dezember',
};

export function CalendarTab({ positions }: Props) {
  const calendar = computeMonthlyCalendar(positions);
  const avgIncome = calendar.reduce((s, m) => s + m.expectedIncome, 0) / 12;
  const maxMonth = calendar.reduce((m, c) => c.expectedIncome > m.expectedIncome ? c : m);
  const activeMonths = calendar.filter((m) => m.expectedIncome > 0);
  const minMonth = activeMonths.length > 0
    ? activeMonths.reduce((m, c) => c.expectedIncome < m.expectedIncome ? c : m)
    : undefined;
  const totalAnnual = calendar.reduce((s, m) => s + m.expectedIncome, 0);

  const colorByIncome = (income: number) => {
    if (income === 0) return '#e5e7eb';
    if (income < avgIncome * 0.5) return '#f97316';
    if (income < avgIncome * 0.8) return '#f59e0b';
    if (income > avgIncome * 1.3) return '#10b981';
    return '#3b82f6';
  };

  const monthly   = positions.filter((p) => p.ausschuettungsfrequenz === 'monatlich' && p.wert > 0);
  const quarterly = positions.filter((p) => p.ausschuettungsfrequenz === 'quartalsweise' && p.wert > 0);
  const annual    = positions.filter((p) => p.ausschuettungsfrequenz === 'jährlich' && p.wert > 0);

  return (
    <div className="space-y-5">
      <PageHeading title="Kalender" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Jährl. Gesamtdividende" value={fmt(totalAnnual)}           sub="Aus Cashflow-Analyse" />
        <KPICard title="Bester Monat"            value={FULL_MONTH[maxMonth.label] ?? maxMonth.label} sub={fmt(maxMonth.expectedIncome)} />
        <KPICard title="Schwächster Monat"       value={minMonth ? (FULL_MONTH[minMonth.label] ?? minMonth.label) : '—'} sub={minMonth ? fmt(minMonth.expectedIncome) : '—'} />
        <KPICard title="Ø Monatlicher Cashflow"  value={fmt(avgIncome)}            sub="Dividende / 12" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Monatliche Zahler',    items: monthly,   color: 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50' },
          { label: 'Quartalsweise Zahler', items: quarterly, color: 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50' },
          { label: 'Jährliche Zahler',     items: annual,    color: 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50' },
        ].map(({ label, items, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">{label}</div>
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-xs opacity-60 mt-1 font-mono leading-relaxed">
              {items.map((p) => p.symbol).join(', ') || '—'}
            </div>
          </div>
        ))}
      </div>

      <Card
        title="Erwarteter Cashflow je Monat"
        sub={`Orange = unter 50 % Ø · Gelb = leicht unter Ø · Grün = über Ø · Ø = ${fmt(avgIncome)}/Monat`}
      >
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={calendar} margin={{ bottom: 10, top: 4, right: 20 }}>
              <CartesianGrid {...GRID} vertical={false} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={(v) => `${fmtNum(v)}€`} />
              <Tooltip cursor={BAR_CURSOR}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs shadow-xl">
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 mb-1">{label}</p>
                      <p className="text-slate-600 dark:text-zinc-300">{fmt(d.expectedIncome)}</p>
                      <p className="text-slate-400 dark:text-zinc-500 mt-0.5">{d.positions.length} Zahler: {d.positions.slice(0, 6).join(', ')}{d.positions.length > 6 ? ' …' : ''}</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={avgIncome} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value: 'Ø', position: 'right', fontSize: 11, fill: '#94a3b8' }} />
              <Bar dataKey="expectedIncome" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {calendar.map((entry, i) => <Cell key={i} fill={colorByIncome(entry.expectedIncome)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Dividendenkalender – Zahler je Monat">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
          {calendar.map((month) => (
            <div
              key={month.month}
              className={`rounded-xl border p-3 ${
                month.expectedIncome === 0 ? 'border-slate-100 dark:border-zinc-800 opacity-30' :
                month.expectedIncome < avgIncome * 0.5 ? 'border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20' :
                month.expectedIncome > avgIncome * 1.3 ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20' :
                'border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-60">{month.label}</div>
                {month.expectedIncome > 0 && (
                  <div className="text-xs text-slate-300 dark:text-zinc-600">
                    {fmtNum((month.expectedIncome / avgIncome) * 100)} % Ø
                  </div>
                )}
              </div>
              <div className="text-lg font-bold mt-0.5">{fmt(month.expectedIncome)}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {month.positions.slice(0, 8).map((sym) => (
                  <span key={sym} className="text-xs bg-white/70 dark:bg-zinc-800/70 border border-slate-100 dark:border-zinc-700 px-1.5 py-0.5 rounded-md font-mono text-slate-500 dark:text-zinc-400">{sym}</span>
                ))}
                {month.positions.length > 8 && (
                  <span className="text-xs text-slate-400 dark:text-zinc-500">+{month.positions.length - 8}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cashflow-Stabilität */}
      {(() => {
        const monthlyValues = calendar.map(m => m.expectedIncome);
        const stdDev = Math.sqrt(monthlyValues.reduce((s, v) => s + (v - avgIncome) ** 2, 0) / 12);
        const cv = avgIncome > 0 ? (stdDev / avgIncome * 100) : 0;
        const weakMonths = calendar.filter(m => m.expectedIncome < avgIncome * 0.5 && m.expectedIncome > 0);
        const emptyMonths = calendar.filter(m => m.expectedIncome === 0);

        return (
          <Card title="Cashflow-Analyse" sub="Stabilität und Optimierungspotenzial">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <div className="rounded-xl border border-slate-100 dark:border-zinc-800 p-3 text-center">
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Variationskoeff.</div>
                <div className={`text-lg font-bold ${cv < 30 ? 'text-emerald-600 dark:text-emerald-400' : cv < 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {fmtNum(cv)} %
                </div>
                <div className="text-xs text-slate-300 dark:text-zinc-600">{cv < 30 ? 'Sehr stabil' : cv < 60 ? 'Mäßig' : 'Instabil'}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-zinc-800 p-3 text-center">
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Schwache Monate</div>
                <div className="text-lg font-bold text-slate-800 dark:text-zinc-200">{weakMonths.length}</div>
                <div className="text-xs text-slate-300 dark:text-zinc-600">&lt; 50 % vom Ø</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-zinc-800 p-3 text-center">
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Leere Monate</div>
                <div className="text-lg font-bold text-slate-800 dark:text-zinc-200">{emptyMonths.length}</div>
                <div className="text-xs text-slate-300 dark:text-zinc-600">Keine Dividende</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-zinc-800 p-3 text-center">
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Spanne</div>
                <div className="text-lg font-bold text-slate-800 dark:text-zinc-200">{fmt(maxMonth.expectedIncome - (minMonth?.expectedIncome ?? 0))}</div>
                <div className="text-xs text-slate-300 dark:text-zinc-600">Max – Min</div>
              </div>
            </div>

            {(weakMonths.length > 0 || emptyMonths.length > 0) && (
              <div className="mt-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Empfehlung</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-300/70 leading-relaxed">
                  {emptyMonths.length > 0
                    ? `In ${emptyMonths.map(m => m.label).join(', ')} erhältst du keine Dividende. `
                    : ''}
                  {weakMonths.length > 0
                    ? `${weakMonths.map(m => m.label).join(', ')} ${weakMonths.length === 1 ? 'hat' : 'haben'} besonders niedrige Cashflows. `
                    : ''}
                  Monatliche Zahler (REITs, BDCs, ausgewählte ETFs) oder quartalsweise Zahler mit passenden Ausschüttungsmonaten können die Lücken füllen.
                </p>
              </div>
            )}
          </Card>
        );
      })()}
    </div>
  );
}
