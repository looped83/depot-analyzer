import { useState, Suspense, lazy } from 'react';
import { UploadZone } from './components/UploadZone';
import { calculateDerived } from './lib/calculations';
import type { DepotPosition } from './lib/types';

const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));

// The parsed depot survives a reload (and the back button) within this browser tab,
// but sessionStorage is cleared when the tab closes – financial data isn't kept around.
const STORAGE_KEY = 'depot-analyzer:positions:v1';

function loadSession(): DepotPosition[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? calculateDerived(JSON.parse(raw) as DepotPosition[]) : null;
  } catch {
    return null;
  }
}

function saveSession(raw: DepotPosition[] | null) {
  try {
    if (raw) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, quota) – the app simply won't restore after reload.
  }
}

export default function App() {
  const [positions, setPositions] = useState<DepotPosition[] | null>(loadSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const { parseExcel } = await import('./lib/parser');
      const raw = await parseExcel(file);
      if (raw.length === 0) throw new Error('Keine Positionen in der Datei gefunden.');
      saveSession(raw);
      setPositions(calculateDerived(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Verarbeiten der Datei.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    saveSession(null);
    setPositions(null);
  };

  if (positions) {
    return (
      <Suspense fallback={<div className="min-h-screen" />}>
        <Dashboard positions={positions} onReset={reset} />
      </Suspense>
    );
  }

  return <UploadZone onFile={handleFile} loading={loading} error={error} />;
}
