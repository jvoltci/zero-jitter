// ─────────────────────────────────────────────────────────────
// AccessibilityMirror — Visually hidden aria-live DOM mirror
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { A11Y_DEBOUNCE_MS } from '../utils/constants';

interface AccessibilityMirrorProps {
  /** The full text content to expose to screen readers. */
  text: string;
  /** aria-live attribute. 'polite' for streaming, 'assertive' for errors. */
  liveRegion: 'polite' | 'assertive' | 'off';
  /** Unique ID for aria-labelledby / aria-describedby linking. */
  id: string;
}

/**
 * Screen-reader-only styles. Uses the "sr-only" pattern which is
 * preferable to `display: none` or `visibility: hidden` — those
 * hide content from screen readers entirely.
 */
const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
  pointerEvents: 'none',
};

/**
 * Renders a visually hidden container that mirrors the canvas text content.
 *
 * - Uses `aria-live="polite"` so screen readers announce new content
 *   without interrupting the current reading flow.
 * - Updates are DEBOUNCED (300ms) to avoid overwhelming screen readers
 *   with rapid token-by-token announcements.
 * - pointer-events: none prevents accidental interaction.
 */
export const AccessibilityMirror: React.FC<AccessibilityMirrorProps> = ({
  text,
  liveRegion,
  id,
}) => {
  const [debouncedText, setDebouncedText] = useState(text);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If text is empty (clear()), update immediately
    if (text === '') {
      setDebouncedText('');
      return;
    }

    // Debounce updates during streaming
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedText(text);
      timerRef.current = null;
    }, A11Y_DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text]);

  return (
    <div
      id={id}
      role="log"
      aria-live={liveRegion}
      aria-atomic="false"
      aria-relevant="additions text"
      style={srOnlyStyle}
    >
      {debouncedText}
    </div>
  );
};

AccessibilityMirror.displayName = 'AccessibilityMirror';
