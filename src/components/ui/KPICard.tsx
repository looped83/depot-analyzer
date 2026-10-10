import React from 'react';
import { InfoTip } from './Card';

interface Props {
  title: string;
  value: string;
  sub?: string;
  info?: string;
  icon?: React.ReactNode;
}

export function KPICard({ title, value, sub, info, icon }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 flex flex-col gap-2 shadow-sm border border-slate-100 dark:border-zinc-800 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          {title}
          {info && <InfoTip text={info} />}
        </span>
        {icon && <span className="text-slate-300 dark:text-zinc-600">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white leading-none">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-slate-400 dark:text-zinc-500">{sub}</div>
      )}
    </div>
  );
}
