import { defineConfig } from 'tsup';

// Worker bundle — built first by `npm run build:worker`. The output
// is read by `scripts/inline-worker.mjs` and embedded into the main
// bundle as a string constant, so consumers can instantiate a Worker
// without any bundler-specific worker plugin.

export default defineConfig({
  entry: ['src/worker/layout.worker.ts'],
  format: ['esm'],
  outDir: 'dist/worker',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
});
