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
    typeof document !== 'undefined' && typeof document.fonts !== 'undefined'
      ? document.fonts.check(font)
      : false,
  );

  useEffect(() => {
    if (typeof document === 'undefined' || typeof document.fonts === 'undefined') {
      // Fonts API unavailable — assume ready so layout doesn't stall.
      setReady(true);
      return;
    }

    if (document.fonts.check(font)) {
      setReady(true);
      return;
    }

    let cancelled = false;

    document.fonts.ready
      .then(() => {
        if (!cancelled && document.fonts.check(font)) {
          setReady(true);
        }
      })
      .catch(() => {
        // If fonts.ready rejects (rare), the loadingdone listener still has us covered.
      });

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
  }, [font]);

  return ready;
}
