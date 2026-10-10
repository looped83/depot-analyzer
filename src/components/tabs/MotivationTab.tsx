import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LucideIcon } from 'lucide-react';
import {
  Film, Music, Smartphone, BatteryCharging, ShoppingCart, Palmtree, Clock, Euro, Target, Rocket, Trophy,
  CalendarCheck, LayoutGrid, Wallet, Gem, Crown, Repeat, Landmark, Star, Building2, Check,
} from 'lucide-react';
import { useDepot } from '../../lib/depotContext';
import { computeMotivationMetrics, computeAchievements, computeSnowballEffect, type MotivationMetrics } from '../../lib/insights';
import { computeProjection } from '../../lib/calculations';
import { fmt, fmtK, fmtNum, fmtPct } from '../../lib/format';
import { AXIS, GRID, MUTED } from '../../lib/chartTheme';
import { TONE } from '../../lib/score';
import { KPICard, KPIGrid } from '../ui/KPICard';
import { Card, Note } from '../ui/Card';
import { ProgressBar } from '../ui/Bars';
import { MiniStat, TileGrid } from '../ui/MiniStat';
import { ChartTooltip } from '../ui/ChartTooltip';
import { TextButton } from '../ui/Controls';

const LIVING_COSTS = 2000;

const EQUIVALENTS: { key: keyof MotivationMetrics; label: string; icon: LucideIcon; note: string; currency?: boolean }[] = [
  { key: 'netflixAbos', label: 'Netflix-Abos', icon: Film, note: '13,99 € / Monat' },
  { key: 'spotifyAbos', label: 'Spotify-Abos', icon: Music, note: '11,99 € / Monat' },
  { key: 'handyVertraege', label: 'Handyverträge', icon: Smartphone, note: '30 € / Monat' },
  { key: 'autoLaden', label: 'E-Auto laden', icon: BatteryCharging, note: '25 € / Monat' },
  { key: 'lebensmittelTage', label: 'Tage Lebensmittel', icon: ShoppingCart, note: 'pro Jahr · 15 € / Tag' },
  { key: 'urlaubsTage', label: 'Urlaubstage', icon: Palmtree, note: 'pro Jahr · 100 € / Tag' },
  { key: 'workHoursPerMonth', label: 'Arbeitsstunden', icon: Clock, note: 'pro Monat · Mindestlohn' },
  { key: 'dailyPassiveIncome', label: 'Pro Tag passiv', icon: Euro, note: '365 Tage im Jahr', currency: true },
];

const ACHIEVEMENT_ICON: Record<string, LucideIcon> = {
  'first-100-monthly': Target, 'first-250-monthly': Rocket, 'first-500-monthly': Rocket, 'first-1000-monthly': Trophy,
  'twelve-months': CalendarCheck, 'ten-positions': LayoutGrid, 'twenty-positions': LayoutGrid,
  'depot-10k': Wallet, 'depot-50k': Gem, 'depot-100k': Crown, 'monthly-payers-5': Repeat,
  freibetrag: Landmark, 'prio-a-five': Star, 'multi-broker': Building2,
};

const NEXT_SHOWN = 4;

