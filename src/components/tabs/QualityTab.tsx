import { useState } from 'react';
import { useDepot } from '../../lib/depotContext';
import type { DepotPosition } from '../../lib/types';
import { fmtNum, fmtPct } from '../../lib/format';
import { TONE, scoreTone } from '../../lib/score';
import { fieldCoverage, positionCompleteness } from '../../lib/quality';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { ScoreRow, BarList, CellBar } from '../ui/Bars';
import { Segmented } from '../ui/Controls';
import { ChipList } from '../ui/Chip';
import { PrioBadge } from '../ui/Badges';
import { PositionTable } from '../tables/PositionTable';

const grade = (s: number) =>
  s >= 85 ? 'A+' : s >= 75 ? 'A' : s >= 65 ? 'B+' : s >= 55 ? 'B' : s >= 45 ? 'C+' : s >= 35 ? 'C' : 'D';

const BUCKETS = [['0–24', 0, 25], ['25–49', 25, 50], ['50–74', 50, 75], ['75–100', 75, 101]] as const;

const DISTRIBUTIONS = {
  score: { label: 'D-Score', group: (p: DepotPosition) => bucket(p.dividendScore) },
  rating: { label: 'Rating', group: (p: DepotPosition) => (p.ratingScore > 0 ? bucket(p.ratingScore) : 'ohne') },
  prio: { label: 'Prio', group: (p: DepotPosition) => (p.prio ? `Prio ${p.prio}` : 'ohne') },
  status: { label: 'Status', group: (p: DepotPosition) => p.status || 'ohne' },
} as const;
type Distribution = keyof typeof DISTRIBUTIONS;

function bucket(v: number) {
  return BUCKETS.find(([, min, max]) => v >= min && v < max)?.[0] ?? '—';
}

const INCOMPLETE = 60;

export function QualityTab() {
  const { m } = useDepot();
  const { positions } = m;
  const [dist, setDist] = useState<Distribution>('score');

  const coverage = fieldCoverage(positions);
  const weightedScore = m.weighted('dividendScore');
  const withPrio = positions.filter((p) => p.prio).length;
  const withRating = positions.filter((p) => p.ratingScore > 0).length;
  const n = positions.length || 1;

  const dimensions = [
    { label: 'Datenvollständigkeit', score: coverage.avg, detail: `Ø ${fmtPct(coverage.avg, 0)} der Felder befüllt` },
    { label: 'Prioritäten gesetzt', score: (withPrio / n) * 100, detail: `${withPrio} von ${positions.length}` },
    { label: 'Rating vorhanden', score: (withRating / n) * 100, detail: `${withRating} von ${positions.length}` },
    { label: 'Gewichteter D-Score', score: weightedScore, detail: 'Dividendenqualität nach Depotwert' },
  ];
  const overall = dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length;

  const rows = positions.map((p) => ({ ...p, completeness: positionCompleteness(p) })).sort((a, b) => a.completeness - b.completeness);
  const incomplete = rows.filter((p) => p.wert > 0 && p.completeness < INCOMPLETE);

  const distribution = (() => {
    const map = new Map<string, number>();
    for (const p of positions) {
      const g = DISTRIBUTIONS[dist].group(p);
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    const order = dist === 'score' || dist === 'rating' ? BUCKETS.map((b) => b[0] as string) : [...map.keys()].sort();
    return [...order, ...[...map.keys()].filter((k) => !order.includes(k))].filter((k) => map.has(k)).map((k) => ({ name: k, count: map.get(k)! }));
  })();

  return (
    <>
      <KPIGrid>
        <KPICard title="Portfolio-Note" value={grade(overall)} sub={`${fmtNum(overall)} / 100 · Ø der 4 Dimensionen`} tone={scoreTone(overall)}
          info="A+ ≥ 85, A ≥ 75, B+ ≥ 65, B ≥ 55, C+ ≥ 45, C ≥ 35, D darunter." />
        <KPICard title="Datenvollständigkeit" value={fmtPct(coverage.avg, 0)} sub="Ø über 5 Felder" tone={scoreTone(coverage.avg)} />
        <KPICard title="Gew. D-Score" value={fmtNum(weightedScore)} sub="Nach Depotwert" tone={scoreTone(weightedScore)} />
        <KPICard title="Unvollständig" value={fmtNum(incomplete.length)} sub={`aktive Positionen < ${INCOMPLETE} %`} tone={incomplete.length > 0 ? 'warning' : 'success'} />
      </KPIGrid>

      {incomplete.length > 0 && (
        <Callout tone="info" title={`${incomplete.length} aktive Positionen mit lückenhaften Daten`}>
          <p>ISIN, Priorität oder Ausschüttungsmonate ergänzen – das verbessert alle Analysen.</p>
          <ChipList items={incomplete.map((p) => ({ symbol: p.symbol, meta: fmtPct(p.completeness, 0) }))} max={10} />
        </Callout>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Qualitäts-Scorecard">
          <div className="space-y-4">
            {dimensions.map((d) => <ScoreRow key={d.label} label={d.label} detail={d.detail} score={d.score} />)}
          </div>
        </Card>
        <Card title="Vollständigkeit je Feld" sub="Anteil der Positionen mit Wert">
          <BarList
            items={coverage.fields.map((f) => ({
              key: f.label, label: f.label, value: f.pct, display: `${fmtPct(f.pct, 0)} · ${f.count}`, tone: scoreTone(f.pct),
            }))}
            max={100}
          />
        </Card>
      </div>

      <Card title="Verteilung" sub="Anzahl Positionen"
        action={<Segmented label="Verteilung nach" value={dist} onChange={setDist} options={(Object.keys(DISTRIBUTIONS) as Distribution[]).map((d) => ({ value: d, label: DISTRIBUTIONS[d].label }))} />}
      >
        <BarList items={distribution.map((d) => ({ key: d.name, label: d.name, value: d.count, display: `${d.count}` }))} />
      </Card>

      <PositionTable
        title="Vollständigkeit je Position"
        sub="Lückenhafteste zuerst"
        data={rows}
        searchKeys={['status']}
        columns={[
          { key: 'completeness', label: 'Daten', align: 'right', render: (p) => <CellBar pct={p.completeness} label={fmtPct(p.completeness, 0)} tone={scoreTone(p.completeness)} /> },
          { key: 'yield', label: 'Yield', align: 'right', render: (p) => <span className={p.yield === 0 ? TONE.danger.text : ''}>{fmtPct(p.yield)}</span> },
          { key: 'prio', label: 'Prio', align: 'center', hide: 'sm', render: (p) => <PrioBadge prio={p.prio} /> },
          { key: 'ratingScore', label: 'Rating', align: 'right', hide: 'sm', render: (p) => (p.ratingScore > 0 ? p.ratingScore : <span className={TONE.danger.text}>—</span>) },
          { key: 'isin', label: 'ISIN', hide: 'lg', render: (p) => p.isin || <span className={TONE.danger.text}>—</span> },
        ]}
      />
    </>
  );
}
