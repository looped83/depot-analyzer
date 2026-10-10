import readXlsxFile from 'read-excel-file/browser';
import type { DepotPosition } from './types';

function parseRatingScore(rating: unknown): { emoji: string; score: number } {
  if (typeof rating !== 'string') return { emoji: '❓', score: 0 };
  const match = rating.match(/(\d+)/);
  const score = match ? parseInt(match[1], 10) : 0;
  return { emoji: rating, score };
}

function parseFreqScore(raw: unknown, freq: string): number {
  if (typeof raw === 'number') return raw;
  if (freq === 'monatlich') return 3;
  if (freq === 'quartalsweise') return 2;
  if (freq === 'jährlich') return 1;
  return 0;
}

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  return String(v).trim();
}

/** Reads the "Depot" sheet (or the first sheet) of an .xlsx file. */
export async function parseExcel(file: File): Promise<DepotPosition[]> {
  let sheets;
  try {
    sheets = await readXlsxFile(file);
  } catch {
    throw new Error('Die Datei konnte nicht gelesen werden. Ist es eine gültige .xlsx-Datei?');
  }
  const sheet = sheets.find((s) => s.sheet === 'Depot') ?? sheets[0];
  return rowsToPositions((sheet?.data ?? []) as unknown[][]);
}

/** Turns raw sheet rows (header row + data rows) into positions. Pure, so it is unit-testable. */
export function rowsToPositions(rows: unknown[][]): DepotPosition[] {
  if (rows.length < 2) throw new Error('Die Excel-Datei enthält keine Daten.');

  // Find header row (first row with "Symbol" or "Wert")
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const r = rows[i] as unknown[];
    if (r.some((c) => typeof c === 'string' && /symbol|wert|name/i.test(c))) {
      headerIdx = i;
      break;
    }
  }

  const headers = (rows[headerIdx] as unknown[]).map((h) =>
    str(h).toLowerCase()
  );

  const col = (...names: string[]) =>
    headers.findIndex((h) => names.some((name) => h.includes(name.toLowerCase())));

  const iZyklus = col('zyklus');
  const iSymbol = col('symbol');
  if (iSymbol === -1) throw new Error('Spalte „Symbol“ wurde in der Excel-Datei nicht gefunden.');
  const iName = col('name');
  const iStatus = col('status');
  const iPrio = col('prio');
  const iBroker = col('broker');
  const iWert = col('wert');
  const iYield = col('yield');
  const iCagr = col('cagr');
  const iSpar = col('sparbetrag');
  const iRating = col('rating');
  const iFreq = col('ausschüttungsfrequenz');
  const iMonate = col('ausschüttungsmonate');
  const iFreqScore = col('freqscore');
  const iISIN = col('isin');
  const iWKN = col('wkn');
  const iTyp = col('typ');
  const iKat = col('kategorie');
  const iStueckzahl = col('stückzahl', 'stueckzahl', 'bestand');
  const iKaufkurs = col('kaufkurs', 'kaufpreis', 'einstandskurs', 'einstandspreis');

  const positions: DepotPosition[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];

    const symbol = str(row[iSymbol]);
    if (!symbol) continue; // skip totals/empty rows

    // Skip if looks like a totals row (no symbol, or symbol is numeric)
    if (/^\d+$/.test(symbol)) continue;

    const freq = str(row[iFreq]);
    const { emoji: ratingEmoji, score: ratingScore } = parseRatingScore(row[iRating]);

    positions.push({
      zyklus: row[iZyklus] != null ? num(row[iZyklus]) : null,
      symbol,
      name: str(row[iName], symbol),
      status: str(row[iStatus], 'Aufbau'),
      prio: (['A', 'B', 'C', 'D', 'E'].includes(str(row[iPrio])) ? str(row[iPrio]) : null) as DepotPosition['prio'],
      broker: str(row[iBroker], 'Unbekannt'),
      wert: num(row[iWert]),
      yield: num(row[iYield]),
      cagr5j: num(row[iCagr]),
      sparbetrag: num(row[iSpar]),
      rating: ratingEmoji,
      ratingScore,
      ausschuettungsfrequenz: freq || 'quartalsweise',
      ausschuettungsmonate: str(row[iMonate]),
      freqScore: parseFreqScore(row[iFreqScore], freq),
      isin: str(row[iISIN]),
      wkn: str(row[iWKN]),
      typ: str(row[iTyp], 'Aktie'),
      kategorie: str(row[iKat], 'Growth'),
      stueckzahl: num(row[iStueckzahl]),
      kaufkurs: num(row[iKaufkurs]),
      // computed fields placeholder – filled by calculateDerived
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
    });
  }

  return positions;
}
