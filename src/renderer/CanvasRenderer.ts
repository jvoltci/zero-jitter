// ─────────────────────────────────────────────────────────────
// Canvas Renderer — paints visible text lines onto <canvas>
// ─────────────────────────────────────────────────────────────

import { getVisibleLineRange } from './viewport';
import type { LayoutLine } from '../types';

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
}

/**
 * Paints the visible text lines onto the canvas.
 *
 * 1. Clears the full canvas.
 * 2. Computes visible line range via binary search (O(log n)).
 * 3. Calls fillText() for each visible line at its pre-calculated Y position.
 * 4. Uses textBaseline = 'top' for consistent positioning.
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
  } = options;

  // Clear the entire canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (lines.length === 0) return;

  // Determine which lines are visible
  const { start, end } = getVisibleLineRange(lines, scrollTop, viewportHeight, lineHeight);

  // Configure text rendering
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  // Paint only the visible lines
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!line) continue;

    // Y position relative to the viewport (account for scroll)
    const y = line.y - scrollTop + paddingTop;

    ctx.fillText(line.text, paddingLeft, y);
  }
}
