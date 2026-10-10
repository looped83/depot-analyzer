import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent as ReactMouseEvent } from 'react';
import { ChevronDown, Upload } from 'lucide-react';
import type { DepotPosition, TabId } from '../lib/types';
import { DepotMetrics } from '../lib/metrics';
import { DepotContext, DEFAULT_ASSUMPTIONS, type DepotContextValue } from '../lib/depotContext';
import { NAV_GROUPS, groupOf, isTabId, tabLabel, type NavGroup } from '../lib/nav';
import { Segmented } from './ui/Controls';
import { PositionSheet, type PositionSheetHandle } from './PositionSheet';
// All tabs ship in the Dashboard chunk (App lazy-loads the Dashboard itself). Splitting
// per tab caused a load flicker on every first visit, since each pulled the shared
// recharts vendor code on demand; one wait after upload, then instant switching.
import { OverviewTab } from './tabs/OverviewTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { DividendTab } from './tabs/DividendTab';
import { CAGRTab } from './tabs/CAGRTab';
import { SavingsTab } from './tabs/SavingsTab';
import { CalendarTab } from './tabs/CalendarTab';
import { RankingTab } from './tabs/RankingTab';
import { FindingsTab } from './tabs/FindingsTab';
import { ProjectionTab } from './tabs/ProjectionTab';
import { DiversificationTab } from './tabs/DiversificationTab';
import { SafetyTab } from './tabs/SafetyTab';
import { GoalTab } from './tabs/GoalTab';
import { RebalancingTab } from './tabs/RebalancingTab';
import { QualityTab } from './tabs/QualityTab';
import { DepotCheckTab } from './tabs/DepotCheckTab';
import { MotivationTab } from './tabs/MotivationTab';

const TAB_COMPONENTS: Record<TabId, ComponentType> = {
  overview: OverviewTab,
  performance: PerformanceTab,
  rankings: RankingTab,
  dividends: DividendTab,
  calendar: CalendarTab,
  motivation: MotivationTab,
  cagr: CAGRTab,
  savings: SavingsTab,
  projection: ProjectionTab,
  goal: GoalTab,
  diversification: DiversificationTab,
  safety: SafetyTab,
  quality: QualityTab,
  'depot-check': DepotCheckTab,
  findings: FindingsTab,
  rebalancing: RebalancingTab,
};

