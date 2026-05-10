// ─────────────────────────────────────────────────────────────
// Public Type Definitions for ZeroJitter
// ─────────────────────────────────────────────────────────────

/** A single laid-out line with pre-calculated geometry. */
export interface LayoutLine {
  /** The text content of this line. */
  readonly text: string;
  /** The measured width of this line in CSS pixels. */
  readonly width: number;
  /** The pre-calculated Y offset in CSS pixels (lineIndex × lineHeight). */
  readonly y: number;
  /** Dominant text direction for this line. Defaults to 'ltr'. */
  readonly dir?: 'ltr' | 'rtl';
}

/** The complete layout result returned by the worker. */
export interface LayoutState {
  /** Array of laid-out lines with geometry. */
  readonly lines: ReadonlyArray<LayoutLine>;
  /** Total height of all lines in CSS pixels. */
  readonly totalHeight: number;
  /** Number of lines. */
  readonly lineCount: number;
}

/** Configuration for the useZeroJitter hook. */
export interface ZeroJitterConfig {
  /** CSS font shorthand. Must match your desired rendering font exactly. */
  font: string;
  /** Line height in CSS pixels. */
  lineHeight: number;
  /** White space handling mode. Default: 'normal'. */
  whiteSpace?: 'normal' | 'pre-wrap' | undefined;
  /**
   * URL to the worker script. Consumers can override this
   * if they need to host the worker from a CDN or different path.
   * Default: an inline-bundled worker (zero-config). The full pretext
   * engine ships inside the inline worker, so CJK / BiDi / emoji are
   * correct out of the box.
   */
  workerUrl?: string | URL | undefined;
}

/** Options for `highlight()`. */
export interface HighlightOptions {
  /** Fill color for non-active matches. Default: 'rgba(255, 213, 0, 0.45)'. */
  highlightColor?: string;
  /** Index of the "active" match (drawn with `activeColor`). Default: -1 (none). */
  activeIndex?: number;
  /** Fill color for the active match. Default: 'rgba(255, 140, 0, 0.65)'. */
  activeColor?: string;
  /** Case-insensitive matching for string queries. Default: true. */
  caseInsensitive?: boolean;
}

/** Imperative handle returned by useZeroJitter / exposed via ZeroJitter ref. */
export interface ZeroJitterHandle {
  /** Append new text (typically an SSE token chunk). Does NOT trigger re-render. */
  appendText: (chunk: string) => void;
  /** Replace all text. Useful for "regenerate" flows. */
  setText: (text: string) => void;
  /** Clear all text and reset layout. */
  clear: () => void;
  /** Highlight all matches of `query`. Returns the match count. */
  highlight: (query: string | RegExp, options?: HighlightOptions) => { count: number };
  /** Clear all highlight overlays. */
  clearHighlight: () => void;
  /** Scroll programmatically to the bottom (overrides stick-to-bottom state). */
  scrollToBottom: () => void;
  /** Current layout result. Updated asynchronously after worker responds. */
  layout: LayoutState;
  /** Ref callback — attach to the container element for width tracking. */
  containerRef: (node: HTMLElement | null) => void;
  /** True once the specified font is loaded and measurements are valid. */
  fontReady: boolean;
}

/** Props for the <ZeroJitter /> React component. */
export interface ZeroJitterProps {
  /** CSS font shorthand. Must match a loaded font exactly. Default: '16px sans-serif' */
  font?: string | undefined;
  /** Font size in pixels. Default: 16 */
  fontSize?: number | undefined;
  /** Line height in pixels. Default: fontSize * 1.5 */
  lineHeight?: number | undefined;
  /** Text color. Default: '#000' (or `CanvasText` under forced-colors) */
  color?: string | undefined;
  /** White space mode. Default: 'normal' */
  whiteSpace?: 'normal' | 'pre-wrap' | undefined;
  /** Container height. 'auto' = grow to fit. number = fixed with scroll. */
  height?: number | 'auto' | undefined;
  /** Maximum height before scrolling kicks in. */
  maxHeight?: number | undefined;
  /**
   * Whether to auto-scroll to the bottom on new content. Default: true.
   * Stick-to-bottom: only scrolls when the user is already near the bottom
   * (within 64px). Scrolling up pauses auto-scroll until they return.
   */
  autoScroll?: boolean | undefined;
  /**
   * Show a floating "Jump to latest" button when auto-scroll has paused
   * because the user scrolled up. Default: true (only meaningful when
   * `autoScroll` is true and the container is scrollable).
   */
  showScrollToBottomButton?: boolean | undefined;
  /** Padding inside the canvas area (CSS pixels). */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number } | undefined;
  /** aria-live mode for the accessibility mirror. Default: 'polite' */
  ariaLive?: 'polite' | 'assertive' | 'off' | undefined;
  /**
   * Render a transparent DOM selection overlay so users can select / copy /
   * Cmd-F text painted on the canvas. Default: true.
   */
  selectable?: boolean | undefined;
  /**
   * Cursor / typing indicator at the end of the last line.
   * - 'off' — no indicator (default)
   * - 'static' — solid 2px caret
   * - 'blink' — blinking caret (disabled under prefers-reduced-motion)
   */
  cursor?: 'off' | 'static' | 'blink' | undefined;
  /** CSS class name for the outer container. */
  className?: string | undefined;
  /** Inline styles for the outer container. */
  style?: React.CSSProperties | undefined;
  /** URL to the worker script. */
  workerUrl?: string | URL | undefined;
  /**
   * Optional ARIA label for the rendered region. Default: 'AI response'.
   * Pass `null` to omit the label entirely (e.g., when an external label
   * is wired via aria-labelledby).
   */
  ariaLabel?: string | null | undefined;
}

/** Resolved padding object. */
export interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Internal: a single highlight match's pre-computed paint geometry. */
export interface HighlightRect {
  /** Line index in `LayoutState.lines`. */
  lineIndex: number;
  /** X offset in CSS pixels (relative to text origin). */
  x: number;
  /** Width in CSS pixels. */
  width: number;
  /** Match index across all matches (for activeIndex routing). */
  matchIndex: number;
}
