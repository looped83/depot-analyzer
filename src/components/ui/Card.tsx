import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface CardProps {
  title?: string;
  sub?: ReactNode;
  info?: string;
  /** Right-aligned header slot (search field, segmented control, …). */
  action?: ReactNode;
  /** Body without padding – for tables that run edge to edge. */
  flush?: boolean;
  /** Anchor target for teaser jumps from other tabs. */
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Card({ title, sub, info, action, flush, id, className = '', children }: CardProps) {
  const hasHeader = Boolean(title || action);
  const body = flush ? 'pt-3' : hasHeader ? 'px-4 pb-4 pt-3 sm:px-5 sm:pb-5' : 'p-4 sm:p-5';
  return (
    <section id={id} className={`card scroll-mt-20 min-w-0 ${className}`}>
      {hasHeader && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {title && <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>}
              {info && <InfoTip text={info} />}
            </div>
            {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={body}>{children}</div>
    </section>
  );
}

const TIP_WIDTH = 224;

/** Info icon with an explanation. Hover (mouse) or tap/focus (touch, keyboard) opens it. */
export function InfoTip({ text }: { text: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    // Fixed + clamped to the viewport so tips near the screen edge stay readable.
    const left = Math.min(Math.max(8, r.left + r.width / 2 - TIP_WIDTH / 2), window.innerWidth - TIP_WIDTH - 8);
    setPos({ top: r.top - 6, left });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', hide, { passive: true, once: true });
    return () => window.removeEventListener('scroll', hide);
  }, [pos]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label="Info"
        aria-expanded={pos !== null}
        onClick={() => (pos ? hide() : show())}
        // Hover only for real mice: on touch, the emulated mouseenter would open the tip
        // and the following click would toggle it closed again.
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        onBlur={hide}
        className="-m-1 p-1 text-zinc-600 transition-colors hover:text-blue-400"
      >
        <Info size={13} />
      </button>
      {pos && (
        <span
          role="tooltip"
          style={{ top: pos.top, left: pos.left, width: TIP_WIDTH }}
          className="pointer-events-none fixed z-50 -translate-y-full rounded-xl bg-zinc-700 px-3 py-2 text-[11px] normal-case tracking-normal leading-relaxed text-white shadow-xl"
        >
          {text}
        </span>
      )}
    </>
  );
}

/** Small footnote for assumptions and disclaimers. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="px-1 text-xs leading-relaxed text-zinc-500">{children}</p>;
}
