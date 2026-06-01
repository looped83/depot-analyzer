import React, { useMemo } from 'react';
import type { DepotPosition } from '../../lib/types';
import { generateFindings, type Finding } from '../../lib/findings';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface Props { positions: DepotPosition[] }

const categoryConfig = {
  success: {
    icon: <CheckCircle size={16} />,
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  info: {
    icon: <Info size={16} />,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-300',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  danger: {
    icon: <XCircle size={16} />,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

function FindingCard({ finding }: { finding: Finding }) {
  const cfg = categoryConfig[finding.category];
  return (
    <div className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className={`flex items-start gap-2 ${cfg.iconColor}`}>
        <span className="mt-0.5 shrink-0">{cfg.icon}</span>
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${cfg.text}`}>{finding.title}</h3>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300 leading-relaxed">{finding.detail}</p>
          {finding.symbols && finding.symbols.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {finding.symbols.map((sym) => (
                <span key={sym} className="text-xs bg-white/60 dark:bg-gray-700/60 px-2 py-0.5 rounded-full font-mono">{sym}</span>
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

  const grouped = {
    danger: findings.filter((f) => f.category === 'danger'),
    warning: findings.filter((f) => f.category === 'warning'),
    info: findings.filter((f) => f.category === 'info'),
    success: findings.filter((f) => f.category === 'success'),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {(['danger', 'warning', 'info', 'success'] as const).map((cat) => (
          <div key={cat} className={`rounded-xl border p-3 text-center ${categoryConfig[cat].bg} ${categoryConfig[cat].border}`}>
            <div className={`text-2xl font-bold ${categoryConfig[cat].text}`}>{grouped[cat].length}</div>
            <div className={`text-xs opacity-70 ${categoryConfig[cat].text}`}>
              {cat === 'danger' ? 'Kritisch' : cat === 'warning' ? 'Warnung' : cat === 'info' ? 'Info' : 'Positiv'}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
        ⚠️ Diese Analyse dient ausschließlich zur Information und stellt keine Finanzberatung dar. Alle Berechnungen basieren auf den hochgeladenen Daten.
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
