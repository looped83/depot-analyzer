import React, { useState, useEffect, Suspense, lazy } from 'react';
import { UploadZone } from './components/UploadZone';
import { calculateDerived } from './lib/calculations';
import type { DepotPosition } from './lib/types';

const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));

export default function App() {
  const [positions, setPositions] = useState<DepotPosition[] | null>(null);
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const { parseExcel } = await import('./lib/parser');
      const raw = await parseExcel(file);
      if (raw.length === 0) throw new Error('Keine Positionen in der Datei gefunden.');
      const derived = calculateDerived(raw);
      setPositions(derived);
      setFilename(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Verarbeiten der Datei.');
    } finally {
      setLoading(false);
    }
  };

  if (positions) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
        <Dashboard
          positions={positions}
          filename={filename}
          onReset={() => setPositions(null)}
        />
      </Suspense>
    );
  }

  return (
    <UploadZone onFile={handleFile} loading={loading} error={error} />
  );
}
