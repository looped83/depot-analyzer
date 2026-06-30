import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// REPO_NAME muss dem GitHub-Repository-Namen entsprechen
const REPO_NAME = 'depot-analyzer'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Auf GitHub Pages: /depot-analyzer/ – lokal: /
  base: process.env.GITHUB_ACTIONS ? `/${REPO_NAME}/` : '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Recharts pulls in Redux/d3 internals with circular module references.
        // Letting Rollup auto-split these across our per-tab dynamic imports can
        // scatter them into chunks that load in the wrong order ("x is not a
        // function" at runtime), so they're pinned into one vendor chunk together.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](recharts|victory-vendor|d3-[a-z-]+|internmap|@reduxjs|react-redux|redux(-thunk)?|immer|reselect|decimal\.js-light|es-toolkit|eventemitter3|use-sync-external-store|tiny-invariant|clsx)[\\/]/.test(id)) {
            return 'charts-vendor';
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
