import { defineConfig } from 'tsup';

// Main + internals bundle. Run AFTER `tsup -c tsup.worker.config.ts`
// and AFTER `scripts/inline-worker.mjs` — the main bundle imports the
// generated `WORKER_SOURCE` string. After this build, run
// `scripts/finalize-build.mjs` to prepend `"use client";` so Next.js
// App Router treats the published bundle as a Client Component.

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    internals: 'src/internals.ts',
  },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
  sourcemap: true,
  target: 'es2020',
  clean: false,
  external: ['react', 'react-dom'],
  treeshake: true,
});
