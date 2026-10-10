import { useState } from 'react';
import { useDepot } from '../../lib/depotContext';
import type { Finding } from '../../lib/findings';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { cashflowLabel, cashflowTone, type Tone } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { Segmented } from '../ui/Controls';
import { ChipList } from '../ui/Chip';

const CATEGORY: Record<Finding['category'], { tone: Tone; label: string }> = {
  danger: { tone: 'danger', label: 'Kritisch' },
  warning: { tone: 'warning', label: 'Warnung' },
  info: { tone: 'info', label: 'Info' },
  success: { tone: 'success', label: 'Positiv' },
};
const ORDER: Finding['category'][] = ['danger', 'warning', 'info', 'success'];
type Filter = 'all' | Finding['category'];

export function FindingsTab() {
  const { m } = useDepot();
  const { findings, cashflow: cf, freibetrag: fb } = m;
  const [filter, setFilter] = useState<Filter>('all');
  const { top: top3, pct: top3Pct } = m.top3Dividend;
  const buy = m.buyCandidates();

  const sorted = [...findings].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const shown = filter === 'all' ? sorted : sorted.filter((f) => f.category === filter);
  const count = (c: Finding['category']) => findings.filter((f) => f.category === c).length;

  return (
    <>
      <KPIGrid>
        <KPICard title="Kaufkandidaten" value={buy.length} sub={buy.slice(0, 3).map((p) => p.symbol).join(', ') || 'keine'} to={{ tab: 'rebalancing', anchor: 'kaufen' }} />
        <KPICard title="Top-3-Dividende" value={fmtPct(top3Pct, 0)} sub={top3.map((p) => p.symbol).join(', ')} tone={top3Pct > 50 ? 'warning' : undefined} to={{ tab: 'diversification' }} />
        <KPICard title="Cashflow" value={cashflowLabel(cf.cv)} sub={`Variationskoeff. ${fmtNum(cf.cv)} %`} tone={cashflowTone(cf.cv)} to={{ tab: 'calendar' }} />
        <KPICard title="Freibetrag" value={fmtPct(Math.min(100, (fb.used / fb.freibetrag) * 100), 0)} sub={fb.remaining > 0 ? `${fmt(fb.remaining)} frei` : `${fmt(fb.taxAmount)} Steuer / Jahr`} to={{ tab: 'dividends', anchor: 'steuer' }} />
      </KPIGrid>

      <Card
        title="Hinweise zu deinem Depot"
        sub="Automatisch aus deinen Daten abgeleitet"
        action={
          <Segmented
            label="Hinweise filtern"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: `Alle ${findings.length}` }, ...ORDER.filter(count).map((c) => ({ value: c, label: `${CATEGORY[c].label} ${count(c)}` }))]}
          />
        }
      >
        <div className="space-y-2.5">
          {shown.map((f) => (
            <Callout key={f.id} tone={CATEGORY[f.category].tone} title={f.title}>
              <p>{f.detail}</p>
              {f.symbols && f.symbols.length > 0 && <ChipList items={f.symbols.map((s) => ({ symbol: s }))} />}
            </Callout>
          ))}
        </div>
      </Card>
    </>
  );
}
