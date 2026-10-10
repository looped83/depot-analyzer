import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useDepot } from '../../lib/depotContext';
import type { ActionRecommendation } from '../../lib/insights';
import { fmt, fmtNum } from '../../lib/format';
import { AXIS, POLAR_GRID } from '../../lib/chartTheme';
import { TONE, scoreLabel, scoreTone, type Tone } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card } from '../ui/Card';
import { Callout } from '../ui/Callout';
import { ScoreRow, ProgressBar } from '../ui/Bars';
import { ChipList } from '../ui/Chip';
import { TextButton } from '../ui/Controls';

// Short labels for the radar axis; the detail list keeps the full names.
const RADAR_LABEL: Record<string, string> = {
  diversification: 'Streuung', incomeStability: 'Einkommen', growthPotential: 'Wachstum', dataQuality: 'Daten',
  riskDistribution: 'Risiko', savingsEfficiency: 'Sparplan', cashflowSmoothness: 'Cashflow', chowderQuality: 'Chowder',
};

const PRIORITY: Record<ActionRecommendation['priority'], { tone: Tone; label: string }> = {
  high: { tone: 'danger', label: 'Hoch' },
  medium: { tone: 'warning', label: 'Mittel' },
  low: { tone: 'info', label: 'Niedrig' },
};

const SHOWN = 5;

export function DepotCheckTab() {
  const { m } = useDepot();
  const { health, recommendations: recs, freibetrag } = m;
  const [showAll, setShowAll] = useState(false);
  const stress = m.stress(50);
  const high = recs.filter((r) => r.priority === 'high').length;

  return (
    <>
      <KPIGrid>
        <KPICard title="Health Score" value={`${fmtNum(health.overall)} / 100`} sub={scoreLabel(health.overall)} tone={scoreTone(health.overall)}
          info="Durchschnitt aus 8 Dimensionen auf derselben Skala wie alle Scores: ab 75 sehr gut, ab 50 solide, ab 25 ausbaufähig.">
          <ProgressBar value={health.overall} tone={scoreTone(health.overall)} />
        </KPICard>
        <KPICard title="Empfehlungen" value={recs.length} sub={`${high} mit hoher Priorität`} tone={high > 0 ? 'danger' : undefined} />
        <KPICard title="Stresstest" value={`−${fmt(stress.lostIncome)}`} sub="pro Jahr, wenn die Top 5 um 50 % kürzen" to={{ tab: 'safety', anchor: 'stresstest' }} />
        <KPICard title="Steuer" value={fmt(freibetrag.taxAmount)} sub={freibetrag.remaining > 0 ? `${fmt(freibetrag.remaining)} Freibetrag frei` : 'pro Jahr auf Dividenden'} to={{ tab: 'dividends', anchor: 'steuer' }} />
      </KPIGrid>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Profil" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={health.dimensions.map((d) => ({ dim: RADAR_LABEL[d.key] ?? d.label, score: Math.round(d.score) }))} outerRadius="68%">
              <PolarGrid stroke={POLAR_GRID} />
              <PolarAngleAxis dataKey="dim" tick={{ ...AXIS.tick, fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke={TONE.info.hex} fill={TONE.info.hex} fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Dimensionen" className="lg:col-span-3">
          <div className="space-y-4">
            {health.dimensions.map((d) => (
              <ScoreRow key={d.key} label={d.label} detail={d.detail} score={d.score}>
                <ul className="space-y-0.5 text-xs">
                  {d.tips.map((tip) => (
                    <li key={tip} className={`flex gap-1.5 ${d.isGood ? 'text-zinc-400' : 'text-zinc-300'}`}>
                      {d.isGood
                        ? <CheckCircle2 size={12} className={`mt-0.5 shrink-0 ${TONE.success.text}`} />
                        : <ArrowRight size={12} className={`mt-0.5 shrink-0 ${TONE.info.text}`} />}
                      {tip}
                    </li>
                  ))}
                </ul>
              </ScoreRow>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Handlungsempfehlungen" sub="Höchste Priorität zuerst">
        <div className="space-y-2.5">
          {(showAll ? recs : recs.slice(0, SHOWN)).map((r) => {
            const prio = PRIORITY[r.priority];
            return (
              <Callout key={r.id} tone={prio.tone} title={r.title}>
                <p>{r.description}</p>
                <p className="text-zinc-400">
                  <span className={`font-medium ${TONE[prio.tone].text}`}>Priorität {prio.label}</span> · Aufwand {r.effort} · {r.impact}
                </p>
                {r.symbols && r.symbols.length > 0 && <ChipList items={r.symbols.map((s) => ({ symbol: s }))} />}
              </Callout>
            );
          })}
        </div>
        {recs.length > SHOWN && (
          <div className="mt-3">
            <TextButton onClick={() => setShowAll((s) => !s)}>{showAll ? 'Weniger anzeigen' : `Alle ${recs.length} anzeigen`}</TextButton>
          </div>
        )}
      </Card>
    </>
  );
}
