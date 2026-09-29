import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const modelEnv = loadEnv(mode, process.cwd(), ['GEMINI_MODEL', 'GEMINI_FALLBACK_MODEL']);
  // Seule une empreinte est publique : ni la consigne ni les secrets ne sont inclus.
  const diagnosticVersion = createHash('sha256')
    .update(readFileSync(path.resolve(__dirname, 'api/_lib/prompt.ts')))
    .update(readFileSync(path.resolve(__dirname, 'api/_lib/diagnosticContract.ts')))
    .update(readFileSync(path.resolve(__dirname, 'api/_lib/analyze.ts')))
    .update(modelEnv.GEMINI_MODEL ?? '')
    .update(modelEnv.GEMINI_FALLBACK_MODEL ?? '')
    .digest('hex');
  return {
    define: { __DIAGNOSTIC_CACHE_VERSION__: JSON.stringify(diagnosticVersion) },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
