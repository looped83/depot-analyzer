import type { LucideIcon } from 'lucide-react';
import { Trophy, Percent, TrendingUp, Star, Coins, AlertTriangle } from 'lucide-react';
import { useDepot } from '../../lib/depotContext';
import type { DepotPosition } from '../../lib/types';
import { fmt, fmtNum, fmtPct } from '../../lib/format';
import { scoreTone, type Tone } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { BarList } from '../ui/Bars';

const SHOWN = 8;

interface Ranking {
  id: string;
  title: string;
  sub: string;
  icon: LucideIcon;
  items: DepotPosition[];
  value: (p: DepotPosition) => number;
  display: (p: DepotPosition) => string;
  tone: (p: DepotPosition) => Tone;
}

export function RankingTab() {
  const { m } = useDepot();
  const active = m.active;
  const by = (key: (p: DepotPosition) => number) => [...active].sort((a, b) => key(b) - key(a));

  const review = m.positions
    .filter((p) => p.status === 'Beobachten' || p.status === 'Verkauf' || (p.wert > 0 && p.dividendScore < 25))
    .sort((a, b) => a.dividendScore - b.dividendScore);

  const rankings: Ranking[] = [
    {
      id: 'score', title: 'Dividend Score', icon: Trophy,
      sub: '40 % Yield + 40 % CAGR + 10 % Frequenz + 10 % Prio/Status (relativ zum Depot)',
      items: by((p) => p.dividendScore), value: (p) => p.dividendScore,
      display: (p) => fmtNum(p.dividendScore), tone: (p) => scoreTone(p.dividendScore),
    },
    {
      id: 'yield', title: 'Höchster Yield', sub: 'Aktuelle Dividendenrendite', icon: Percent,
      items: by((p) => p.yield), value: (p) => p.yield, display: (p) => fmtPct(p.yield), tone: () => 'info',
    },
    {
      id: 'cagr', title: 'Stärkstes Dividendenwachstum', sub: 'CAGR über 5 Jahre', icon: TrendingUp,
      items: by((p) => p.cagr5j).filter((p) => p.cagr5j > 0), value: (p) => p.cagr5j, display: (p) => fmtPct(p.cagr5j), tone: () => 'info',
    },
    {
      id: 'chowder', title: 'Chowder Score', sub: 'Yield + CAGR 5J · ab 12 attraktiv', icon: Star,
      items: by((p) => p.chowderScore), value: (p) => p.chowderScore,
      display: (p) => fmtNum(p.chowderScore, 1), tone: (p) => (p.chowderScore >= 12 ? 'success' : 'info'),
    },
    {
      id: 'contribution', title: 'Größte Dividendenzahler', sub: 'Absolute Dividende pro Jahr', icon: Coins,
      items: by((p) => p.annualDividend), value: (p) => p.annualDividend, display: (p) => fmt(p.annualDividend), tone: () => 'info',
    },
    {
      id: 'review', title: 'Prüfen', sub: 'Beobachten, Verkauf oder Score unter 25', icon: AlertTriangle,
      items: review, value: (p) => 100 - p.dividendScore, display: (p) => `${p.status} · ${fmtNum(p.dividendScore)}`, tone: () => 'danger',
    },
  ];

  const avgScore = m.weighted('dividendScore');
  const topPerformers = active.filter((p) => p.dividendScore >= 75 && p.chowderScore >= 12).length;
  const buy = m.buyCandidates();

  return (
    <>
      <KPIGrid>
        <KPICard title="Ø Dividend Score" value={fmtNum(avgScore)} sub="Nach Wert gewichtet" tone={scoreTone(avgScore)} />
        <KPICard title="Top Performer" value={fmtNum(topPerformers)} sub="Score ≥ 75 & Chowder ≥ 12" tone="success" />
        <KPICard title="Kaufkandidaten" value={fmtNum(buy.length)} sub={buy.slice(0, 3).map((p) => p.symbol).join(', ') || '—'} to={{ tab: 'rebalancing', anchor: 'kaufen' }} />
        <KPICard title="Prüfen" value={fmtNum(review.length)} sub="Positionen" tone={review.length > 0 ? 'danger' : undefined} />
      </KPIGrid>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rankings.map((r) => (
          <Card key={r.id} title={r.title} sub={r.sub} action={<r.icon size={16} className="text-zinc-600" />}>
            <BarList
              ranked
              items={r.items.slice(0, SHOWN).map((p) => ({
                key: p.symbol, label: p.symbol, sub: p.name, symbol: p.symbol,
                value: r.value(p), display: r.display(p), tone: r.tone(p),
              }))}
            />
          </Card>
        ))}
      </div>
    </>
  );
}
