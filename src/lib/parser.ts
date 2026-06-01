import * as XLSX from 'xlsx';
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

export function parseExcel(file: File): Promise<DepotPosition[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Try "Depot" sheet first, otherwise first sheet
        const sheetName = workbook.SheetNames.includes('Depot')
          ? 'Depot'
          : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: null,
        });

        if (rows.length < 2) {
          reject(new Error('Die Excel-Datei enthält keine Daten.'));
          return;
        }

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

        const col = (name: string) =>
          headers.findIndex((h) => h.includes(name.toLowerCase()));

        const iZyklus = col('zyklus');
        const iSymbol = col('symbol');
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
            zyklus: row[iZyklus] !== null ? num(row[iZyklus]) : null,
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
            // computed fields placeholder – filled by calculateDerived
            annualDividend: 0,
            monthlyDividend: 0,
            portfolioWeight: 0,
            dividendContribution: 0,
            dividendScore: 0,
            chowderScore: 0,
          });
        }

        resolve(positions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
    reader.readAsArrayBuffer(file);
  });
}
