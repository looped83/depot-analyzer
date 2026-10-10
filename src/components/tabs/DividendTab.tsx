import { useDepot } from '../../lib/depotContext';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { YIELD_HIGH, YIELD_LOW, yieldTone } from '../../lib/risk';
import { TONE } from '../../lib/score';
import { PALETTE } from '../../lib/chartTheme';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { MiniStat, TileGrid } from '../ui/MiniStat';
import { ProgressBar, BarList, CellBar } from '../ui/Bars';
import { ChipList } from '../ui/Chip';
import { Donut } from '../ui/Donut';
import { PositionTable } from '../tables/PositionTable';

const INCOME_CATEGORIES = ['Income', 'High Yield'];
const INCOME_COLOR = PALETTE[2];
const GROWTH_COLOR = PALETTE[0];
const FREQUENCIES = [['monatlich', 'Monatlich'], ['quartalsweise', 'Quartalsweise'], ['halbjährlich', 'Halbjährlich'], ['jährlich', 'Jährlich']] as const;

export function DividendTab() {
  const { m } = useDepot();
  const { totals, freibetrag: fb, active } = m;
  const net = fb.annualDiv - fb.taxAmount;
  const byDiv = [...active].sort((a, b) => b.annualDividend - a.annualDividend);

  const incomeDiv = active.filter((p) => INCOME_CATEGORIES.includes(p.kategorie)).reduce((s, p) => s + p.annualDividend, 0);
  const incomePct = totals.totalAnnualDiv > 0 ? (incomeDiv / totals.totalAnnualDiv) * 100 : 0;

  const byFrequency = FREQUENCIES.map(([key, name]) => ({
    name,
    value: active.filter((p) => p.ausschuettungsfrequenz === key).reduce((s, p) => s + p.annualDividend, 0),
  }));

  const highYield = active.filter((p) => p.yield > YIELD_HIGH).sort((a, b) => b.yield - a.yield);
  const lowYield = active.filter((p) => p.yield > 0 && p.yield < YIELD_LOW).sort((a, b) => a.yield - b.yield);

  return (
    <>
      <KPIGrid>
        <KPICard title="Brutto / Jahr" value={fmt(totals.totalAnnualDiv)} sub={`Ø ${fmt(totals.totalMonthlyDiv)} / Monat`} />
        <KPICard title="Netto / Jahr" value={fmt(net)} sub={`Ø ${fmt(net / 12)} / Monat`} tone="success" info="Nach 26,375 % KapESt + SolZ auf den Betrag über dem Sparerpauschbetrag (2.000 €, gemeinsam veranlagt)." />
        <KPICard title="Depot-Yield" value={fmtPct(totals.weightedYield)} sub="Nach Wert gewichtet" />
        <KPICard title="Je 1.000 € Depot" value={fmt(totals.totalWert > 0 ? (totals.totalAnnualDiv / totals.totalWert) * 1000 : 0)} sub="Dividende pro Jahr" />
      </KPIGrid>

      <Card id="steuer" title="Steuer & Sparerpauschbetrag" sub={`${fmt(fb.freibetrag)} Freibetrag, gemeinsam veranlagt`}
        action={<span className={`text-xs font-semibold ${fb.remaining > 0 ? TONE.success.text : TONE.warning.text}`}>{fb.remaining > 0 ? `${fmt(fb.remaining)} frei` : 'Ausgeschöpft'}</span>}
      >
        <ProgressBar value={(fb.used / fb.freibetrag) * 100} gradient size="md" />
        <div className="mt-3">
          <TileGrid cols={4}>
            <MiniStat label="Brutto" value={fmt(fb.annualDiv)} />
            <MiniStat label="Steuerfrei" value={fmt(fb.used)} tone="success" />
            <MiniStat label="Steuerpflichtig" value={fmt(fb.taxable)} />
            <MiniStat label="KapESt + SolZ" value={fmt(fb.taxAmount)} tone={fb.taxAmount > 0 ? 'danger' : undefined} />
          </TileGrid>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Income vs. Growth" sub="Anteil an der Jahresdividende nach Kategorie">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div style={{ width: `${incomePct}%`, background: INCOME_COLOR }} />
            <div className="ml-0.5 flex-1" style={{ background: GROWTH_COLOR }} />
          </div>
          <div className="mt-3 flex justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-zinc-400"><span className="h-2 w-2 rounded-full" style={{ background: INCOME_COLOR }} />Income / High Yield</div>
              <div className="mt-0.5 text-lg font-semibold text-zinc-100">{fmt(incomeDiv)}</div>
              <div className="text-zinc-500">{fmtPct(incomePct, 0)}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-zinc-400">Growth / Accumulation<span className="h-2 w-2 rounded-full" style={{ background: GROWTH_COLOR }} /></div>
              <div className="mt-0.5 text-lg font-semibold text-zinc-100">{fmt(totals.totalAnnualDiv - incomeDiv)}</div>
              <div className="text-zinc-500">{fmtPct(100 - incomePct, 0)}</div>
            </div>
          </div>
        </Card>
        <Card title="Dividende nach Frequenz">
          <Donut data={byFrequency} format={(v) => fmt(v)} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Größte Dividendenzahler" sub="Top 10 nach Jahresdividende">
          <BarList
            ranked
            items={byDiv.slice(0, 10).map((p) => ({
              key: p.symbol, label: p.symbol, sub: fmtPct(p.dividendContribution, 1), symbol: p.symbol,
              value: p.annualDividend, display: fmt(p.annualDividend),
            }))}
          />
        </Card>
        <Card title="Yield-Ausreißer" info={`Positionen mit Yield über ${fmtNum(YIELD_HIGH, 1)} % (mögliche Dividendenfalle) oder unter ${fmtNum(YIELD_LOW, 1)} %.`}>
          <div className="space-y-4">
            <div>
              <p className={`mb-1.5 text-xs font-medium ${TONE.warning.text}`}>Über {fmtNum(YIELD_HIGH, 1)} % ({highYield.length})</p>
              <ChipList items={highYield.map((p) => ({ symbol: p.symbol, meta: fmtPct(p.yield, 1) }))} />
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <p className="mb-1.5 text-xs font-medium text-zinc-400">Unter {fmtNum(YIELD_LOW, 1)} % ({lowYield.length})</p>
              <ChipList items={lowYield.map((p) => ({ symbol: p.symbol, meta: fmtPct(p.yield, 1) }))} />
            </div>
          </div>
        </Card>
      </div>

      <PositionTable
        title="Dividende je Position"
        data={byDiv}
        searchKeys={['kategorie']}
        columns={[
          { key: 'annualDividend', label: 'Pro Jahr', align: 'right', render: (p) => fmt(p.annualDividend) },
          {
            key: 'yield', label: 'Yield', align: 'right',
            render: (p) => <span className={yieldTone(p.yield) === 'neutral' ? '' : TONE[yieldTone(p.yield)].text}>{fmtPct(p.yield)}</span>,
          },
          { key: 'dividendContribution', label: 'Anteil', align: 'right', hide: 'sm', render: (p) => <CellBar pct={(p.dividendContribution / (byDiv[0]?.dividendContribution || 1)) * 100} label={fmtPct(p.dividendContribution, 1)} /> },
          { key: 'monthlyDividend', label: 'Ø Monat', align: 'right', hide: 'md', render: (p) => fmt(p.monthlyDividend) },
          { key: 'ausschuettungsfrequenz', label: 'Frequenz', hide: 'lg' },
          { key: 'wert', label: 'Wert', align: 'right', hide: 'lg', render: (p) => fmt(p.wert) },
        ]}
      />
    </>
  );
}
