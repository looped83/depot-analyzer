import { useDepot } from '../../lib/depotContext';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { TONE, scoreLabel, scoreTone } from '../../lib/score';
import { MAX_WEIGHT } from '../../lib/risk';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { ProgressBar } from '../ui/Bars';
import { Callout } from '../ui/Callout';
import { ChipList } from '../ui/Chip';
import { StatusBadge, PrioBadge } from '../ui/Badges';
import { PositionTable } from '../tables/PositionTable';

export function OverviewTab() {
  const { m } = useDepot();
  const { totals, health, freibetrag, cashflow, positions } = m;
  const netDiv = freibetrag.annualDiv - freibetrag.taxAmount;
  const aufbau = positions.filter((p) => p.status === 'Aufbau').length;
  const watch = m.active.filter((p) => p.status === 'Beobachten');
  const sell = m.active.filter((p) => p.status === 'Verkauf');
  const byWert = [...positions].sort((a, b) => b.wert - a.wert);
  const sum = (list: typeof watch) => list.reduce((s, p) => s + p.wert, 0);

  return (
    <>
      <KPIGrid>
        <KPICard title="Depotwert" value={fmt(totals.totalWert)} sub={`${fmtNum(positions.length)} Positionen · ${fmtNum(aufbau)} im Aufbau`} />
        <KPICard title="Dividende / Jahr" value={fmt(totals.totalAnnualDiv)} sub={`Ø ${fmt(totals.totalMonthlyDiv)} / Monat, brutto`} info="Erwartete Brutto-Dividende aus aktuellem Wert × Yield." />
        <KPICard title="Depot-Yield" value={fmtPct(totals.weightedYield)} sub="Nach Wert gewichtet" info="Jahresdividende geteilt durch Depotwert – große Positionen zählen stärker." />
        <KPICard title="Sparrate" value={fmt(totals.totalSparbetrag)} sub="Pro Ausführungszyklus" info="Summe aller aktiven Sparpläne pro Zyklus." />
      </KPIGrid>

      <KPIGrid>
        <KPICard title="Health Score" value={`${fmtNum(health.overall)} / 100`} sub={scoreLabel(health.overall)} tone={scoreTone(health.overall)} to={{ tab: 'depot-check' }}>
          <ProgressBar value={health.overall} tone={scoreTone(health.overall)} />
        </KPICard>
        <KPICard
          title="Netto-Dividende"
          value={fmt(netDiv)}
          sub={freibetrag.remaining > 0 ? `${fmt(freibetrag.remaining)} Freibetrag frei` : `${fmt(freibetrag.taxAmount)} Steuer / Jahr`}
          to={{ tab: 'dividends', anchor: 'steuer' }}
        />
        <KPICard
          title="Top-5-Gewicht"
          value={fmtPct(m.top5Weight, 1)}
          sub={m.top5Weight > 50 ? 'Erhöhtes Klumpenrisiko' : 'Im normalen Bereich'}
          tone={m.top5Weight > 50 ? 'warning' : undefined}
          to={{ tab: 'diversification', anchor: 'gewichtung' }}
        />
        <KPICard
          title="Cashflow"
          value={`${cashflow.monthsWithIncome} / 12 Monate`}
          sub="mit Dividendeneingang"
          tone={cashflow.monthsWithIncome < 12 ? 'warning' : undefined}
          to={{ tab: 'calendar' }}
        />
      </KPIGrid>

      {(watch.length > 0 || sell.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {watch.length > 0 && (
            <Callout tone="warning" title={`${watch.length} unter Beobachtung · ${fmt(sum(watch))} gebunden`}>
              <ChipList items={watch.map((p) => ({ symbol: p.symbol }))} />
            </Callout>
          )}
          {sell.length > 0 && (
            <Callout tone="danger" title={`${sell.length} zum Verkauf · ${fmt(sum(sell))} freisetzbar`}>
              <ChipList items={sell.map((p) => ({ symbol: p.symbol }))} />
            </Callout>
          )}
        </div>
      )}

      <PositionTable
        title="Alle Positionen"
        sub="Nach Depotwert sortiert · Zeile antippen für Details"
        data={byWert}
        searchKeys={['broker', 'kategorie', 'status', 'typ']}
        columns={[
          { key: 'wert', label: 'Wert', align: 'right', render: (p) => fmt(p.wert) },
          {
            key: 'portfolioWeight', label: 'Gewicht', align: 'right',
            render: (p) => <span className={p.portfolioWeight > MAX_WEIGHT ? TONE.warning.text : ''}>{fmtPct(p.portfolioWeight, 1)}</span>,
          },
          { key: 'yield', label: 'Yield', align: 'right', hide: 'sm', render: (p) => fmtPct(p.yield) },
          { key: 'prio', label: 'Prio', align: 'center', hide: 'sm', render: (p) => <PrioBadge prio={p.prio} /> },
          { key: 'status', label: 'Status', align: 'center', hide: 'md', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'broker', label: 'Broker', hide: 'lg' },
          { key: 'kategorie', label: 'Kategorie', hide: 'lg' },
        ]}
      />
    </>
  );
}