/** The active tab lives in the URL hash (#/calendar), so reload and the back button work. */
const readHash = (): TabId => {
  const id = location.hash.replace(/^#\/?/, '');
  return isTabId(id) ? id : 'overview';
};

interface Route { tab: TabId; anchor?: string }

/** Desktop: group buttons in the header, each opening a flyout with its tabs. */
function DesktopNav({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  // Fixed positioning (captured at click time) lets the flyout escape the row's
  // overflow-x clipping – overflow-x: auto implicitly forces overflow-y: auto too.
  const [flyout, setFlyout] = useState<{ group: NavGroup; top: number; left: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeGroup = groupOf(active);

  useEffect(() => {
    if (!flyout) return;
    const onDown = (e: MouseEvent) => !navRef.current?.contains(e.target as Node) && setFlyout(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFlyout(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [flyout]);

  const toggle = (e: ReactMouseEvent<HTMLButtonElement>, group: NavGroup) => {
    if (flyout?.group.id === group.id) return setFlyout(null);
    const r = e.currentTarget.getBoundingClientRect();
    setFlyout({ group, top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 208)) });
  };

  return (
    <nav ref={navRef} aria-label="Bereiche" className="hidden min-w-0 flex-1 md:flex">
      <div className="no-scrollbar flex items-stretch overflow-x-auto">
        {NAV_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-haspopup="menu"
            aria-expanded={flyout?.group.id === g.id}
            onClick={(e) => toggle(e, g)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 text-xs font-medium transition-colors lg:px-4 ${
              activeGroup.id === g.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <g.icon size={14} />
            {g.label}
            <ChevronDown size={12} className={`transition-transform ${flyout?.group.id === g.id ? 'rotate-180' : ''}`} />
          </button>
        ))}
      </div>
      {flyout && (
        <div role="menu" style={{ top: flyout.top, left: flyout.left }} className="fixed z-50 min-w-[200px] rounded-xl border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
          {flyout.group.tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => { onSelect(t.id); setFlyout(null); }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium ${
                active === t.id ? 'bg-zinc-800/70 text-blue-400' : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

/** Mobile: the five groups in a thumb-reachable bottom bar. */
function BottomNav({ active, onSelectGroup }: { active: TabId; onSelectGroup: (g: NavGroup) => void }) {
  const activeGroup = groupOf(active);
  return (
    <nav aria-label="Bereiche" className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {NAV_GROUPS.map((g) => {
          const on = g.id === activeGroup.id;
          return (
            <button
              key={g.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onSelectGroup(g)}
              className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10px] font-medium ${on ? 'text-blue-400' : 'text-zinc-500'}`}
            >
              <g.icon size={19} strokeWidth={on ? 2.25 : 1.75} />
              {g.short}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

interface Props {
  positions: DepotPosition[];
  onReset: () => void;
}

export function Dashboard({ positions, onReset }: Props) {
  const m = useMemo(() => new DepotMetrics(positions), [positions]);
  const [route, setRoute] = useState<Route>(() => ({ tab: readHash() }));
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const sheet = useRef<PositionSheetHandle>(null);
  // Last visited tab per group, so the bottom bar returns to where you were.
  const lastInGroup = useRef(new Map<string, TabId>());

  const navigate = useCallback((tab: TabId, anchor?: string) => {
    if (location.hash !== `#/${tab}`) history.pushState(null, '', `#/${tab}`);
    setRoute({ tab, anchor });
  }, []);

  const openPosition = useCallback((symbol: string) => sheet.current?.open(symbol), []);

  useEffect(() => {
    const onPop = () => setRoute({ tab: readHash() });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // New tab starts at the top, or at the card a teaser pointed to.
  useEffect(() => {
    lastInGroup.current.set(groupOf(route.tab).id, route.tab);
    const target = route.anchor && document.getElementById(route.anchor);
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [route]);

  const ctx = useMemo<DepotContextValue>(
    () => ({ m, navigate, openPosition, assumptions, setAssumptions }),
    [m, navigate, openPosition, assumptions],
  );

  const group = groupOf(route.tab);
  const ActiveTab = TAB_COMPONENTS[route.tab];

  const reset = () => {
    history.replaceState(null, '', location.pathname + location.search);
    onReset();
  };

  return (
    <DepotContext.Provider value={ctx}>
      <div className="min-h-screen pb-24 md:pb-0">
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="mx-auto flex h-12 max-w-screen-xl items-stretch gap-4 px-4 sm:px-6 md:h-14">
            <div className="flex shrink-0 items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-6 w-6" />
              <span className="text-sm font-semibold text-white md:hidden lg:inline">Depot Analyzer</span>
            </div>
            <DesktopNav active={route.tab} onSelect={navigate} />
            <button
              type="button"
              onClick={reset}
              className="ml-auto flex shrink-0 items-center gap-1.5 self-center rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Upload size={14} />
              <span>Neue Datei</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-screen-xl space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-8">
          <div className="space-y-3">
            <h1 className="text-xl font-semibold text-white">{tabLabel(route.tab)}</h1>
            <div className="md:hidden">
              <Segmented
                label={`${group.label} – Ansichten`}
                options={group.tabs.map((t) => ({ value: t.id, label: t.label }))}
                value={route.tab}
                onChange={(id) => navigate(id)}
              />
            </div>
          </div>
          <ActiveTab />
        </main>

        <footer className="mx-auto max-w-screen-xl px-4 py-6 text-center text-xs text-zinc-600 sm:px-6">
          Depot Analyzer · Alle Werte sind Schätzungen auf Basis deiner Datei – keine Finanzberatung.
        </footer>
      </div>

      <BottomNav active={route.tab} onSelectGroup={(g) => navigate(lastInGroup.current.get(g.id) ?? g.tabs[0].id)} />
      <PositionSheet ref={sheet} m={m} />
    </DepotContext.Provider>
  );
}
