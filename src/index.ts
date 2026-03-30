// ─────────────────────────────────────────────────────────────
// Public Barrel Export
// ─────────────────────────────────────────────────────────────

// Component
export { ZeroJitter } from './components/ZeroJitter';

// Hook
export { useZeroJitter } from './hooks/useZeroJitter';
export { useContainerWidth } from './hooks/useContainerWidth';
export { useFontReady } from './hooks/useFontReady';

// Renderer utilities
export { paint } from './renderer/CanvasRenderer';
export { getVisibleLineRange } from './renderer/viewport';

// DPR utilities
export { getDpr, configureCanvasForHiDPI } from './utils/dpr';

// Constants
export {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT_MULTIPLIER,
  DEFAULT_COLOR,
  A11Y_DEBOUNCE_MS,
  DEFAULT_AUTO_SCROLL,
  DEFAULT_ARIA_LIVE,
  DEFAULT_WHITE_SPACE,
} from './utils/constants';

// Types
export type {
  LayoutLine,
  LayoutState,
  ZeroJitterConfig,
  ZeroJitterHandle,
  ZeroJitterProps,
  ResolvedPadding,
} from './types';

export type { WorkerRequest, WorkerResponse } from './worker/messages';
