import { createContext, useContext } from 'react';
import type { DepotMetrics } from './metrics';
import type { ProjectionParams, TabId } from './types';
import { ASSUMED_MONTHLY_INVESTMENT } from './calculations';

/** Projection assumptions shared by every forward-looking view (Ausblick, Ziel, Sparpläne, Motivation). */
export const DEFAULT_ASSUMPTIONS: ProjectionParams = {
  dividendGrowthRate: 5,
  monthlySavings: ASSUMED_MONTHLY_INVESTMENT,
  reinvest: true,
  capitalGrowthRate: 6,
};

export interface DepotContextValue {
  m: DepotMetrics;
  /** Switch tab, optionally scrolling to a card id on the target tab. */
  navigate: (tab: TabId, anchor?: string) => void;
  openPosition: (symbol: string) => void;
  assumptions: ProjectionParams;
  setAssumptions: (next: ProjectionParams) => void;
}

export const DepotContext = createContext<DepotContextValue | null>(null);

export function useDepot(): DepotContextValue {
  const ctx = useContext(DepotContext);
  if (!ctx) throw new Error('useDepot must be used inside the Dashboard');
  return ctx;
}

/** Same as useDepot, but safe in components that may also render outside the Dashboard. */
export const useOptionalDepot = () => useContext(DepotContext);
