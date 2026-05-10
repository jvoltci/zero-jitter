# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/) and the project adheres to
[Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-05-10

A correctness, performance, and DX overhaul. The painted output is unchanged
for typical inputs; everything *around* the paint is rebuilt.

### Added

- **Zero-config Web Worker** — the default worker now ships the full vendored
  `pretext` engine inlined as a build-time string. CJK / BiDi / emoji
  correction work out of the box without bundler-specific worker config.
  Tested with **Next.js (App + Pages Router), Vite, Remix, CRA, esbuild**.
- **`'use client'` directives** preserved through tsup — Next.js App Router
  works without manual wrapping.
- **Stick-to-bottom auto-scroll** — `autoScroll` no longer yanks the user
  back when they scroll up to read earlier content. A floating
  *"↓ Jump to latest"* button surfaces when content is arriving but
  auto-scroll has paused. Toggleable via `showScrollToBottomButton`.
- **Selection / copy / find** — a transparent DOM overlay renders one
  invisible `<span>` per visible line so native browser selection,
  `Cmd+C`, and `Cmd+F` work on canvas-painted text. Toggle with the
  new `selectable` prop (default `true`).
- **`highlight(query, options?)` / `clearHighlight()`** — imperative
  search/highlight API with case-insensitive string and RegExp queries.
  Active match is paintable in a distinct color (`activeIndex`).
- **`cursor` prop** — `'off' | 'static' | 'blink'` end-of-line caret.
  Honors `prefers-reduced-motion`.
- **Delta-only worker protocol** — `appendText` ships only the delta to
  the worker (`APPEND` message), not the full accumulated buffer.
  Reduces postMessage overhead during streaming.
- **`internals` subpath export** — advanced consumers can import
  `paint`, `getVisibleLineRange`, `configureCanvasForHiDPI`, hooks,
  constants from `zero-jitter/internals`.
- **`ariaLabel` prop** with `null` to omit the attribute when an
  external `aria-labelledby` is wired up.
- **Vitest test suite + happy-dom**.
- **GitHub Actions CI** matrix (Node 20 + 22): lint, typecheck, test,
  build, size budget, `npm pack` dry-run with a CLAUDE.md exclusion guard.
- **`size-limit` budgets** in `.size-limit.json`.
- **Changesets** for release tooling.
- **RTL pass-through** — worker computes per-line dominant direction
  from pretext's `segLevels`; renderer sets `ctx.direction` and
  `textAlign` per line. Pure-RTL paragraphs now render with correct
  alignment. (Mixed-direction shaping on canvas remains a documented
  limitation pending HarfBuzz integration.)

### Changed

- **Public API surface trimmed**. Top-level exports are now:
  `ZeroJitter`, `useZeroJitter`, plus types (`LayoutLine`, `LayoutState`,
  `ZeroJitterConfig`, `ZeroJitterHandle`, `ZeroJitterProps`,
  `ResolvedPadding`, `HighlightOptions`, `HighlightRect`).
  Renderer / DPR / hook utilities moved to `zero-jitter/internals`.
- **`useZeroJitter` layout state** moved off React's render tree
  (`useSyncExternalStore` over a small per-instance store). Token-rate
  updates no longer round-trip through React reconciliation.
- **`useContainerWidth`** publishes `clientWidth` (excludes scrollbar
  gutter) so wrap-width matches the canvas paint width — eliminates the
  one-frame overflow when a vertical scrollbar appears.
- **DPR change listener** is now self-reattaching. Previously
  `{ once: true }` left consumers stuck at the wrong DPR after a
  monitor swap.
- **`AccessibilityMirror`** announces only the *delta* since the last
  tick (debounced 300 ms) instead of the full buffer; screen readers
  no longer re-read the whole response on every update.
- **`role="document"`** removed from the outer wrapper; only `aria-label`
  remains.
- **TypeScript target** `es2020` for the worker (was unspecified).

### Removed

- The previous primitive `measureText`-based inline worker fallback.
  It silently downgraded i18n correctness and is replaced by the real
  pretext-powered inline worker.

### Migration

- If you imported `paint`, `getVisibleLineRange`,
  `configureCanvasForHiDPI`, `getDpr`, `useContainerWidth`,
  `useFontReady`, or any `DEFAULT_*` constant from `zero-jitter`,
  switch the import to `zero-jitter/internals`. No code change beyond
  the module specifier.
- The default value of `autoScroll` is unchanged (`true`) but the
  behavior is "stick to bottom only when near the bottom." Set it to
  `false` for the old always-snap behavior, or wire your own logic.

## [0.1.0] — Initial release.

- Off-thread canvas streaming text renderer.
