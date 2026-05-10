// ─────────────────────────────────────────────────────────────
// Public-but-unstable internals
// ─────────────────────────────────────────────────────────────
//
// Exposes lower-level building blocks for advanced consumers:
// custom renderers, alternative paint pipelines, server-side
// metric collection, etc.
//
// API stability: NOT covered by semver before 1.0.0. Pin a
// patch version if you depend on these.

export { paint } from './renderer/CanvasRenderer';
export type { PaintOptions } from './renderer/CanvasRenderer';

export { getVisibleLineRange } from './renderer/viewport';

export { getDpr, configureCanvasForHiDPI } from './utils/dpr';

export { computeHighlights } from './utils/highlight';
export { isNearBottom, scrollToBottom, STICK_THRESHOLD_PX } from './utils/scroll';

export { useContainerWidth } from './hooks/useContainerWidth';
export { useFontReady } from './hooks/useFontReady';

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

export type { WorkerRequest, WorkerResponse } from './worker/messages';
