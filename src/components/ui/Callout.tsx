import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { TONE, type Tone } from '../../lib/score';

const ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle, neutral: Info };

interface Props {
  tone: Tone;
  title: ReactNode;
  children?: ReactNode;
}

/** Hint, warning or recommendation box. Icon + title carry the tone, never color alone. */
export function Callout({ tone, title, children }: Props) {
  const Icon = ICON[tone];
  const t = TONE[tone];
  return (
    <div className={`rounded-xl border p-3.5 sm:p-4 ${t.soft}`}>
      <div className="flex gap-2.5">
        <Icon size={16} className={`mt-px shrink-0 ${t.text}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug ${t.text}`}>{title}</p>
          {children && <div className="mt-1 space-y-2 text-xs leading-relaxed text-zinc-300">{children}</div>}
        </div>
      </div>
    </div>
  );
}
