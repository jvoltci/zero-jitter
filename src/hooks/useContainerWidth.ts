// ─────────────────────────────────────────────────────────────
// useContainerWidth — ResizeObserver hook for tracking inline size
// ─────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';

/**
 * Tracks the inline (width) dimension of a container element using ResizeObserver.
 * Returns a stable ref callback and the current width.
 *
 * Uses borderBoxSize for accuracy (excludes scrollbar width).
 * Falls back to contentRect.width for older browsers.
 */
export function useContainerWidth(): [
  refCallback: (node: HTMLElement | null) => void,
  width: number,
] {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  const refCallback = useCallback((node: HTMLElement | null) => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    nodeRef.current = node;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let newWidth: number;

        // Prefer borderBoxSize (more accurate, excludes scrollbar)
        if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
          const boxSize = entry.borderBoxSize[0];
          newWidth = boxSize ? boxSize.inlineSize : entry.contentRect.width;
        } else {
          newWidth = entry.contentRect.width;
        }

        // Only update if the width actually changed (avoid unnecessary re-renders)
        setWidth((prev) => {
          const rounded = Math.round(newWidth);
          return prev === rounded ? prev : rounded;
        });
      }
    });

    observer.observe(node, { box: 'border-box' });
    observerRef.current = observer;

    // Set initial width
    const rect = node.getBoundingClientRect();
    setWidth(Math.round(rect.width));
  }, []);

  return [refCallback, width];
}
