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
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
