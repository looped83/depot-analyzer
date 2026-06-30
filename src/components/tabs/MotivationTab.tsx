import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { computeMotivationMetrics, computeAchievements, computeSnowballEffect } from '../../lib/insights';
import { computeTotals, computeProjection } from '../../lib/calculations';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { fmt, fmtNum } from '../../lib/format';
import { AXIS, GRID } from '../../lib/chartTheme';

interface Props { positions: DepotPosition[] }

const EQUIV_ITEMS = [
  { key: 'netflixAbos', label: 'Netflix Standard', icon: '🎬', unit: '/Monat', price: '13,99 €' },
  { key: 'spotifyAbos', label: 'Spotify Premium', icon: '🎵', unit: '/Monat', price: '11,99 €' },
  { key: 'handyVertraege', label: 'Handyverträge', icon: '📱', unit: '/Monat', price: '30 €' },
  { key: 'autoLaden', label: 'Auto laden', icon: '🔋', unit: '/Monat', price: '25 €' },
] as const;

const LIFE_ITEMS = [
  { key: 'lebensmittelTage', label: 'Tage Lebensmittel', icon: '🛒', sub: '(15 €/Tag)', perYear: true },
  { key: 'urlaubsTage', label: 'Urlaubstage', icon: '🏖️', sub: '(100 €/Tag)', perYear: true },
  { key: 'workHoursPerMonth', label: 'Arbeitsstunden gespart', icon: '⏰', sub: '(12,82 €/h Mindestlohn)', perYear: false },
  { key: 'dailyPassiveIncome', label: 'Tägliches Passiveinkommen', icon: '💶', sub: '', perYear: false, isCurrency: true },
] as const;

