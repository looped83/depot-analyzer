import React from 'react';

interface Props {
  title?: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}

export function Card({ title, sub, children, className = '', pad = true }: Props) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm ${className}`}>
      {(title || sub) && (
        <div className="px-5 pt-5 pb-0">
          {title && <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{title}</h3>}
          {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">{sub}</p>}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

// Reusable status badge
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Aufbau:     'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    Erledigt:   'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    Beobachten: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    Verkauf:    'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

// Reusable prio badge
export function PrioBadge({ prio }: { prio: string | null }) {
  if (!prio) return <span className="text-slate-300 dark:text-zinc-600">—</span>;
  const map: Record<string, string> = {
    A: 'text-emerald-600 dark:text-emerald-400',
    B: 'text-blue-600 dark:text-blue-400',
    C: 'text-amber-600 dark:text-amber-400',
    D: 'text-orange-600 dark:text-orange-400',
    E: 'text-red-500 dark:text-red-400',
  };
  return <span className={`text-xs font-bold ${map[prio] ?? ''}`}>{prio}</span>;
}
