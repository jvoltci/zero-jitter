// ─────────────────────────────────────────────────────────────
// Scroll Helpers — stick-to-bottom auto-scroll behavior
// ─────────────────────────────────────────────────────────────

/**
 * Distance from the bottom (in CSS pixels) within which we still consider
 * the user "at the bottom" — i.e., auto-scroll should keep snapping down.
 *
 * 64px ≈ four lines at 16px text. Tight enough that a deliberate scroll-up
 * obviously breaks the stick, loose enough to absorb sub-pixel rounding,
 * elastic overscroll on macOS, and the spacer-spacer geometry trick we use
 * for sticky canvas + scrollbar range.
 */
export const STICK_THRESHOLD_PX = 64;

/** True if the scroll position is within `threshold` of the bottom. */
export function isNearBottom(
  el: HTMLElement,
  threshold: number = STICK_THRESHOLD_PX,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

/** Scroll to the bottom. Honors `prefers-reduced-motion`. */
export function scrollToBottom(el: HTMLElement, smooth = false): void {
  const prefersReduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth && !prefersReduce ? 'smooth' : 'auto',
  });
}
