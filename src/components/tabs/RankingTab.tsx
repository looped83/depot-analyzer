import React from 'react';
import type { DepotPosition } from '../../lib/types';
import { fmt, fmtPct, fmtNum } from '../../lib/format';
import { Trophy, TrendingUp, DollarSign, Star, AlertTriangle } from 'lucide-react';

interface Props { positions: DepotPosition[] }

interface RankingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  items: { pos: DepotPosition; value: string; badge?: string }[];
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${color}`}>{text}</span>
  );
}

function RankCard({ section }: { section: RankingSection }) {
  return (
    <div className={`rounded-2xl border p-5 ${section.color} shadow-sm`}>
      <div className="flex items-center gap-2 mb-3">
        <span>{section.icon}</span>
        <div>
          <h3 className="text-sm font-bold">{section.title}</h3>
          <p className="text-xs text-current opacity-50 leading-relaxed">{section.description}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {section.items.slice(0, 8).map((item, i) => (
          <div key={item.pos.symbol} className="flex items-center gap-2">
            <span className="text-xs font-bold opacity-40 w-4">{i + 1}</span>
            <span className="text-xs font-semibold w-12 shrink-0">{item.pos.symbol}</span>
            <span className="text-xs opacity-70 flex-1 truncate">{item.pos.name}</span>
            {item.badge && <Badge text={item.badge} color="bg-white/30 dark:bg-black/20" />}
            <span className="text-xs font-mono font-semibold ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RankingTab({ positions }: Props) {
  const active = positions.filter((p) => p.wert > 0);

  const sections: RankingSection[] = [
    {
      id: 'overall',
      title: 'Best Overall Dividend Score',
      description: '40% Yield + 40% CAGR + 10% Freq + 10% Prio/Status',
      icon: <Trophy size={16} className="text-yellow-600" />,
      color: 'border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20',
      items: [...positions].sort((a, b) => b.dividendScore - a.dividendScore).map((p) => ({
        pos: p,
        value: String(p.dividendScore),
        badge: p.prio ?? undefined,
      })),
    },
    {
      id: 'yield',
      title: 'Highest Yield',
      description: 'Positionen mit der höchsten Dividendenrendite',
      icon: <DollarSign size={16} className="text-green-600" />,
      color: 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20',
      items: [...active].sort((a, b) => b.yield - a.yield).map((p) => ({
        pos: p,
        value: fmtPct(p.yield),
        badge: p.ausschuettungsfrequenz === 'monatlich' ? 'MON' : p.ausschuettungsfrequenz === 'quartalsweise' ? 'Q' : 'J',
      })),
    },
    {
      id: 'cagr',
      title: 'Highest CAGR 5J',
      description: 'Stärkstes historisches Dividendenwachstum',
      icon: <TrendingUp size={16} className="text-blue-600" />,
      color: 'border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20',
      items: [...active].filter((p) => p.cagr5j > 0).sort((a, b) => b.cagr5j - a.cagr5j).map((p) => ({
        pos: p,
        value: fmtPct(p.cagr5j),
      })),
    },
    {
      id: 'chowder',
      title: 'Best Yield/CAGR Mix (Chowder)',
      description: 'Yield + CAGR 5J kombiniert',
      icon: <Star size={16} className="text-purple-600" />,
      color: 'border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20',
      items: [...active].sort((a, b) => b.chowderScore - a.chowderScore).map((p) => ({
        pos: p,
        value: fmtNum(p.chowderScore, 1),
      })),
    },
    {
      id: 'contribution',
      title: 'Highest Dividend Contribution',
      description: 'Größte absolute Dividendenzahler',
      icon: <DollarSign size={16} className="text-teal-600" />,
      color: 'border-teal-100 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20',
      items: [...active].sort((a, b) => b.annualDividend - a.annualDividend).map((p) => ({
        pos: p,
        value: fmt(p.annualDividend),
        badge: `${fmtNum(p.dividendContribution)}%`,
      })),
    },
    {
      id: 'sparplan',
      title: 'Best Sparplan Candidate',
      description: 'Hoher Score + Aufbau-Status + untergewichtet',
      icon: <TrendingUp size={16} className="text-emerald-600" />,
      color: 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20',
      items: positions
        .filter((p) => p.status === 'Aufbau' && p.prio && ['A', 'B'].includes(p.prio))
        .sort((a, b) => {
          // Score: high dividend score + low portfolio weight = good buy candidate
          const scoreA = a.dividendScore - a.portfolioWeight * 2;
          const scoreB = b.dividendScore - b.portfolioWeight * 2;
          return scoreB - scoreA;
        })
        .map((p) => ({
          pos: p,
          value: fmt(p.wert === 0 ? 0 : p.wert),
          badge: p.prio ?? undefined,
        })),
    },
    {
      id: 'overweight',
      title: 'Possible Overweight',
      description: 'Positionen mit hohem Portfoliogewicht',
      icon: <AlertTriangle size={16} className="text-orange-600" />,
      color: 'border-orange-100 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20',
      items: [...active].sort((a, b) => b.portfolioWeight - a.portfolioWeight).slice(0, 10).map((p) => ({
        pos: p,
        value: `${fmtNum(p.portfolioWeight, 1)}%`,
        badge: p.sparbetrag > 0 ? `+${fmtNum(p.sparbetrag)}€` : undefined,
      })),
    },
    {
      id: 'underweight',
      title: 'Possible Underweight',
      description: 'Qualitätsposition mit niedrigem Gewicht',
      icon: <Search size={16} className="text-indigo-600" />,
      color: 'border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20',
      items: positions
        .filter((p) => p.dividendScore >= 60 && p.portfolioWeight < 3 && p.status === 'Aufbau')
        .sort((a, b) => b.dividendScore - a.dividendScore)
        .map((p) => ({
          pos: p,
          value: `${fmtNum(p.portfolioWeight, 1)}%`,
          badge: `Score: ${p.dividendScore}`,
        })),
    },
    {
      id: 'watchlist',
      title: 'Review Needed',
      description: 'Beobachten + Verkauf + niedrige Scores',
      icon: <AlertTriangle size={16} className="text-red-600" />,
      color: 'border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20',
      items: positions
        .filter((p) => p.status === 'Beobachten' || p.status === 'Verkauf' || (p.wert > 0 && p.dividendScore < 35))
        .sort((a, b) => a.dividendScore - b.dividendScore)
        .map((p) => ({
          pos: p,
          value: String(p.dividendScore),
          badge: p.status,
        })),
    },
  ];

  const avgScore = active.length > 0 ? active.reduce((s, p) => s + p.dividendScore, 0) / active.length : 0;
  const topPerformers = active.filter(p => p.dividendScore >= 70 && p.chowderScore >= 12);
  const hiddenGems = active.filter(p => p.dividendScore >= 60 && p.portfolioWeight < 2 && p.prio && ['A', 'B'].includes(p.prio))
    .sort((a, b) => b.dividendScore - a.dividendScore);
  const improvementCandidates = active.filter(p => p.dividendScore < 35 && p.wert > 0)
    .sort((a, b) => a.dividendScore - b.dividendScore);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Transparentes Scoring: <span className="font-mono">Dividend Score = 40% norm. Yield + 40% norm. CAGR + 10% Ausschüttungsfrequenz + 10% Priorität/Status</span>
      </p>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center">
          <div className="text-xs text-slate-400 dark:text-zinc-500 mb-1">Ø Dividend Score</div>
          <div className={`text-2xl font-bold ${avgScore >= 60 ? 'text-emerald-600 dark:text-emerald-400' : avgScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{fmtNum(avgScore)}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Top Performer</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{topPerformers.length}</div>
          <div className="text-xs text-emerald-500/60">Score &ge;70 & Chowder &ge;12</div>
        </div>
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-center">
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Hidden Gems</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{hiddenGems.length}</div>
          <div className="text-xs text-blue-500/60">Untergewichtet & stark</div>
        </div>
        <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4 text-center">
          <div className="text-xs text-red-500 mb-1">Schwach</div>
          <div className="text-2xl font-bold text-red-500">{improvementCandidates.length}</div>
          <div className="text-xs text-red-400/60">Score &lt;35</div>
        </div>
      </div>

      {/* Hidden Gems highlight */}
      {hiddenGems.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Hidden Gems – Starke Positionen mit geringem Gewicht</p>
          <p className="text-xs text-blue-600/70 dark:text-blue-300/60 mb-2">
            Diese Positionen haben hohe Scores aber wenig Depotgewicht. Aufstocken könnte die Portfolio-Qualität verbessern.
          </p>
          <div className="flex flex-wrap gap-2">
            {hiddenGems.slice(0, 8).map(p => (
              <span key={p.symbol} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-mono">
                {p.symbol} Score {p.dividendScore} · {fmtNum(p.portfolioWeight, 1)} %
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <RankCard key={s.id} section={s} />
        ))}
      </div>
    </div>
  );
}
