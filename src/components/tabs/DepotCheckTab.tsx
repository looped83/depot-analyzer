import React, { useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import type { DepotPosition } from '../../lib/types';
import { computeHealthScore, generateRecommendations, computeFreibetrag, computeStressTest } from '../../lib/insights';
import { KPICard } from '../KPICard';
import { Card } from '../Card';
import { fmt } from '../../lib/format';
import { ArrowRight, Zap, AlertTriangle, CheckCircle, Info, TrendingDown } from 'lucide-react';

interface Props { positions: DepotPosition[] }

const gradeLabel = (score: number) =>
  score >= 85 ? 'Exzellent' : score >= 70 ? 'Gut' : score >= 55 ? 'Solide'
    : score >= 40 ? 'Ausbaufähig' : 'Kritisch';

const gradeColor = (score: number) =>
  score >= 85 ? 'text-emerald-600 dark:text-emerald-400' : score >= 70 ? 'text-blue-600 dark:text-blue-400'
    : score >= 55 ? 'text-amber-500' : score >= 40 ? 'text-orange-500' : 'text-red-500';

const barColor = (score: number) =>
  score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : score >= 25 ? 'bg-amber-400' : 'bg-red-400';

const prioConfig = {
  high: { icon: <Zap size={14} />, bg: 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50', text: 'text-red-700 dark:text-red-400', label: 'Hoch' },
  medium: { icon: <AlertTriangle size={14} />, bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50', text: 'text-amber-700 dark:text-amber-400', label: 'Mittel' },
  low: { icon: <Info size={14} />, bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50', text: 'text-blue-700 dark:text-blue-400', label: 'Niedrig' },
};

export function DepotCheckTab({ positions }: Props) {
  const health = useMemo(() => computeHealthScore(positions), [positions]);
  const recommendations = useMemo(() => generateRecommendations(positions), [positions]);
  const freibetrag = useMemo(() => computeFreibetrag(positions), [positions]);
  const stress20 = useMemo(() => computeStressTest(positions, 20), [positions]);
  const stress50 = useMemo(() => computeStressTest(positions, 50), [positions]);

  const top3 = recommendations.slice(0, 3);
  const radarData = health.dimensions.map(d => ({ dimension: d.label, score: d.score, fullMark: 100 }));

  return (
    <div className="space-y-5">
      {/* Overall Score + KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Depot Health Score" value={`${health.overall.toFixed(0)} / 100`} sub={gradeLabel(health.overall)} />
        <KPICard title="Empfehlungen" value={String(recommendations.length)} sub={`${recommendations.filter(r => r.priority === 'high').length} mit hoher Priorität`} />
        <KPICard title="Freibetrag genutzt" value={`${Math.min(100, (freibetrag.used / freibetrag.freibetrag * 100)).toFixed(0)} %`} sub={freibetrag.remaining > 0 ? `${fmt(freibetrag.remaining)} frei` : 'Vollständig ausgeschöpft'} />
        <KPICard title="Steuerbelastung" value={fmt(freibetrag.taxAmount)} sub={`${fmt(freibetrag.taxable)} steuerpflichtig`} />
      </div>

      {/* Health Score Gauge + Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Depot Health Score">
          <div className="flex flex-col items-center py-4">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                  className="text-slate-100 dark:text-zinc-800" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={health.overall >= 75 ? '#10b981' : health.overall >= 50 ? '#3b82f6' : health.overall >= 25 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${health.overall * 2.64} 264`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${gradeColor(health.overall)}`}>{health.overall.toFixed(0)}</span>
                <span className="text-xs text-slate-400 dark:text-zinc-500">{gradeLabel(health.overall)}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-3 text-center max-w-xs">
              Gewichteter Durchschnitt aus 8 Qualitätsdimensionen deines Depots
            </p>
          </div>
        </Card>

        <Card title="Dimensionen-Radar">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" strokeOpacity={0.4} />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip
                formatter={(v: unknown) => [`${v} / 100`, 'Score']}
                contentStyle={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top 3 Sofort-Maßnahmen */}
      {top3.length > 0 && (
        <Card title="Top 3 – Sofort umsetzbare Maßnahmen" sub="Höchste Priorität zuerst">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {top3.map((r, i) => {
              const cfg = prioConfig[r.priority];
              return (
                <div key={r.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full bg-white/60 dark:bg-zinc-900/60 text-sm font-bold ${cfg.text}`}>{i + 1}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>{r.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-2">{r.description}</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <ArrowRight size={12} className={cfg.text} />
                    <span className={`font-semibold ${cfg.text}`}>{r.impact}</span>
                  </div>
                  {r.symbols && r.symbols.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.symbols.map(s => (
                        <span key={s} className="text-xs bg-white/60 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700 px-1.5 py-0.5 rounded-md font-mono">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Dimensions Detail */}
      <Card title="Qualitätsdimensionen im Detail">
        <div className="space-y-4 mt-2">
          {health.dimensions.map(d => (
            <div key={d.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">{d.label}</span>
                <span className="text-slate-400 dark:text-zinc-500">{d.detail}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor(d.score)}`}
                    style={{ width: `${Math.min(100, d.score)}%` }} />
                </div>
                <span className={`text-sm font-bold tabular-nums w-10 text-right ${gradeColor(d.score)}`}>{d.score.toFixed(0)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {d.tips.map((tip, i) => (
                  <span key={i} className="text-xs bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700 px-2 py-0.5 rounded-lg text-slate-500 dark:text-zinc-400">
                    {d.score >= 75 ? <CheckCircle size={10} className="inline mr-1 text-emerald-500" /> : <ArrowRight size={10} className="inline mr-1 text-blue-400" />}
                    {tip}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Stresstest */}
      <Card title="Stresstest – Was passiert bei Dividendenkürzungen?" sub="Simulation: Top 5 Positionen kürzen ihre Dividende">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">Aktuell</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(stress20.currentAnnualDiv)}</div>
            <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Jährliche Dividende</div>
          </div>
          <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
              <TrendingDown size={12} /> 20 % Kürzung
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{fmt(stress20.stressedAnnualDiv)}</div>
            <div className="text-xs text-amber-500/70 mt-1">-{fmt(stress20.lostIncome)} Einkommensverlust</div>
          </div>
          <div className="rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
              <TrendingDown size={12} /> 50 % Kürzung
            </div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{fmt(stress50.stressedAnnualDiv)}</div>
            <div className="text-xs text-red-500/70 mt-1">-{fmt(stress50.lostIncome)} Einkommensverlust</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-400 dark:text-zinc-500">
          Betroffene Top 5: {stress20.affectedSymbols.map(s => (
            <span key={s} className="font-mono bg-slate-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded mx-0.5">{s}</span>
          ))}
        </div>
      </Card>

      {/* Freibetrag Tracker */}
      <Card title="Sparerpauschbetrag-Tracker" sub="1.000 € Freibetrag für Kapitaleinkünfte (Einzelveranlagung)">
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-zinc-400">{fmt(freibetrag.used)} genutzt</span>
            <span className="text-slate-500 dark:text-zinc-400">{fmt(freibetrag.freibetrag)} Freibetrag</span>
          </div>
          <div className="w-full h-4 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              freibetrag.remaining <= 0 ? 'bg-gradient-to-r from-emerald-500 to-amber-400' : 'bg-emerald-500'
            }`} style={{ width: `${Math.min(100, (freibetrag.used / freibetrag.freibetrag) * 100)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div className="text-xs">
              <div className="text-slate-400 dark:text-zinc-500">Brutto-Dividende</div>
              <div className="font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">{fmt(freibetrag.annualDiv)}</div>
            </div>
            <div className="text-xs">
              <div className="text-slate-400 dark:text-zinc-500">Steuerpflichtig</div>
              <div className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5">{fmt(freibetrag.taxable)}</div>
            </div>
            <div className="text-xs">
              <div className="text-slate-400 dark:text-zinc-500">Steuer (ca. 26,375 %)</div>
              <div className="font-semibold text-red-500 mt-0.5">{fmt(freibetrag.taxAmount)}</div>
            </div>
          </div>
          {freibetrag.remaining > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl px-3 py-2">
              Noch {fmt(freibetrag.remaining)} Freibetrag verfügbar – Dividenden in dieser Höhe sind steuerfrei.
            </p>
          )}
        </div>
      </Card>

      {/* All Recommendations */}
      <Card title={`Alle Handlungsempfehlungen (${recommendations.length})`}>
        <div className="space-y-2 mt-2">
          {recommendations.map(r => {
            const cfg = prioConfig[r.priority];
            return (
              <div key={r.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 ${cfg.text}`}>{cfg.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-semibold ${cfg.text}`}>{r.title}</h4>
                      <span className="text-xs bg-white/50 dark:bg-zinc-900/50 px-1.5 py-0.5 rounded text-slate-400 dark:text-zinc-500">{r.effort}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">{r.description}</p>
                    <p className="text-xs font-semibold mt-1.5 flex items-center gap-1">
                      <ArrowRight size={10} className={cfg.text} />
                      <span className={cfg.text}>{r.impact}</span>
                    </p>
                    {r.symbols && r.symbols.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {r.symbols.map(s => (
                          <span key={s} className="text-xs bg-white/60 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700 px-1.5 py-0.5 rounded-md font-mono text-slate-500 dark:text-zinc-400">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3">
        Der Depot Health Score und die Empfehlungen basieren auf den hochgeladenen Daten und allgemeinen Kennzahlen. Sie stellen keine Finanzberatung dar.
        Steuerberechnungen sind Schätzwerte (KapESt + SolZ = 26,375 %) ohne Kirchensteuer.
      </p>
    </div>
  );
}
