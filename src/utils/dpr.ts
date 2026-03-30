// ─────────────────────────────────────────────────────────────
// Device Pixel Ratio Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Returns the current device pixel ratio.
 * Falls back to 1 in non-browser environments (SSR).
 */
export function getDpr(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

/**
 * Configures a canvas element for HiDPI rendering.
 *
 * Sets the backing store to physical pixel dimensions and scales the
 * 2D context so that all drawing coordinates remain in CSS pixel space.
 *
 * @param canvas  The canvas element to configure.
 * @param width   Desired CSS width in pixels.
 * @param height  Desired CSS height in pixels.
 * @param dpr     Device pixel ratio (defaults to current screen DPR).
 * @returns       The configured 2D rendering context.
 */
export function configureCanvasForHiDPI(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number = getDpr(),
): CanvasRenderingContext2D | null {
  // CSS size (what the user sees)
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Backing store size (physical pixels)
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Scale context — all subsequent drawing uses CSS pixel coordinates
  ctx.scale(dpr, dpr);

  // Good hygiene: disable image smoothing for crisp text edges
  ctx.imageSmoothingEnabled = false;

  return ctx;
}
