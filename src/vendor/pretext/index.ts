// ─────────────────────────────────────────────────────────────
// Vendored @chenglou/pretext v0.0.3
// ─────────────────────────────────────────────────────────────
//
// Source: https://github.com/chenglou/pretext
// License: MIT (see LICENSE in this directory)
//
// Vendored to:
//   1. Eliminate single-author dependency risk
//   2. Enable future incremental prepare() optimization for streaming
//   3. Simplify worker bundling (no noExternal hack)
//   4. Allow tree-shaking unused APIs
//
// When updating: diff against upstream, merge selectively.

export {
  prepare,
  prepareWithSegments,
  layout,
  layoutWithLines,
  layoutNextLine,
  walkLineRanges,
  clearCache,
  setLocale,
  profilePrepare,
  type PreparedText,
  type PreparedTextWithSegments,
  type LayoutResult,
  type LayoutLinesResult,
  type LayoutLine,
  type LayoutLineRange,
  type LayoutCursor,
  type PrepareOptions,
  type PrepareProfile,
} from './layout';
