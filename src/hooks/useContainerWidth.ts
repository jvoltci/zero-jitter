// ─────────────────────────────────────────────────────────────
// useContainerWidth — ResizeObserver hook for tracking inline size
// ─────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';

/**
 * Tracks the inline (width) dimension of a container element.
 *
 * Returns a stable ref callback and the current width.
 *
 * Width source: `clientWidth` is preferred over `borderBoxSize.inlineSize`
 * because it excludes any vertical scrollbar gutter — which is the actual
 * region the canvas paints into. If we used `borderBoxSize`, the wrap
 * width fed to the layout worker would briefly exceed the canvas paint
 * width whenever a scrollbar appears, producing one frame of overflow
 * before re-wrapping.
 */
export function useContainerWidth(): [
  refCallback: (node: HTMLElement | null) => void,
  width: number,
] {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const refCallback = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) {
      return;
    }

    const update = () => {
      const next = node.clientWidth;
      setWidth((prev) => (prev === next ? prev : next));
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => update());
      observer.observe(node);
      observerRef.current = observer;
    }

    // Initial sync read.
    update();
  }, []);

  return [refCallback, width];
}
