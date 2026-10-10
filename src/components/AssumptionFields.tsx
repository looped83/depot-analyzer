import { useDepot, DEFAULT_ASSUMPTIONS } from '../lib/depotContext';
import type { ProjectionParams } from '../lib/types';
import { SliderField, Segmented, TextButton } from './ui/Controls';

/** Assumption controls shared by Ausblick and Zielplanung (one state for the whole app). */
export function AssumptionFields() {
  const { assumptions: a, setAssumptions } = useDepot();
  const set = (patch: Partial<ProjectionParams>) => setAssumptions({ ...a, ...patch });
  const changed = (Object.keys(a) as (keyof ProjectionParams)[]).some((k) => a[k] !== DEFAULT_ASSUMPTIONS[k]);
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <SliderField label="Monatliches Investment" value={a.monthlySavings} onChange={(v) => set({ monthlySavings: v })} min={0} max={10000} step={50} unit="€" />
      <SliderField label="Dividendenwachstum p. a." value={a.dividendGrowthRate} onChange={(v) => set({ dividendGrowthRate: v })} min={0} max={20} step={0.5} unit="%" />
      <SliderField label="Kurszuwachs p. a." value={a.capitalGrowthRate} onChange={(v) => set({ capitalGrowthRate: v })} min={0} max={20} step={0.5} unit="%" />
      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-400">Dividenden reinvestieren</p>
        <div className="flex items-center gap-3">
          <Segmented label="Dividenden reinvestieren" value={a.reinvest ? 'ja' : 'nein'} onChange={(v) => set({ reinvest: v === 'ja' })}
            options={[{ value: 'ja', label: 'Ja' }, { value: 'nein', label: 'Nein' }]} />
          {changed && (
            <TextButton onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}>Zurücksetzen</TextButton>
          )}
        </div>
      </div>
    </div>
  );
}
