import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { computeProjection, computeTotals } from '../../lib/calculations';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { fmt } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

const MILESTONES = [
  { label: 'Handy-Rechnung',  monthly: 50  },
  { label: 'Lebensmittel',    monthly: 300 },
  { label: 'Miete (anteilig)',monthly: 800 },
  { label: 'Halbfinanzfrei',  monthly: 1500 },
  { label: 'Vollfinanzfrei',  monthly: 3000 },
];

export function GoalTab({ positions }: Props) {
  const totals = computeTotals(positions);
  const currentMonthly = totals.totalMonthlyDiv;

  const [goalMonthly, setGoalMonthly]   = useState(2000);
  const [divGrowth, setDivGrowth]       = useState(5);
  const [capGrowth, setCapGrowth]       = useState(6);
  const [savings, setSavings]           = useState(totals.totalSparbetrag);
  const [reinvest, setReinvest]         = useState(true);

  const params = { dividendGrowthRate: divGrowth, monthlySavings: savings, reinvest, capitalGrowthRate: capGrowth };

  // Project 30 years
  const proj30 = computeProjection(positions, params, 30);

  const goalAnnual = goalMonthly * 12;
  const hitYear = proj30.find((d) => d.annualDividend >= goalAnnual);
  const yearsToGoal = hitYear ? hitYear.year - new Date().getFullYear() : null;

  const progress = Math.min(100, (currentMonthly / goalMonthly) * 100);
  const remaining = Math.max(0, goalMonthly - currentMonthly);

  // Chart data capped to 10 years beyond goal or 30 max
  const chartEnd = Math.min(30, (yearsToGoal ?? 30) + 5);
  const chartData = proj30.slice(0, chartEnd + 1);

  // Milestone years
  const milestones = MILESTONES.map((m) => {
    const hit = proj30.find((d) => d.annualDividend / 12 >= m.monthly);
    return { ...m, hitYear: hit?.year ?? null, reached: currentMonthly >= m.monthly };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Aktuell / Monat"   value={fmt(currentMonthly)}   sub="Monatliche Dividende" />
        <KPICard title="Ziel / Monat"      value={fmt(goalMonthly)}      sub="Einstellbar" />
        <KPICard title="Fortschritt"        value={`${progress.toFixed(1)} %`} sub="Zum Monatsziel" />
        <KPICard title="Noch fehlend"      value={fmt(remaining)}        sub="Pro Monat" />
      </div>

      {/* Goal input + progress */}
      <Card title="Ziel & Annahmen">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-2">
          {[
            { label: 'Monatsziel (€)', val: goalMonthly, set: setGoalMonthly, min: 100, max: 10000, step: 100 },
            { label: 'Monatliche Sparrate (€)', val: savings, set: setSavings, min: 0, max: 5000, step: 50 },
            { label: 'Dividendenwachstum / Jahr (%)', val: divGrowth, set: setDivGrowth, min: 0, max: 15, step: 0.5 },
            { label: 'Kurszuwachs / Jahr (%)', val: capGrowth, set: setCapGrowth, min: 0, max: 20, step: 0.5 },
          ].map(({ label, val, set, min, max, step }) => (
            <div key={label}>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 block mb-2">{label}</label>
              <div className="flex items-center gap-3">
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={(e) => set(Number(e.target.value))}
                  className="flex-1 accent-blue-500" />
                <span className="text-sm font-mono tabular-nums w-12 text-right text-slate-700 dark:text-zinc-300">{val}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1.5">
            <span>{fmt(currentMonthly)} / Monat aktuell</span>
            <span>Ziel: {fmt(goalMonthly)} / Monat</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-center">
            {yearsToGoal !== null ? (
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                Ziel erreichbar in ca. <span className="text-blue-600 dark:text-blue-400">{yearsToGoal} Jahren</span>
                {' '}(ca. {hitYear?.year})
              </p>
            ) : (
              <p className="text-sm text-slate-400 dark:text-zinc-500">
                Ziel nicht innerhalb von 30 Jahren erreichbar – Sparrate oder Wachstum erhöhen.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Projection chart */}
      <Card title="Monatliche Dividende – Projektionsverlauf">
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData.map((d) => ({ ...d, monthlyDiv: Math.round(d.annualDividend / 12) }))}
              margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradGoal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <ReferenceLine y={goalMonthly} stroke="#10b981" strokeDasharray="5 4" strokeWidth={2}
                label={{ value: `Ziel ${fmt(goalMonthly)}`, position: 'right', fontSize: 10, fill: '#10b981' }} />
              <Tooltip
                formatter={(v: unknown) => [fmt(v as number), 'Monatl. Dividende']}
                labelFormatter={(l) => `Jahr: ${l}`}
                contentStyle={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 12, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="monthlyDiv" stroke="#3b82f6" fill="url(#gradGoal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Reinvest toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-zinc-400">Dividenden reinvestieren:</span>
        <button
          onClick={() => setReinvest(!reinvest)}
          className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            reinvest ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
          }`}
        >
          {reinvest ? '✓ Ja' : '✗ Nein'}
        </button>
      </div>

      {/* Milestones */}
      <Card title="Meilensteine – Wann ist was gedeckt?">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-2">
          {milestones.map((m) => (
            <div key={m.label} className={`rounded-xl border p-3 text-center ${
              m.reached
                ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20'
                : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
            }`}>
              <div className={`text-xs font-semibold mb-1 ${m.reached ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-400'}`}>
                {m.label}
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-zinc-200">{fmt(m.monthly)}</div>
              <div className="text-xs mt-1">
                {m.reached
                  ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Bereits erreicht</span>
                  : m.hitYear
                    ? <span className="text-slate-400 dark:text-zinc-500">ca. {m.hitYear}</span>
                    : <span className="text-slate-300 dark:text-zinc-600">offen</span>
                }
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Year-by-year table */}
      <Card title="Jahresübersicht (10 Jahre)">
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800">
                {['Jahr', 'Depotwert', 'Jährl. Dividende', 'Monatl. Dividende', 'Fortschritt'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proj30.slice(0, 11).map((d) => {
                const monthly = d.annualDividend / 12;
                const pct = Math.min(100, (monthly / goalMonthly) * 100);
                return (
                  <tr key={d.year} className={`border-b border-slate-50 dark:border-zinc-800/60 ${d.annualDividend >= goalAnnual ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}>
                    <td className="py-2 px-3 font-semibold text-slate-700 dark:text-zinc-300">{d.year}</td>
                    <td className="py-2 px-3 font-mono tabular-nums">{fmt(d.portfolioValue)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(d.annualDividend)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums">{fmt(monthly)}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className={pct >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                          {pct.toFixed(0)} %
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
