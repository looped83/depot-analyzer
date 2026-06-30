import React, { useMemo } from 'react';
import type { DepotPosition } from '../../lib/types';
import { generateFindings, type Finding } from '../../lib/findings';
import { computeTotals, computeMonthlyCalendar, topDividendContributors } from '../../lib/calculations';
import { fmt, fmtNum } from '../../lib/format';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface Props { positions: DepotPosition[] }

const categoryConfig = {
  success: {
    icon: <CheckCircle size={16} />,
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/30',
    border: 'border-emerald-100 dark:border-emerald-900/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  info: {
    icon: <Info size={16} />,
    bg: 'bg-blue-50/60 dark:bg-blue-950/30',
    border: 'border-blue-100 dark:border-blue-900/60',
    text: 'text-blue-800 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    border: 'border-amber-100 dark:border-amber-900/60',
    text: 'text-amber-800 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    icon: <XCircle size={16} />,
    bg: 'bg-red-50/60 dark:bg-red-950/30',
    border: 'border-red-100 dark:border-red-900/60',
    text: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

function FindingCard({ finding }: { finding: Finding }) {
  const cfg = categoryConfig[finding.category];
  return (
    <div className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}>
      <div className={`flex items-start gap-2 ${cfg.iconColor}`}>
        <span className="mt-0.5 shrink-0">{cfg.icon}</span>
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${cfg.text} leading-snug`}>{finding.title}</h3>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300 leading-relaxed">{finding.detail}</p>
          {finding.symbols && finding.symbols.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {finding.symbols.map((sym) => (
                <span key={sym} className="text-xs bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700 px-2 py-0.5 rounded-full font-mono text-slate-600 dark:text-zinc-400">{sym}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FindingsTab({ positions }: Props) {
  const findings = useMemo(() => generateFindings(positions), [positions]);
  const totals = useMemo(() => computeTotals(positions), [positions]);
  const active = useMemo(() => positions.filter(p => p.wert > 0), [positions]);

  const grouped = useMemo(() => ({
    danger: findings.filter((f) => f.category === 'danger'),
    warning: findings.filter((f) => f.category === 'warning'),
    info: findings.filter((f) => f.category === 'info'),
    success: findings.filter((f) => f.category === 'success'),
  }), [findings]);

  const { top: top3Div, pct: top3DivPct } = useMemo(() => topDividendContributors(active, 3), [active]);
  const stabilityScore = useMemo(() => {
    const calendar = computeMonthlyCalendar(positions);
    const monthlyIncomes = calendar.map(m => m.expectedIncome);
    const avgMonthly = monthlyIncomes.reduce((s, v) => s + v, 0) / 12;
    const stdDev = Math.sqrt(monthlyIncomes.reduce((s, v) => s + (v - avgMonthly) ** 2, 0) / 12);
    return avgMonthly > 0 ? Math.max(0, 100 - (stdDev / avgMonthly * 100)) : 0;
  }, [positions]);

  const candidates = useMemo(() => active
    .filter(p => p.status === 'Aufbau' && p.prio && ['A', 'B'].includes(p.prio))
    .sort((a, b) => {
      const scoreA = a.dividendScore * 0.5 + (a.prio === 'A' ? 30 : 15) - a.portfolioWeight * 2;
      const scoreB = b.dividendScore * 0.5 + (b.prio === 'A' ? 30 : 15) - b.portfolioWeight * 2;
      return scoreB - scoreA;
    })
    .slice(0, 6), [active]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {(['danger', 'warning', 'info', 'success'] as const).map((cat) => (
          <div key={cat} className={`rounded-2xl border p-4 text-center ${categoryConfig[cat].bg} ${categoryConfig[cat].border}`}>
            <div className={`text-2xl font-bold ${categoryConfig[cat].text}`}>{grouped[cat].length}</div>
            <div className={`text-xs opacity-70 ${categoryConfig[cat].text}`}>
              {cat === 'danger' ? 'Kritisch' : cat === 'warning' ? 'Warnung' : cat === 'info' ? 'Info' : 'Positiv'}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Einkommensabhängigkeit</div>
          <div className={`text-lg font-bold ${top3DivPct > 60 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Top 3 = {fmtNum(top3DivPct)} %
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            {top3Div.map(p => p.symbol).join(', ')} liefern {fmtNum(top3DivPct)} % der Dividende
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Cashflow-Stabilität</div>
          <div className={`text-lg font-bold ${stabilityScore > 70 ? 'text-emerald-600 dark:text-emerald-400' : stabilityScore > 40 ? 'text-amber-500' : 'text-red-500'}`}>
            {fmtNum(stabilityScore)} / 100
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            {stabilityScore > 70 ? 'Gleichmäßig verteilt' : stabilityScore > 40 ? 'Schwankend' : 'Stark unregelmäßig'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Freibetrag-Status</div>
          <div className={`text-lg font-bold ${totals.totalAnnualDiv >= 2000 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {fmtNum(Math.min(100, totals.totalAnnualDiv / 2000 * 100))} %
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            {totals.totalAnnualDiv >= 2000
              ? `${fmt(totals.totalAnnualDiv - 2000)} über Freibetrag`
              : `${fmt(2000 - totals.totalAnnualDiv)} Freibetrag frei`
            }
          </div>
        </div>
      </div>

      {/* 1.000 € Tranchen Empfehlung */}
      {candidates.length > 0 && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">1.000 € Tranchen – Priorisierte Investitionsempfehlung</p>
          <p className="text-xs text-indigo-600/70 dark:text-indigo-300/60 mb-3 leading-relaxed">
            In diese Werte sollten 1.000 € Einmalkäufe priorisiert investiert werden: hohe Scores, Prio A/B, Aufbau-Status und aktuell untergewichtet.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {candidates.map((p, i) => (
              <div key={p.symbol} className="flex items-center gap-2 bg-white/70 dark:bg-zinc-800/60 border border-indigo-100 dark:border-indigo-900/40 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-indigo-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-zinc-200 shrink-0">{p.symbol}</span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500 truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.prio === 'A' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}>{p.prio}</span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">{fmtNum(p.portfolioWeight, 1)} %</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-3">
        Diese Analyse dient ausschließlich zur Information und stellt keine Finanzberatung dar. Alle Berechnungen basieren auf den hochgeladenen Daten.
      </div>

      {(['danger', 'warning', 'info', 'success'] as const).map((cat) => (
        grouped[cat].length > 0 && (
          <div key={cat} className="space-y-3">
            <h2 className={`text-sm font-bold uppercase tracking-wide ${categoryConfig[cat].iconColor}`}>
              {cat === 'danger' ? '🔴 Kritische Hinweise' : cat === 'warning' ? '🟡 Warnungen' : cat === 'info' ? '🔵 Informationen' : '🟢 Positive Aspekte'}
              {' '}({grouped[cat].length})
            </h2>
            <div className="space-y-2">
              {grouped[cat].map((f) => <FindingCard key={f.id} finding={f} />)}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
