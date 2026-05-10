// ─────────────────────────────────────────────────────────────
// Canvas Renderer — paints visible text lines onto <canvas>
// ─────────────────────────────────────────────────────────────

import { getVisibleLineRange } from './viewport';
import type { HighlightRect, LayoutLine } from '../types';

export interface PaintOptions {
  ctx: CanvasRenderingContext2D;
  lines: ReadonlyArray<LayoutLine>;
  font: string;
  lineHeight: number;
  color: string;
  scrollTop: number;
  viewportHeight: number;
  dpr: number;
  canvasWidth: number;
  canvasHeight: number;
  paddingLeft?: number | undefined;
  paddingTop?: number | undefined;
  /** Optional highlight overlays (drawn under the text). */
  highlights?: ReadonlyArray<HighlightRect> | undefined;
  /** Fill color for non-active highlight rects. */
  highlightColor?: string | undefined;
  /** Match index considered "active" — drawn with `activeColor`. */
  activeHighlightIndex?: number | undefined;
  /** Fill color for the active highlight rect. */
  activeHighlightColor?: string | undefined;
}

/**
 * Paints the visible text lines onto the canvas.
 *
 * 1. Clears the full canvas.
 * 2. Computes visible line range via binary search (O(log n)).
 * 3. Draws highlight rectangles (under the text) for visible matches.
 * 4. Calls fillText() for each visible line at its pre-calculated Y position.
 * 5. Uses textBaseline = 'top' for consistent positioning.
 */
export function paint(options: PaintOptions): void {
  const {
    ctx,
    lines,
    font,
    lineHeight,
    color,
    scrollTop,
    viewportHeight,
    canvasWidth,
    canvasHeight,
    paddingLeft = 0,
    paddingTop = 0,
    highlights,
    highlightColor = 'rgba(255, 213, 0, 0.45)',
    activeHighlightIndex = -1,
    activeHighlightColor = 'rgba(255, 140, 0, 0.65)',
  } = options;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (lines.length === 0) return;

  const { start, end } = getVisibleLineRange(lines, scrollTop, viewportHeight, lineHeight);

  // ── Highlights pass (under the text) ──
  if (highlights && highlights.length > 0) {
    for (let h = 0; h < highlights.length; h++) {
      const rect = highlights[h]!;
      if (rect.lineIndex < start || rect.lineIndex >= end) continue;
      const line = lines[rect.lineIndex];
      if (!line) continue;
      const y = line.y - scrollTop + paddingTop;
      ctx.fillStyle =
        rect.matchIndex === activeHighlightIndex ? activeHighlightColor : highlightColor;
      ctx.fillRect(rect.x + paddingLeft, y, rect.width, lineHeight);
    }
  }

  // ── Text pass ──
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  let prevDir: 'ltr' | 'rtl' | null = null;
  let prevAlign: CanvasTextAlign | null = null;

  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!line) continue;
    const dir = line.dir ?? 'ltr';
    if (dir !== prevDir) {
      ctx.direction = dir;
      prevDir = dir;
    }
    const align: CanvasTextAlign = dir === 'rtl' ? 'right' : 'left';
    if (align !== prevAlign) {
      ctx.textAlign = align;
      prevAlign = align;
    }
    const y = line.y - scrollTop + paddingTop;
    if (dir === 'rtl') {
      ctx.fillText(line.text, canvasWidth - paddingLeft, y);
    } else {
      ctx.fillText(line.text, paddingLeft, y);
    }
  }
}
