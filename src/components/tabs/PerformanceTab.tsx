import { useDepot } from '../../lib/depotContext';
import { fmt, fmtPct, fmtSigned } from '../../lib/format';
import type { DepotPosition } from '../../lib/types';
import { TONE, type Tone } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { BarList } from '../ui/Bars';
import { PositionTable } from '../tables/PositionTable';

const TOP_N = 10;

const plTone = (v: number): Tone => (v >= 0 ? 'success' : 'danger');

const toBars = (list: DepotPosition[]) =>
  list.map((p) => ({
    key: p.symbol, label: p.symbol, sub: fmtPct(p.gewinnVerlustPct, 1), symbol: p.symbol,
    value: p.gewinnVerlust, display: fmtSigned(p.gewinnVerlust), tone: plTone(p.gewinnVerlust),
  }));

export function PerformanceTab() {
  const { m } = useDepot();
  const withCost = m.positions.filter((p) => p.einstandswert > 0);
  const missing = m.active.length - m.active.filter((p) => p.einstandswert > 0).length;

  if (withCost.length === 0) {
    return (
      <Callout tone="info" title="Keine Kaufkurs-Daten vorhanden">
        Ergänze die Spalten „Kaufkurs“ und „Stückzahl“ in deiner Depot-Datei, um Gewinn und Verlust je Position auszuwerten.
      </Callout>
    );
  }

  const einstand = withCost.reduce((s, p) => s + p.einstandswert, 0);
  const wert = withCost.reduce((s, p) => s + p.wert, 0);
  const pl = wert - einstand;
  const winners = withCost.filter((p) => p.gewinnVerlust > 0).sort((a, b) => b.gewinnVerlust - a.gewinnVerlust);
  const losers = withCost.filter((p) => p.gewinnVerlust < 0).sort((a, b) => a.gewinnVerlust - b.gewinnVerlust);
  const topSub = (n: number) => (n > TOP_N ? `Top ${TOP_N} von ${n}` : `${n} Positionen`);

  return (
    <>
      <KPIGrid>
        <KPICard title="Einstandswert" value={fmt(einstand)} sub={`${withCost.length} Positionen mit Kaufkurs`} info="Kaufkurs × Stückzahl über alle Positionen mit hinterlegtem Kaufkurs." />
        <KPICard title="Aktueller Wert" value={fmt(wert)} sub="Derselben Positionen" />
        <KPICard title="Gewinn / Verlust" value={fmtSigned(pl)} sub={fmtPct(einstand > 0 ? (pl / einstand) * 100 : 0, 1)} tone={plTone(pl)} />
        <KPICard title="Im Plus / Minus" value={`${winners.length} / ${losers.length}`} sub="Positionen" />
      </KPIGrid>

      {missing > 0 && (
        <Callout tone="warning" title={`${missing} ${missing === 1 ? 'Position' : 'Positionen'} ohne Kaufkurs oder Stückzahl`}>
          Sie fehlen in dieser Auswertung.
        </Callout>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Größte Gewinne" sub={topSub(winners.length)}>
          <BarList items={toBars(winners.slice(0, TOP_N))} />
        </Card>
        <Card title="Größte Verluste" sub={topSub(losers.length)}>
          <BarList items={toBars(losers.slice(0, TOP_N))} />
        </Card>
      </div>

      <PositionTable
        title="Performance je Position"
        data={[...withCost].sort((a, b) => b.gewinnVerlustPct - a.gewinnVerlustPct)}
        columns={[
          { key: 'gewinnVerlustPct', label: 'G/V %', align: 'right', render: (p) => <span className={TONE[plTone(p.gewinnVerlust)].text}>{fmtPct(p.gewinnVerlustPct, 1)}</span> },
          { key: 'gewinnVerlust', label: 'G/V €', align: 'right', hide: 'sm', render: (p) => <span className={TONE[plTone(p.gewinnVerlust)].text}>{fmtSigned(p.gewinnVerlust)}</span> },
          { key: 'wert', label: 'Wert', align: 'right', render: (p) => fmt(p.wert) },
          { key: 'einstandswert', label: 'Einstand', align: 'right', hide: 'md', render: (p) => fmt(p.einstandswert) },
          { key: 'kaufkurs', label: 'Kaufkurs', align: 'right', hide: 'lg', render: (p) => fmt(p.kaufkurs, 2) },
          { key: 'aktuellerKurs', label: 'Kurs', align: 'right', hide: 'lg', render: (p) => fmt(p.aktuellerKurs, 2) },
        ]}
      />
    </>
  );
}