export function MotivationTab({ positions }: Props) {
  const metrics = useMemo(() => computeMotivationMetrics(positions), [positions]);
  const achievements = useMemo(() => computeAchievements(positions), [positions]);
  const snowball = useMemo(() => computeSnowballEffect(positions, 20), [positions]);
  const totals = computeTotals(positions);

  const reached = achievements.filter(a => a.reached);
  const nextUp = achievements.filter(a => !a.reached).sort((a, b) => b.progress - a.progress);

  const proj5 = computeProjection(positions, {
    dividendGrowthRate: 5, monthlySavings: totals.totalSparbetrag,
    reinvest: true, capitalGrowthRate: 6,
  }, 5);
  const future5Div = proj5[5]?.annualDividend ?? 0;
  const future5Monthly = future5Div / 12;

  return (
    <div className="space-y-5">
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Passives Einkommen" value={fmt(totals.totalMonthlyDiv)} sub="Pro Monat, brutto" info="Deine monatliche Brutto-Dividende aus allen aktiven Positionen." />
        <KPICard title="Tägliches Einkommen" value={fmt(metrics.dailyPassiveIncome)} sub="365 Tage im Jahr" info="Jahres-Dividende geteilt durch 365 – dein tägliches Passiveinkommen." />
        <KPICard title="Freiheitsgrad" value={`${fmtNum(metrics.freedomDegree, 1)} %`} sub="Fixkosten gedeckt (Basis: 2.500 €)" info="Anteil deiner monatlichen Fixkosten (2.500 €), der durch Dividenden gedeckt ist." />
        <KPICard title="Arbeitsstunden gespart" value={`${fmtNum(metrics.workHoursPerMonth, 1)} h`} sub="Pro Monat (Mindestlohn)" info="So viele Stunden Arbeit (zum Mindestlohn) ersetzt dein Dividendeneinkommen pro Monat." />
      </div>

      {/* Freedom Degree */}
      <Card title="Dein Freiheitsgrad">
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-zinc-400">{fmt(totals.totalMonthlyDiv)} / Monat passiv</span>
            <span className="text-slate-500 dark:text-zinc-400">100 % = 2.500 € / Monat</span>
          </div>
          <div className="w-full h-5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(100, metrics.freedomDegree)}%` }} />
            {[25, 50, 75].map(mark => (
              <div key={mark} className="absolute top-0 h-full w-px bg-white/40 dark:bg-zinc-600/40"
                style={{ left: `${mark}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-xs mt-1 text-slate-300 dark:text-zinc-600">
            <span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-3 text-center">
            {metrics.freedomDegree < 5
              ? 'Jede Reise beginnt mit dem ersten Schritt. Dein passives Einkommen wächst mit jedem investierten Euro.'
              : metrics.freedomDegree < 20
              ? `Deine Dividenden decken bereits ${fmtNum(metrics.freedomDegree, 1)} % deiner Fixkosten. Weiter so!`
              : metrics.freedomDegree < 50
              ? `Beeindruckend: Fast ${fmtNum(metrics.freedomDegree)} % deiner Fixkosten sind bereits durch passives Einkommen gedeckt.`
              : metrics.freedomDegree < 100
              ? `Auf der Zielgeraden: ${fmtNum(metrics.freedomDegree)} % finanzielle Freiheit erreicht!`
              : 'Gratulation! Du hast finanzielle Freiheit erreicht!'
            }
          </p>
        </div>
      </Card>

      {/* Was deine Dividenden bezahlen */}
      <Card title="Was deine Dividenden bezahlen" sub="Monatliches passives Einkommen in Lebensbezügen">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {EQUIV_ITEMS.map(item => {
            const val = metrics[item.key];
            return (
              <div key={item.key} className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-zinc-200">{fmtNum(val, 1)}x</div>
                <div className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-0.5">{item.label}</div>
                <div className="text-xs text-slate-300 dark:text-zinc-600 mt-0.5">{item.price} {item.unit}</div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {LIFE_ITEMS.map(item => {
            const val = metrics[item.key];
            return (
              <div key={item.key} className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-zinc-200">
                  {'isCurrency' in item && item.isCurrency ? fmt(val) : fmtNum(val, 1)}
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-0.5">{item.label}</div>
                <div className="text-xs text-slate-300 dark:text-zinc-600 mt-0.5">
                  {item.perYear ? 'pro Jahr' : 'pro Monat'} {item.sub}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Achievements */}
      <Card title={`Meilensteine & Erfolge (${reached.length} / ${achievements.length} erreicht)`}>
        {reached.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Erreicht</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {reached.map(a => (
                <div key={a.id} className="rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 text-center">
                  <div className="text-xl mb-0.5">{a.icon}</div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{a.label}</div>
                  <div className="text-xs text-emerald-600/60 dark:text-emerald-400/50 mt-0.5">{a.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nextUp.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">Nächste Ziele</p>
            <div className="space-y-2">
              {nextUp.map(a => (
                <div key={a.id} className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{a.label}</span>
                        <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">{a.current} / {a.target}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${a.progress}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{a.description}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">{fmtNum(a.progress)} %</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Schneeball-Effekt */}
      <Card title="Der Schneeball-Effekt" sub="Depotwert-Entwicklung: Mit vs. ohne Dividenden-Reinvestition (20 Jahre)">
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={snowball} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradWith" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWithout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="year" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={v => `${fmtNum(v / 1000)}k`} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  fmt(v as number),
                  name === 'withReinvest' ? 'Mit Reinvestition' : 'Ohne Reinvestition',
                ]}
                labelFormatter={l => `Jahr: ${l}`}
                contentStyle={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
              />
              <Legend formatter={v => v === 'withReinvest' ? 'Mit Reinvestition' : 'Ohne Reinvestition'} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="withReinvest" stroke="#10b981" fill="url(#gradWith)" strokeWidth={2} />
              <Area type="monotone" dataKey="withoutReinvest" stroke="#94a3b8" fill="url(#gradWithout)" strokeWidth={1.5} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {snowball.length > 10 && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[5, 10, 20].map(y => {
              const row = snowball.find(r => r.year === snowball[0].year + y);
              if (!row) return null;
              const diff = row.withReinvest - row.withoutReinvest;
              return (
                <div key={y} className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Nach {y} Jahren</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">+{fmt(diff)}</div>
                  <div className="text-xs text-emerald-500/70 mt-0.5">durch Reinvestition</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Zukunftsausblick */}
      <Card title="Blick in die Zukunft" sub="Bei 5 % Dividendenwachstum + 6 % Kurszuwachs + aktuelle Sparrate">
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-2">Heute</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-zinc-200">{fmt(totals.totalMonthlyDiv)}</div>
            <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">monatliche Dividende</div>
          </div>
          <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">In 5 Jahren</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(future5Monthly)}</div>
            <div className="text-xs text-emerald-500/60 mt-0.5">monatliche Dividende (proj.)</div>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-3 text-center leading-relaxed">
          {future5Monthly > totals.totalMonthlyDiv * 1.5
            ? `In 5 Jahren könntest du ${fmt(future5Monthly)} pro Monat an Dividenden erhalten – das ${fmtNum(future5Monthly / totals.totalMonthlyDiv, 1)}x deines aktuellen Einkommens.`
            : `Dein passives Einkommen wächst stetig. Jeder investierte Euro und jede reinvestierte Dividende bringt dich deinem Ziel näher.`
          }
        </p>
      </Card>

      <p className="text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-center leading-relaxed">
        Alle Berechnungen basieren auf den aktuellen Depotdaten. Preisgrenzen für Vergleiche sind Richtwerte. Die Zukunftsprognosen sind Modellrechnungen und keine Garantie.
      </p>
    </div>
  );
}
