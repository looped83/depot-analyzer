import React from 'react';
import type { DepotPosition } from '../../lib/types';
import { fmt, fmtPct } from '../../lib/format';
import { Trophy, TrendingUp, DollarSign, Star, AlertTriangle, Search } from 'lucide-react';

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
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{text}</span>
  );
}

function RankCard({ section }: { section: RankingSection }) {
  return (
    <div className={`rounded-xl border p-4 ${section.color}`}>
      <div className="flex items-center gap-2 mb-3">
        <span>{section.icon}</span>
        <div>
          <h3 className="text-sm font-bold">{section.title}</h3>
          <p className="text-xs opacity-60">{section.description}</p>
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
      color: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10',
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
      color: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10',
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
      color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10',
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
      color: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10',
      items: [...active].sort((a, b) => b.chowderScore - a.chowderScore).map((p) => ({
        pos: p,
        value: p.chowderScore.toFixed(1),
      })),
    },
    {
      id: 'contribution',
      title: 'Highest Dividend Contribution',
      description: 'Größte absolute Dividendenzahler',
      icon: <DollarSign size={16} className="text-teal-600" />,
      color: 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/10',
      items: [...active].sort((a, b) => b.annualDividend - a.annualDividend).map((p) => ({
        pos: p,
        value: fmt(p.annualDividend),
        badge: `${p.dividendContribution.toFixed(0)}%`,
      })),
    },
    {
      id: 'sparplan',
      title: 'Best Sparplan Candidate',
      description: 'Hoher Score + Aufbau-Status + untergewichtet',
      icon: <TrendingUp size={16} className="text-emerald-600" />,
      color: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10',
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
      color: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10',
      items: [...active].sort((a, b) => b.portfolioWeight - a.portfolioWeight).slice(0, 10).map((p) => ({
        pos: p,
        value: `${p.portfolioWeight.toFixed(1)}%`,
        badge: p.sparbetrag > 0 ? `+${p.sparbetrag}€` : undefined,
      })),
    },
    {
      id: 'underweight',
      title: 'Possible Underweight',
      description: 'Qualitätsposition mit niedrigem Gewicht',
      icon: <Search size={16} className="text-indigo-600" />,
      color: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10',
      items: positions
        .filter((p) => p.dividendScore >= 60 && p.portfolioWeight < 3 && p.status === 'Aufbau')
        .sort((a, b) => b.dividendScore - a.dividendScore)
        .map((p) => ({
          pos: p,
          value: `${p.portfolioWeight.toFixed(1)}%`,
          badge: `Score: ${p.dividendScore}`,
        })),
    },
    {
      id: 'watchlist',
      title: 'Watchlist / Review Needed',
      description: 'Beobachten + Verkauf + niedrige Scores',
      icon: <AlertTriangle size={16} className="text-red-600" />,
      color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10',
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Transparentes Scoring: <span className="font-mono">Dividend Score = 40% norm. Yield + 40% norm. CAGR + 10% Ausschüttungsfrequenz + 10% Priorität/Status</span>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <RankCard key={s.id} section={s} />
        ))}
      </div>
    </div>
  );
}
