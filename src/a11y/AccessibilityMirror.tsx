// ─────────────────────────────────────────────────────────────
// AccessibilityMirror — Visually hidden aria-live DOM mirror
// ─────────────────────────────────────────────────────────────
//
// Strategy: we maintain a hidden, persistent text node and only
// announce the *delta* since the last update. This avoids screen
// readers re-reading the entire response on every debounce tick
// (a real problem for long streamed answers).
//
// Empty text (after clear()) flushes immediately so the live region
// transitions to "" promptly.

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

export const AccessibilityMirror: React.FC<AccessibilityMirrorProps> = ({
  text,
  liveRegion,
  id,
}) => {
  const [announced, setAnnounced] = useState('');
  const prevTextRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Flush immediately on clear / reset.
    if (text === '') {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      prevTextRef.current = '';
      setAnnounced('');
      return;
    }

    if (timerRef.current !== null) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const prev = prevTextRef.current;
      // If the new text contains the previous as a prefix (the streaming case)
      // we announce only the delta. Otherwise (replacement) we announce all.
      const delta = text.startsWith(prev) ? text.slice(prev.length) : text;
      prevTextRef.current = text;
      setAnnounced(delta);
      timerRef.current = null;
    }, A11Y_DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [text]);

  return (
    <div
      id={id}
      role="log"
      aria-live={liveRegion}
      aria-atomic="false"
      style={srOnlyStyle}
    >
      {announced}
    </div>
  );
};

AccessibilityMirror.displayName = 'ZeroJitter.AccessibilityMirror';
