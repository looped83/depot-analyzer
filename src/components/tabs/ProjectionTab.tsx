import React, { useState, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import type { DepotPosition, ProjectionParams } from '../../lib/types';
import { computeProjection, computeTotals } from '../../lib/calculations';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';
import { ChartTooltip } from '../ChartTooltip';

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
    monthlySavings: 4200,
    reinvest: true,
    capitalGrowthRate: 6,
  });

  const data5 = useMemo(() => computeProjection(positions, params, 5), [positions, params]);
  const proj30 = useMemo(() => computeProjection(positions, params, 30), [positions, params]);

  const scenarios = useMemo(() => SCENARIOS.map((s) => {
    const d = computeProjection(positions, { ...params, ...s }, 5);
    return { ...s, result: d[5] };
  }), [positions, params]);

  // data1 and data3 reuse data5 — a 5-year projection already contains years 0–5
  const afterYear1 = data5[1];
  const afterYear3 = data5[3];
  const afterYear5 = data5[5];

  const whatIfResults = useMemo(() => [
    { label: '+100 € Sparrate/Monat', params: { ...params, monthlySavings: params.monthlySavings + 100 } },
    { label: '+200 € Sparrate/Monat', params: { ...params, monthlySavings: params.monthlySavings + 200 } },
    { label: '+2 % Dividendenwachstum', params: { ...params, dividendGrowthRate: params.dividendGrowthRate + 2 } },
  ].map(s => {
    const result = computeProjection(positions, s.params, 5);
    return { label: s.label, result5: result[5] };
  }), [positions, params]);

  const freedomCountdown = useMemo(() => {
    const targets = [500, 1000, 1500, 2000, 2500, 3000];
    return targets.map(target => {
      const hit = proj30.find(d => d.annualDividend / 12 >= target);
      return { target, hitYear: hit?.year ?? null };
    });
  }, [proj30]);

  const upd = (key: keyof ProjectionParams, val: number | boolean) =>
    setParams((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Aktueller Depotwert"     value={fmt(totals.totalWert)}          sub="Stand jetzt" info="Summe aller aktiven Positionen zum aktuellen Kurs." />
        <KPICard title="Jährl. Dividende (jetzt)" value={fmt(totals.totalAnnualDiv)}    sub="Aktuelle Projektion" info="Erwartete jährliche Brutto-Dividende aller aktiven Positionen." />
        <KPICard title="Monatliche Sparrate"      value={`${fmtNum(params.monthlySavings)} €`}  sub="Editierbar" info="Monatlich neu investiertes Kapital – über den Regler anpassbar." />
        <KPICard title="Depot-Yield"              value={fmtPct(totals.weightedYield)} sub="Gewichtet" info="Nach Depotwert gewichtete Dividendenrendite aller aktiven Positionen." />
      </div>

      <Card title="Annahmen">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-1">
          {[
            { label: 'Dividendenwachstum / Jahr', key: 'dividendGrowthRate' as const, min: 0, max: 20, step: 0.5, unit: '%' as const },
            { label: 'Monatliche Sparrate',        key: 'monthlySavings'     as const, min: 0, max: 5000, step: 50, unit: '€' as const },
            { label: 'Erwart. Kurszuwachs / Jahr', key: 'capitalGrowthRate'  as const, min: 0, max: 20, step: 0.5, unit: '%' as const },
          ].map(({ label, key, min, max, step, unit }) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400 block mb-2">{label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={min} max={max} step={step}
                  value={params[key] as number}
                  onChange={(e) => upd(key, Number(e.target.value))}
                  className="flex-1 min-w-0 accent-blue-500"
                />
                <span className="text-sm font-mono tabular-nums w-20 text-right text-slate-700 dark:text-zinc-300">
                  {fmtNum(params[key] as number, unit === '€' ? 0 : 1)} {unit}
                </span>
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
              <YAxis yAxisId="left"  {...AXIS} tickFormatter={(v) => `${fmtNum(v / 1000)}k`} />
              <YAxis yAxisId="right" orientation="right" {...AXIS} tickFormatter={(v) => `${fmtNum(v / 1000)}k`} />
              <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => fmt(Number(v))} labelFormatter={(l) => `Jahr: ${l}`} />} />
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

      {/* Inflationsbereinigte Projektion */}
      <Card title="Inflationsbereinigte Projektion (5 Jahre)" sub="Reale Kaufkraft bei 2,5 % Inflation">
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { label: 'Nach 1 Jahr', data: afterYear1, y: 1 },
            { label: 'Nach 3 Jahren', data: afterYear3, y: 3 },
            { label: 'Nach 5 Jahren', data: afterYear5, y: 5 },
          ].map(({ label, data, y }) => {
            const inflFactor = Math.pow(1.025, y);
            const realDiv = (data?.annualDividend ?? 0) / inflFactor;
            const realValue = (data?.portfolioValue ?? 0) / inflFactor;
            return (
              <div key={label} className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">{label} (real)</div>
                <div className="space-y-1.5">
                  <div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Realer Depotwert</div>
                    <div className="text-lg font-bold text-slate-700 dark:text-zinc-300">{fmt(realValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Reale Jahresdividende</div>
                    <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{fmt(realDiv)}</div>
                  </div>
                  <div className="text-xs text-slate-300 dark:text-zinc-600">
                    Kaufkraftverlust: -{fmtNum((1 - 1/inflFactor) * 100, 1)} %
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Was wäre wenn */}
      <Card title="Was wäre wenn?" sub="Vergleich: Wie verändert sich das Ergebnis nach 5 Jahren?">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {whatIfResults.map(({ label, result5: r5 }) => {
            const diffValue = (r5?.portfolioValue ?? 0) - (afterYear5?.portfolioValue ?? 0);
            const diffDiv = (r5?.annualDividend ?? 0) - (afterYear5?.annualDividend ?? 0);
            return (
              <div key={label} className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">{label}</div>
                <div className="space-y-1.5">
                  <div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Depotwert (5J)</div>
                    <div className="text-base font-bold text-slate-800 dark:text-zinc-200">{fmt(r5?.portfolioValue)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">+{fmt(diffValue)} mehr</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Jahresdividende (5J)</div>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(r5?.annualDividend)}</div>
                    <div className="text-xs text-emerald-500/70">+{fmt(diffDiv)} mehr</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Freiheits-Countdown */}
      <Card title="Freiheits-Countdown" sub="Wann erreichst du welche monatliche Dividende?">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
          {freedomCountdown.map(c => {
            const reached = totals.totalMonthlyDiv >= c.target;
            return (
              <div key={c.target} className={`rounded-xl border p-3 text-center ${
                reached ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
              }`}>
                <div className="text-sm font-bold text-slate-800 dark:text-zinc-200">{fmt(c.target)}</div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">/Monat</div>
                <div className="text-xs mt-1.5">
                  {reached
                    ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Erreicht</span>
                    : c.hitYear
                      ? <span className="text-blue-600 dark:text-blue-400 font-semibold">ca. {c.hitYear}</span>
                      : <span className="text-slate-300 dark:text-zinc-600">&gt;30 Jahre</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 leading-relaxed">
        Alle Projektionen sind Modellrechnungen auf Basis der eingegebenen Annahmen und der aktuellen Depotzusammensetzung. Sie stellen keine Garantie für zukünftige Erträge dar. Steuern und Kosten sind nicht berücksichtigt. Inflationsannahme: 2,5 %/Jahr.
      </p>
    </div>
  );
}
