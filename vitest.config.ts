import { defineConfig } from 'vitest/config';

// Standalone config (takes precedence over vite.config.ts) so the test runner
// doesn't load the React/Tailwind build plugins — the code under test in
// src/lib is plain TypeScript with no DOM dependency.
export default defineConfig({
  test: {
    environment: 'node',
  },
});
