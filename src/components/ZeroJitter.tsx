// ─────────────────────────────────────────────────────────────
// <ZeroJitter /> — Main React component
// ─────────────────────────────────────────────────────────────
//
// A zero-layout-jitter text renderer for streaming LLM tokens.
// Renders text via <canvas> (bypasses DOM layout), with a parallel
// accessible screen-reader mirror.

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useZeroJitter } from '../hooks/useZeroJitter';
import { paint } from '../renderer/CanvasRenderer';
import { configureCanvasForHiDPI, getDpr } from '../utils/dpr';
import { AccessibilityMirror } from '../a11y/AccessibilityMirror';
import type { ResolvedPadding, ZeroJitterHandle, ZeroJitterProps } from '../types';
import {
  DEFAULT_AUTO_SCROLL,
  DEFAULT_ARIA_LIVE,
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT_MULTIPLIER,
  DEFAULT_WHITE_SPACE,
} from '../utils/constants';

/**
 * Resolves padding prop into a consistent object.
 */
function resolvePadding(
  padding: ZeroJitterProps['padding'],
): ResolvedPadding {
  if (padding === undefined || padding === null) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  };
}

/**
 * A zero-layout-jitter text renderer for streaming LLM tokens.
 *
 * @example
 * ```tsx
 * const ref = useRef<ZeroJitterHandle>(null);
 *
 * useEffect(() => {
 *   const es = new EventSource('/api/stream');
 *   es.onmessage = (e) => ref.current?.appendText(e.data);
 *   return () => es.close();
 * }, []);
 *
 * return <ZeroJitter ref={ref} font="16px Inter" maxHeight={400} />;
 * ```
 */
export const ZeroJitter = forwardRef<ZeroJitterHandle, ZeroJitterProps>(
  function ZeroJitter(props, ref) {
    const {
      font,
      fontSize = DEFAULT_FONT_SIZE,
      lineHeight: lineHeightProp,
      color = DEFAULT_COLOR,
      whiteSpace = DEFAULT_WHITE_SPACE,
      height = 'auto',
      maxHeight,
      autoScroll = DEFAULT_AUTO_SCROLL,
      padding: paddingProp,
      ariaLive = DEFAULT_ARIA_LIVE,
      className,
      style,
      workerUrl,
    } = props;

    const resolvedFont = font ?? `${fontSize}px sans-serif`;
    const resolvedLineHeight = lineHeightProp ?? Math.round(fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER);
    const padding = useMemo(() => resolvePadding(paddingProp), [paddingProp]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [mirrorText, setMirrorText] = useState('');
    const mirrorIdRef = useRef(
      `zj-a11y-${Math.random().toString(36).slice(2, 9)}`,
    );

    const handle = useZeroJitter({
      font: resolvedFont,
      lineHeight: resolvedLineHeight,
      whiteSpace,
      workerUrl,
    });

    // Expose imperative handle via ref
    useImperativeHandle(
      ref,
      () => ({
        appendText: (chunk: string) => {
          handle.appendText(chunk);
          setMirrorText((prev) => prev + chunk);
        },
        setText: (text: string) => {
          handle.setText(text);
          setMirrorText(text);
        },
        clear: () => {
          handle.clear();
          setMirrorText('');
        },
        layout: handle.layout,
        containerRef: handle.containerRef,
        fontReady: handle.fontReady,
      }),
      [handle],
    );

    // ── Canvas painting ──
    const paintCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const scrollContainer = scrollContainerRef.current;
      if (!canvas || !scrollContainer) return;

      const { lines, totalHeight } = handle.layout;

      // Nothing to paint
      if (lines.length === 0 || totalHeight === 0) {
        // Still make sure canvas reflects "empty"
        canvas.style.width = '0px';
        canvas.style.height = '0px';
        canvas.width = 0;
        canvas.height = 0;
        return;
      }

      const dpr = getDpr();
      const containerWidth = scrollContainer.clientWidth;

      // Content height = total text height + padding
      const contentHeight = totalHeight + padding.top + padding.bottom;

      // Viewport = how tall the visible "window" is
      let viewportHeight: number;
      if (height === 'auto') {
        viewportHeight = contentHeight;
      } else if (typeof height === 'number') {
        viewportHeight = height;
      } else {
        viewportHeight = scrollContainer.clientHeight;
      }

      if (maxHeight !== undefined) {
        viewportHeight = Math.min(viewportHeight, maxHeight);
      }

      // Canvas shows exactly the viewport
      const canvasHeight = Math.max(1, Math.ceil(viewportHeight));

      const ctx = configureCanvasForHiDPI(
        canvas,
        containerWidth,
        canvasHeight,
        dpr,
      );
      if (!ctx) return;

      const scrollTop = scrollContainer.scrollTop;

      paint({
        ctx,
        lines,
        font: resolvedFont,
        lineHeight: resolvedLineHeight,
        color,
        scrollTop,
        viewportHeight: canvasHeight,
        dpr,
        canvasWidth: containerWidth,
        canvasHeight,
        paddingLeft: padding.left,
        paddingTop: padding.top,
      });
    }, [
      handle.layout,
      resolvedFont,
      resolvedLineHeight,
      color,
      height,
      maxHeight,
      padding,
    ]);

    // Repaint when layout changes
    useEffect(() => {
      paintCanvas();
    }, [paintCanvas]);

    // Auto-scroll to bottom on new content
    useEffect(() => {
      if (!autoScroll) return;
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, [handle.layout.lineCount, autoScroll]);

    // Handle scroll events → repaint canvas
    const handleScroll = useCallback(() => {
      requestAnimationFrame(paintCanvas);
    }, [paintCanvas]);

    // Handle DPR changes (e.g., dragging window between monitors)
    useEffect(() => {
      const mq = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      const handler = () => {
        paintCanvas();
      };
      mq.addEventListener('change', handler, { once: true });
      return () => mq.removeEventListener('change', handler);
    }, [paintCanvas]);

    // ── Container sizing ──
    const isFixedHeight = typeof height === 'number';
    const hasMaxHeight = maxHeight !== undefined;
    const needsScroll = isFixedHeight || hasMaxHeight;

    const contentHeight = handle.layout.totalHeight + padding.top + padding.bottom;

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      overflow: needsScroll ? 'auto' : 'visible',
      height: isFixedHeight ? `${height}px` : 'auto',
      maxHeight: hasMaxHeight ? `${maxHeight}px` : undefined,
      ...style,
    };

    return (
      <div
        ref={(node) => {
          // Wire up both the scroll container ref and the width-tracking ref
          (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          handle.containerRef(node);
        }}
        className={className}
        style={containerStyle}
        role="document"
        aria-label="AI response"
        aria-describedby={mirrorIdRef.current}
        onScroll={handleScroll}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          tabIndex={-1}
          style={{
            display: 'block',
            position: needsScroll ? 'sticky' : 'relative',
            top: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Spacer div to create correct scrollbar range */}
        {needsScroll && contentHeight > 0 && (
          <div
            aria-hidden="true"
            style={{
              width: '100%',
              height: `${contentHeight}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              visibility: 'hidden',
            }}
          />
        )}

        {/* Accessibility mirror — visually hidden, read by screen readers */}
        <AccessibilityMirror
          id={mirrorIdRef.current}
          text={mirrorText}
          liveRegion={ariaLive}
        />
      </div>
    );
  },
);

ZeroJitter.displayName = 'ZeroJitter';
