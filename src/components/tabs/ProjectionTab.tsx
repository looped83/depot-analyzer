import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import type { DepotPosition, ProjectionParams } from '../../lib/types';
import { computeProjection, computeTotals } from '../../lib/calculations';
import { KPICard } from '../KPICard';
import { fmt } from '../../lib/format';

interface Props { positions: DepotPosition[] }

const SCENARIOS = [
  { label: 'Konservativ', dividendGrowthRate: 3, capitalGrowthRate: 3 },
  { label: 'Realistisch', dividendGrowthRate: 5, capitalGrowthRate: 6 },
  { label: 'Optimistisch', dividendGrowthRate: 8, capitalGrowthRate: 10 },
];

export function ProjectionTab({ positions }: Props) {
  const totals = computeTotals(positions);

  const [params, setParams] = useState<ProjectionParams>({
    dividendGrowthRate: 5,
    monthlySavings: totals.totalSparbetrag,
    reinvest: true,
    capitalGrowthRate: 6,
  });

  const data5 = computeProjection(positions, params, 5);
  const data1 = computeProjection(positions, params, 1);
  const data3 = computeProjection(positions, params, 3);

  // Scenario comparison at year 5
  const scenarios = SCENARIOS.map((s) => {
    const d = computeProjection(positions, { ...params, ...s }, 5);
    return { ...s, result: d[5] };
  });

  const upd = (key: keyof ProjectionParams, val: number | boolean) =>
    setParams((p) => ({ ...p, [key]: val }));

  const afterYear1 = data1[1];
  const afterYear3 = data3[3];
  const afterYear5 = data5[5];

  return (
    <div className="space-y-5">
      {/* Current state */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Aktueller Depotwert" value={fmt(totals.totalWert)} sub="Stand jetzt" color="blue" />
        <KPICard title="Jährl. Dividende (jetzt)" value={fmt(totals.totalAnnualDiv)} sub="Aktuelle Projektion" color="green" />
        <KPICard title="Monatliche Sparrate" value={`${params.monthlySavings} €`} sub="Editierbar" color="teal" />
        <KPICard title="Depot-Yield" value={`${totals.weightedYield.toFixed(2)} %`} sub="Gewichtet" color="purple" />
      </div>

      {/* Parameters */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">Annahmen (editierbar)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Dividendenwachstum / Jahr (%)', key: 'dividendGrowthRate' as const, min: 0, max: 20, step: 0.5 },
            { label: 'Monatliche Sparrate (€)', key: 'monthlySavings' as const, min: 0, max: 5000, step: 50 },
            { label: 'Erwart. Kurszuwachs / Jahr (%)', key: 'capitalGrowthRate' as const, min: 0, max: 20, step: 0.5 },
          ].map(({ label, key, min, max, step }) => (
            <div key={key}>
              <label className="text-xs font-medium opacity-70 block mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={params[key] as number}
                  onChange={(e) => upd(key, Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-sm font-mono w-12 text-right">{(params[key] as number)}</span>
              </div>
            </div>
          ))}
          <div>
            <label className="text-xs font-medium opacity-70 block mb-1">Dividenden reinvestieren</label>
            <button
              onClick={() => upd('reinvest', !params.reinvest)}
              className={`mt-1 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                params.reinvest
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {params.reinvest ? '✓ Ja' : '✗ Nein'}
            </button>
          </div>
        </div>
      </div>

      {/* Projection results */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Nach 1 Jahr', data: afterYear1 },
          { label: 'Nach 3 Jahren', data: afterYear3 },
          { label: 'Nach 5 Jahren', data: afterYear5 },
        ].map(({ label, data }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
            <div className="text-xs font-semibold uppercase opacity-60 mb-2">{label}</div>
            <div className="space-y-1.5">
              <div>
                <div className="text-xs text-slate-400 dark:text-zinc-500">Depotwert</div>
                <div className="text-lg font-bold">{fmt(data?.portfolioValue)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-zinc-500">Jährl. Dividende</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(data?.annualDividend)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-zinc-500">Monatl. Dividende</div>
                <div className="text-base font-semibold">{fmt((data?.annualDividend ?? 0) / 12)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">5-Jahres-Projektion</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data5}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDiv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip formatter={(v: unknown, name: unknown) => [fmt(v as number), name === 'portfolioValue' ? 'Depotwert' : 'Jährl. Dividende']} labelFormatter={(l) => `Jahr: ${l}`} />
            <Legend formatter={(v) => v === 'portfolioValue' ? 'Depotwert (€)' : 'Jährl. Dividende (€)'} />
            <Area yAxisId="left" type="monotone" dataKey="portfolioValue" stroke="#3b82f6" fill="url(#colorPortfolio)" strokeWidth={2} />
            <Area yAxisId="right" type="monotone" dataKey="annualDividend" stroke="#10b981" fill="url(#colorDiv)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Comparison */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-4">Szenarien-Vergleich (5 Jahre)</h3>
        <div className="grid grid-cols-3 gap-3">
          {scenarios.map((s) => (
            <div
              key={s.label}
              className={`rounded-lg border p-3 ${
                s.label === 'Konservativ' ? 'border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20' :
                s.label === 'Realistisch' ? 'border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20' :
                'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
              }`}
            >
              <div className="text-xs font-bold uppercase opacity-60 mb-2">{s.label}</div>
              <div className="text-xs text-slate-400 dark:text-zinc-500">Div-Wachstum: {s.dividendGrowthRate}% | Kurs: {s.capitalGrowthRate}%</div>
              <div className="mt-2 space-y-1">
                <div className="text-sm font-bold">{fmt(s.result?.portfolioValue)}</div>
                <div className="text-xs text-green-600 dark:text-green-400 font-semibold">{fmt(s.result?.annualDividend)} / Jahr</div>
                <div className="text-xs opacity-60">{fmt((s.result?.annualDividend ?? 0) / 12)} / Monat</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 leading-relaxed">
        ℹ️ Alle Projektionen sind Modellrechnungen auf Basis der eingegebenen Annahmen und der aktuellen Depotzusammensetzung. Sie stellen keine Garantie für zukünftige Erträge dar. Steuern und Kosten sind nicht berücksichtigt.
      </div>
    </div>
  );
}
