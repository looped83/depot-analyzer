import React, { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import type { DepotPosition, ProjectionParams } from '../../lib/types';
import { computeProjection, computeTotals } from '../../lib/calculations';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { fmt } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

const SCENARIOS = [
  { label: 'Konservativ',  dividendGrowthRate: 3, capitalGrowthRate: 3 },
  { label: 'Realistisch',  dividendGrowthRate: 5, capitalGrowthRate: 6 },
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Aktueller Depotwert"     value={fmt(totals.totalWert)}          sub="Stand jetzt" />
        <KPICard title="Jährl. Dividende (jetzt)" value={fmt(totals.totalAnnualDiv)}    sub="Aktuelle Projektion" />
        <KPICard title="Monatliche Sparrate"      value={`${params.monthlySavings} €`}  sub="Editierbar" />
        <KPICard title="Depot-Yield"              value={`${totals.weightedYield.toFixed(2)} %`} sub="Gewichtet" />
      </div>

      <Card title="Annahmen (editierbar)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-1">
          {[
            { label: 'Dividendenwachstum / Jahr (%)', key: 'dividendGrowthRate' as const, min: 0, max: 20, step: 0.5 },
            { label: 'Monatliche Sparrate (€)',        key: 'monthlySavings'     as const, min: 0, max: 5000, step: 50 },
            { label: 'Erwart. Kurszuwachs / Jahr (%)', key: 'capitalGrowthRate'  as const, min: 0, max: 20, step: 0.5 },
          ].map(({ label, key, min, max, step }) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 block mb-2">{label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={min} max={max} step={step}
                  value={params[key] as number}
                  onChange={(e) => upd(key, Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-sm font-mono tabular-nums w-10 text-right text-slate-700 dark:text-zinc-300">{params[key] as number}</span>
              </div>
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 block mb-2">Dividenden reinvestieren</label>
            <button
              onClick={() => upd('reinvest', !params.reinvest)}
              className={`mt-1 px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                params.reinvest
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
              }`}
            >
              {params.reinvest ? '✓ Ja' : '✗ Nein'}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Nach 1 Jahr',   data: afterYear1 },
          { label: 'Nach 3 Jahren', data: afterYear3 },
          { label: 'Nach 5 Jahren', data: afterYear5 },
        ].map(({ label, data }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3">{label}</div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">Depotwert</div>
                <div className="text-xl font-bold text-slate-900 dark:text-zinc-100">{fmt(data?.portfolioValue)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">Jährl. Dividende</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(data?.annualDividend)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">Monatl. Dividende</div>
                <div className="text-base font-semibold text-slate-700 dark:text-zinc-300">{fmt((data?.annualDividend ?? 0) / 12)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card title="5-Jahres-Projektion">
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data5} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDiv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" {...AXIS} />
              <YAxis yAxisId="left"  {...AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" {...AXIS} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [fmt(v as number), name === 'portfolioValue' ? 'Depotwert' : 'Jährl. Dividende']}
                labelFormatter={(l) => `Jahr: ${l}`}
                contentStyle={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
              />
              <Legend formatter={(v) => v === 'portfolioValue' ? 'Depotwert (€)' : 'Jährl. Dividende (€)'} wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="left"  type="monotone" dataKey="portfolioValue"  stroke="#3b82f6" fill="url(#gradPortfolio)" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="annualDividend"  stroke="#10b981" fill="url(#gradDiv)"       strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Szenarien-Vergleich (5 Jahre)">
        <div className="grid grid-cols-3 gap-3 mt-2">
          {scenarios.map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border p-4 ${
                s.label === 'Konservativ'  ? 'border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20' :
                s.label === 'Realistisch'  ? 'border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20' :
                'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">{s.label}</div>
              <div className="text-xs text-slate-400 dark:text-zinc-500 mb-3">Div {s.dividendGrowthRate}% · Kurs {s.capitalGrowthRate}%</div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">{fmt(s.result?.portfolioValue)}</div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmt(s.result?.annualDividend)} / Jahr</div>
                <div className="text-xs text-slate-400 dark:text-zinc-500">{fmt((s.result?.annualDividend ?? 0) / 12)} / Monat</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 leading-relaxed">
        Alle Projektionen sind Modellrechnungen auf Basis der eingegebenen Annahmen und der aktuellen Depotzusammensetzung. Sie stellen keine Garantie für zukünftige Erträge dar. Steuern und Kosten sind nicht berücksichtigt.
      </p>
    </div>
  );
}
