import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h1 className="text-lg font-semibold text-zinc-100">Etwas ist schiefgelaufen</h1>
          <p className="mt-2 text-sm text-zinc-400">Die Analyse konnte nicht angezeigt werden. Lade die Seite neu und versuche es erneut.</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Neu laden
          </button>
          <details className="mt-4 text-left text-xs text-zinc-500">
            <summary className="cursor-pointer">Technische Details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
          </details>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
