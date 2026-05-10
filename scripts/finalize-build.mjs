#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// finalize-build — post-bundle adjustments
// ─────────────────────────────────────────────────────────────
//
// 1. Prepend `'use client';` to the bundled entry files so Next.js
//    App Router consumers can import them directly without wrapping
//    in their own client component.
// 2. Sanity-check that `dist/worker/layout.worker.js` and the
//    generated worker-source-inline are present.
// 3. Verify CLAUDE.md is NOT inside `dist/`.

import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const ENTRY_FILES = [
  'dist/index.js',
  'dist/index.cjs',
  'dist/internals.js',
  'dist/internals.cjs',
];

const USE_CLIENT = '"use client";\n';

async function prependUseClient(rel) {
  const full = join(repoRoot, rel);
  if (!existsSync(full)) {
    throw new Error(`finalize-build: ${rel} missing — run the build first.`);
  }
  const original = await readFile(full, 'utf8');
  // Strip any pre-existing use-client lines (esbuild may have left some).
  const stripped = original.replace(/^("use client";|'use client';)\s*\n/gm, '');
  if (original.startsWith(USE_CLIENT) && stripped === original.slice(USE_CLIENT.length)) {
    // Already correct.
    return false;
  }
  await writeFile(full, USE_CLIENT + stripped, 'utf8');
  return true;
}

async function assertExists(rel) {
  const full = join(repoRoot, rel);
  if (!existsSync(full)) throw new Error(`finalize-build: missing ${rel}`);
  const s = await stat(full);
  if (!s.size) throw new Error(`finalize-build: empty ${rel}`);
}

async function main() {
  for (const f of ENTRY_FILES) {
    const changed = await prependUseClient(f);
    console.log(
      `[finalize] ${changed ? 'prepended' : 'already had'} 'use client' on ${f}`,
    );
  }

  await assertExists('dist/worker/layout.worker.js');
  await assertExists('src/.generated/worker-inline.ts');

  const claudeInDist = existsSync(join(repoRoot, 'dist', 'CLAUDE.md'));
  if (claudeInDist) {
    throw new Error('finalize-build: CLAUDE.md must not be inside dist/');
  }
  console.log('[finalize] dist/ does not contain CLAUDE.md ✓');
}

main().catch((err) => {
  console.error('[finalize-build]', err);
  process.exit(1);
});
