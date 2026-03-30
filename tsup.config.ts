import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library bundle
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
    treeshake: true,
  },
  // Worker bundle (separate entry, no React externals)
  {
    entry: ['src/worker/layout.worker.ts'],
    format: ['esm'],
    outDir: 'dist/worker',
    sourcemap: true,
    // No noExternal needed — pretext is vendored in src/vendor/pretext/
  },
]);
