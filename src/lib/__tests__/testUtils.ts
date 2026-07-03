import type { DepotPosition } from '../types';

/**
 * Builds a raw (pre-calculateDerived) position with sensible defaults, mirroring
 * what parser.ts produces for a row with mostly empty optional columns.
 */
export function makePosition(overrides: Partial<DepotPosition> = {}): DepotPosition {
  return {
    zyklus: null,
    symbol: 'TST',
    name: 'Test Position',
    status: 'Aufbau',
    prio: null,
    broker: 'TR',
    wert: 0,
    yield: 0,
    cagr5j: 0,
    sparbetrag: 0,
    rating: '',
    ratingScore: 0,
    ausschuettungsfrequenz: 'quartalsweise',
    ausschuettungsmonate: '',
    freqScore: 2,
    isin: '',
    wkn: '',
    typ: 'Aktie',
    kategorie: 'Growth',
    stueckzahl: 0,
    kaufkurs: 0,
    // computed fields – filled by calculateDerived
    annualDividend: 0,
    monthlyDividend: 0,
    portfolioWeight: 0,
    dividendContribution: 0,
    dividendScore: 0,
    chowderScore: 0,
    einstandswert: 0,
    aktuellerKurs: 0,
    gewinnVerlust: 0,
    gewinnVerlustPct: 0,
    ...overrides,
  };
}
