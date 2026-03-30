// ─────────────────────────────────────────────────────────────
// useFontReady — Font loading synchronization hook
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

/**
 * Waits for a specific font to be loaded and available for canvas measureText.
 * Uses document.fonts.ready + document.fonts.check() as a two-phase guarantee.
 *
 * Returns `true` once the font is confirmed loaded.
 * Prevents layout calculations from running on a fallback font,
 * which would produce incorrect measurements that get immediately invalidated.
 *
 * @param font  CSS font shorthand, e.g. '16px Inter' or '16px "Fira Code"'
 */
export function useFontReady(font: string): boolean {
  const [ready, setReady] = useState(() =>
    typeof document !== 'undefined' && document.fonts.check(font),
  );

  useEffect(() => {
    if (ready) return;

    let cancelled = false;

    // Phase 1: Wait for all currently-loading fonts to finish
    document.fonts.ready
      .then(() => {
        // Phase 2: Double-check our specific font is available
        if (!cancelled && document.fonts.check(font)) {
          setReady(true);
        }
      })
      .catch(() => {
        // If fonts.ready rejects (rare), fall through to loadingdone listener
      });

    // Also listen for the specific font load event (covers lazy-loaded fonts)
    const onLoadingDone = () => {
      if (!cancelled && document.fonts.check(font)) {
        setReady(true);
      }
    };
    document.fonts.addEventListener('loadingdone', onLoadingDone);

    return () => {
      cancelled = true;
      document.fonts.removeEventListener('loadingdone', onLoadingDone);
    };
  }, [font, ready]);

  return ready;
}
