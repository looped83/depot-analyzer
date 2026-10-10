import { TONE, type Tone } from '../../lib/score';

const STATUS_TONE: Record<string, Tone> = {
  Aufbau: 'success',
  Erledigt: 'info',
  Pause: 'neutral',
  Beobachten: 'warning',
  Verkauf: 'danger',
};

const PRIO_TONE: Record<string, Tone> = { A: 'success', B: 'info', C: 'warning', D: 'warning', E: 'danger' };

const PILL = 'inline-block whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none';

export function StatusBadge({ status }: { status: string }) {
  const t = TONE[STATUS_TONE[status] ?? 'neutral'];
  return <span className={`${PILL} ${t.soft} ${t.text}`}>{status || '—'}</span>;
}

export function PrioBadge({ prio }: { prio: string | null }) {
  if (!prio) return <span className="text-xs text-zinc-600">—</span>;
  const t = TONE[PRIO_TONE[prio] ?? 'neutral'];
  return <span className={`${PILL} font-bold ${t.soft} ${t.text}`}>{prio}</span>;
}
