// ─────────────────────────────────────────────────────────────
// Viewport / Occlusion Culling Math
// ─────────────────────────────────────────────────────────────

/**
 * Determines which lines intersect the visible viewport using binary search.
 *
 * Given a sorted array of lines (each with a pre-calculated `y` offset),
 * a scroll offset, and a viewport height, returns the [start, end) range
 * of line indices that need painting.
 *
 * @param lines          Sorted array of lines with pre-calculated Y offsets.
 * @param scrollTop      Current scroll position in CSS pixels.
 * @param viewportHeight Height of the visible area in CSS pixels.
 * @param lineHeight     Height of each line in CSS pixels.
 * @returns              { start, end } — indices for the visible slice.
 */
export function getVisibleLineRange(
  lines: ReadonlyArray<{ y: number }>,
  scrollTop: number,
  viewportHeight: number,
  lineHeight: number,
): { start: number; end: number } {
  if (lines.length === 0) {
    return { start: 0, end: 0 };
  }

  const viewportBottom = scrollTop + viewportHeight;

  // Binary search for the first line whose bottom edge is >= scrollTop
  let start = 0;
  let lo = 0;
  let hi = lines.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const lineBottom = (lines[mid]?.y ?? 0) + lineHeight;

    if (lineBottom <= scrollTop) {
      lo = mid + 1;
    } else {
      start = mid;
      hi = mid - 1;
    }
  }

  // Binary search for the last line whose top edge is < viewportBottom
  let end = lines.length;
  lo = start;
  hi = lines.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const lineTop = lines[mid]?.y ?? 0;

    if (lineTop >= viewportBottom) {
      end = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  return { start, end };
}
