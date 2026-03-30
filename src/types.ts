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
   * Default: auto-resolved from package exports.
   */
  workerUrl?: string | URL | undefined;
}

/** Imperative handle returned by useZeroJitter / exposed via ZeroJitter ref. */
export interface ZeroJitterHandle {
  /** Append new text (typically an SSE token chunk). Does NOT trigger re-render. */
  appendText: (chunk: string) => void;
  /** Replace all text. Useful for "regenerate" flows. */
  setText: (text: string) => void;
  /** Clear all text and reset layout. */
  clear: () => void;
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
  /** Text color. Default: '#000' */
  color?: string | undefined;
  /** White space mode. Default: 'normal' */
  whiteSpace?: 'normal' | 'pre-wrap' | undefined;
  /** Container height. 'auto' = grow to fit. number = fixed with scroll. */
  height?: number | 'auto' | undefined;
  /** Maximum height before scrolling kicks in. */
  maxHeight?: number | undefined;
  /** Whether to auto-scroll to the bottom on new content. Default: true */
  autoScroll?: boolean | undefined;
  /** Padding inside the canvas area (CSS pixels). */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number } | undefined;
  /** aria-live mode for the accessibility mirror. Default: 'polite' */
  ariaLive?: 'polite' | 'assertive' | 'off' | undefined;
  /** CSS class name for the outer container. */
  className?: string | undefined;
  /** Inline styles for the outer container. */
  style?: React.CSSProperties | undefined;
  /** URL to the worker script. */
  workerUrl?: string | URL | undefined;
}

/** Resolved padding object. */
export interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
