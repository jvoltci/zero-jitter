// ─────────────────────────────────────────────────────────────
// Public Barrel Export
// ─────────────────────────────────────────────────────────────
//
// Locked surface for ZeroJitter ≥ 0.2.0. Internal helpers
// (paint, viewport math, hooks) are exposed under
// `zero-jitter/internals` for advanced consumers.

export { ZeroJitter } from './components/ZeroJitter';
export { useZeroJitter } from './hooks/useZeroJitter';

export type {
  LayoutLine,
  LayoutState,
  ZeroJitterConfig,
  ZeroJitterHandle,
  ZeroJitterProps,
  ResolvedPadding,
  HighlightOptions,
  HighlightRect,
} from './types';