export function MotivationTab() {
  const { m, assumptions } = useDepot();
  const { positions, totals } = m;
  const [showAll, setShowAll] = useState(false);

  const metrics = useMemo(() => computeMotivationMetrics(positions), [positions]);
  const achievements = useMemo(() => computeAchievements(positions), [positions]);
  const snowball = useMemo(() => computeSnowballEffect(positions, 20, assumptions), [positions, assumptions]);
  const in5 = useMemo(() => computeProjection(positions, assumptions, 5)[5], [positions, assumptions]);

  const reached = achievements.filter((a) => a.reached);
  const next = achievements.filter((a) => !a.reached).sort((a, b) => b.progress - a.progress);
  const future = (in5?.annualDividend ?? 0) / 12;
  const freedom = metrics.freedomDegree;

  return (
    <>
      <KPIGrid>
        <KPICard title="Passiv / Monat" value={fmt(totals.totalMonthlyDiv)} sub="Brutto" />
        <KPICard title="Passiv / Tag" value={fmt(metrics.dailyPassiveIncome)} sub="365 Tage im Jahr" />
        <KPICard title="Freiheitsgrad" value={fmtPct(freedom, 1)} sub={`von ${fmt(LIVING_COSTS)} Fixkosten`} tone={freedom >= 100 ? 'success' : undefined} info={`Anteil monatlicher Fixkosten (Annahme ${fmt(LIVING_COSTS)}), der durch Dividenden gedeckt ist.`} />
        <KPICard title="In 5 Jahren" value={fmt(future)} sub="pro Monat (Modell)" tone="success" to={{ tab: 'projection' }} />
      </KPIGrid>

      <Card title="Dein Freiheitsgrad" sub={`${fmt(totals.totalMonthlyDiv)} von ${fmt(LIVING_COSTS)} monatlichen Fixkosten gedeckt`}>
        <ProgressBar value={freedom} gradient size="md" marks={[25, 50, 75]} />
        <div className="mt-1 flex justify-between text-[11px] text-zinc-600">
          <span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span>
        </div>
        <p className="mt-3 text-sm text-zinc-300">
          {freedom < 5 ? 'Jede Reise beginnt mit dem ersten Schritt – jeder investierte Euro zählt.'
            : freedom < 50 ? `Deine Dividenden decken bereits ${fmtPct(freedom, 1)} deiner Fixkosten. Weiter so!`
            : freedom < 100 ? `Auf der Zielgeraden: ${fmtPct(freedom, 0)} finanzielle Freiheit erreicht.`
            : 'Gratulation – deine Fixkosten sind komplett durch Dividenden gedeckt!'}
        </p>
      </Card>

      <Card title="Was deine Dividenden bezahlen">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {EQUIVALENTS.map(({ key, label, icon: Icon, note, currency }) => (
            <div key={key} className="rounded-xl border border-zinc-800 p-3">
              <Icon size={16} className="text-zinc-500" />
              <div className="mt-2 text-lg font-semibold tabular-nums text-zinc-100">{currency ? fmt(metrics[key]) : `${fmtNum(metrics[key], 1)}×`}</div>
              <div className="text-xs text-zinc-300">{label}</div>
              <div className="text-[11px] text-zinc-500">{note}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Meilensteine" sub={`${reached.length} von ${achievements.length} erreicht`}>
        {reached.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {reached.map((a) => {
              const Icon = ACHIEVEMENT_ICON[a.id] ?? Check;
              return (
                <span key={a.id} title={a.description} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${TONE.success.soft} ${TONE.success.text}`}>
                  <Icon size={13} />{a.label}
                </span>
              );
            })}
          </div>
        )}
        <p className="label mb-2">Nächste Ziele</p>
        <ul className="space-y-3">
          {(showAll ? next : next.slice(0, NEXT_SHOWN)).map((a) => {
            const Icon = ACHIEVEMENT_ICON[a.id] ?? Target;
            return (
              <li key={a.id} className="flex items-center gap-3">
                <Icon size={16} className="shrink-0 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-zinc-200">{a.label} <span className="font-normal text-zinc-500">· {a.description}</span></span>
                    <span className="shrink-0 tabular-nums text-zinc-400">{a.current} / {a.target}</span>
                  </div>
                  <ProgressBar value={a.progress} />
                </div>
              </li>
            );
          })}
        </ul>
        {next.length > NEXT_SHOWN && (
          <div className="mt-3">
            <TextButton onClick={() => setShowAll((s) => !s)}>{showAll ? 'Weniger anzeigen' : `Alle ${next.length} anzeigen`}</TextButton>
          </div>
        )}
      </Card>

      <Card title="Der Schneeball-Effekt" sub="Depotwert mit vs. ohne Reinvestition der Dividenden, 20 Jahre">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={snowball} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis dataKey="year" {...AXIS} minTickGap={24} />
            <YAxis {...AXIS} tickFormatter={fmtK} width={52} />
            <Tooltip content={(p) => <ChartTooltip {...p} formatValue={(v) => fmt(v)} names={{ withReinvest: 'Mit Reinvestition', withoutReinvest: 'Ohne' }} />} />
            <Area type="monotone" dataKey="withoutReinvest" stroke={MUTED} fill={MUTED} fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 3" isAnimationActive={false} />
            <Area type="monotone" dataKey="withReinvest" stroke={TONE.success.hex} fill={TONE.success.hex} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mb-3 mt-1 flex justify-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: TONE.success.hex }} />Mit Reinvestition</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: MUTED }} />Ohne</span>
        </div>
        <TileGrid cols={3}>
          {[5, 10, 20].map((y) => {
            const row = snowball[y];
            return row ? <MiniStat key={y} label={`Nach ${y} Jahren`} value={`+${fmt(row.withReinvest - row.withoutReinvest)}`} sub="durch Reinvestition" tone="success" /> : null;
          })}
        </TileGrid>
      </Card>

      <Note>
        Schneeball und Ausblick nutzen die Annahmen aus „Ausblick“ ({fmtPct(assumptions.dividendGrowthRate, 1)} Dividendenwachstum,
        {' '}{fmtPct(assumptions.capitalGrowthRate, 1)} Kurszuwachs, {fmt(assumptions.monthlySavings)} pro Monat). Vergleichspreise sind Richtwerte.
      </Note>
    </>
  );
}
