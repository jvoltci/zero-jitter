// ─────────────────────────────────────────────────────────────
// Highlight / Find — main-thread match computation
// ─────────────────────────────────────────────────────────────
//
// Computes per-line highlight rectangles given a query string or RegExp.
// Width measurement uses a shared canvas measurement context — the same
// font is set on the context as the canvas paint, so widths align.

import type { HighlightRect, LayoutLine } from '../types';

let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (measureCtx) return measureCtx;
  measureCanvas = document.createElement('canvas');
  measureCtx = measureCanvas.getContext('2d');
  return measureCtx;
}

/**
 * Compute highlight rectangles for every match of `query` across `lines`.
 *
 * - String queries are case-insensitive by default.
 * - RegExp queries respect the caller's flags. The function adds the global
 *   flag if it's missing so we get all matches per line.
 *
 * Width is measured by composing canvas `measureText` calls against the
 * same font the renderer uses. The returned rectangles' `x` is relative
 * to the text origin (the renderer adds paddingLeft when painting).
 */
export function computeHighlights(
  lines: ReadonlyArray<LayoutLine>,
  query: string | RegExp,
  font: string,
  caseInsensitive = true,
): HighlightRect[] {
  const ctx = getMeasureCtx();
  if (!ctx) return [];
  if (typeof query === 'string' && query.length === 0) return [];

  ctx.font = font;
  const rects: HighlightRect[] = [];
  let matchIndex = 0;

  let regex: RegExp;
  if (typeof query === 'string') {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(escaped, caseInsensitive ? 'gi' : 'g');
  } else {
    regex = query.flags.includes('g')
      ? query
      : new RegExp(query.source, query.flags + 'g');
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (!line || !line.text) continue;
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line.text)) !== null) {
      // Guard against zero-width matches that would loop forever.
      if (m[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      const before = line.text.slice(0, m.index);
      const match = m[0];
      const x = ctx.measureText(before).width;
      const width = ctx.measureText(match).width;
      rects.push({ lineIndex, x, width, matchIndex });
      matchIndex++;
    }
  }

  return rects;
}
