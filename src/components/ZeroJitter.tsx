// ─────────────────────────────────────────────────────────────
// <ZeroJitter /> — Main React component
// ─────────────────────────────────────────────────────────────
// (`'use client'` is added at bundle time by scripts/finalize-build.mjs.)
//
// A zero-layout-jitter text renderer for streaming LLM tokens.
// Renders text via <canvas> (bypasses DOM layout), with a parallel
// accessible screen-reader mirror, an optional transparent DOM
// selection overlay, and a configurable cursor / scroll-to-bottom
// affordance.

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
import { SelectionOverlay } from './SelectionOverlay';
import type {
  HighlightOptions,
  HighlightRect,
  ResolvedPadding,
  ZeroJitterHandle,
  ZeroJitterProps,
} from '../types';
import {
  DEFAULT_AUTO_SCROLL,
  DEFAULT_ARIA_LIVE,
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT_MULTIPLIER,
  DEFAULT_WHITE_SPACE,
} from '../utils/constants';
import { isNearBottom, scrollToBottom as scrollToBottomEl } from '../utils/scroll';

function resolvePadding(padding: ZeroJitterProps['padding']): ResolvedPadding {
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
      showScrollToBottomButton = true,
      padding: paddingProp,
      ariaLive = DEFAULT_ARIA_LIVE,
      ariaLabel = 'AI response',
      selectable = true,
      cursor = 'off',
      className,
      style,
      workerUrl,
    } = props;

    const resolvedFont = font ?? `${fontSize}px sans-serif`;
    const resolvedLineHeight =
      lineHeightProp ?? Math.round(fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER);
    const padding = useMemo(() => resolvePadding(paddingProp), [paddingProp]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef = useRef(true);
    const [showJump, setShowJump] = useState(false);
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

    const handleAny = handle as unknown as {
      __highlightsRef: { current: HighlightRect[] };
      __highlightOptsRef: { current: HighlightOptions };
    };

    // ── Imperative handle exposure ──
    const scrollToBottomImpl = useCallback(() => {
      const sc = scrollContainerRef.current;
      if (!sc) return;
      stickToBottomRef.current = true;
      setShowJump(false);
      scrollToBottomEl(sc);
    }, []);

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
        highlight: handle.highlight,
        clearHighlight: handle.clearHighlight,
        scrollToBottom: scrollToBottomImpl,
        layout: handle.layout,
        containerRef: handle.containerRef,
        fontReady: handle.fontReady,
      }),
      [handle, scrollToBottomImpl],
    );

    // ── Canvas painting ──
    const paintCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const scrollContainer = scrollContainerRef.current;
      if (!canvas || !scrollContainer) return;

      const { lines, totalHeight } = handle.layout;

      if (lines.length === 0 || totalHeight === 0) {
        canvas.style.width = '0px';
        canvas.style.height = '0px';
        canvas.width = 0;
        canvas.height = 0;
        return;
      }

      const dpr = getDpr();
      const containerWidth = scrollContainer.clientWidth;
      const contentHeight = totalHeight + padding.top + padding.bottom;

      let viewportHeight: number;
      if (height === 'auto') viewportHeight = contentHeight;
      else if (typeof height === 'number') viewportHeight = height;
      else viewportHeight = scrollContainer.clientHeight;

      if (maxHeight !== undefined) {
        viewportHeight = Math.min(viewportHeight, maxHeight);
      }
      const canvasHeight = Math.max(1, Math.ceil(viewportHeight));

      const ctx = configureCanvasForHiDPI(canvas, containerWidth, canvasHeight, dpr);
      if (!ctx) return;

      const scrollTop = scrollContainer.scrollTop;
      const highlights = handleAny.__highlightsRef?.current ?? [];
      const hOpts = handleAny.__highlightOptsRef?.current ?? {};

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
        highlights,
        highlightColor: hOpts.highlightColor,
        activeHighlightIndex: hOpts.activeIndex,
        activeHighlightColor: hOpts.activeColor,
      });
    }, [
      handle.layout,
      handleAny,
      resolvedFont,
      resolvedLineHeight,
      color,
      height,
      maxHeight,
      padding,
    ]);

    // Repaint when layout changes (the external store re-renders us only
    // when the snapshot identity flips, which happens once per worker tick).
    useEffect(() => {
      paintCanvas();
    }, [paintCanvas]);

    // ── Stick-to-bottom auto-scroll ──
    useEffect(() => {
      if (!autoScroll) return;
      const sc = scrollContainerRef.current;
      if (!sc) return;

      if (stickToBottomRef.current) {
        scrollToBottomEl(sc);
        setShowJump(false);
      } else {
        // Content grew but the user is scrolled up — show "Jump to latest".
        setShowJump(true);
      }
    }, [handle.layout.lineCount, autoScroll]);

    // ── Scroll handler: track stick state + repaint on scroll ──
    const handleScroll = useCallback(() => {
      const sc = scrollContainerRef.current;
      if (sc) {
        stickToBottomRef.current = isNearBottom(sc);
        if (stickToBottomRef.current) setShowJump(false);
      }
      requestAnimationFrame(paintCanvas);
    }, [paintCanvas]);

    // ── DPR change detection (persistent listener that re-attaches) ──
    useEffect(() => {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      let mq: MediaQueryList | null = null;
      let cancelled = false;

      const attach = () => {
        if (cancelled) return;
        const dpr = window.devicePixelRatio || 1;
        mq = window.matchMedia(`(resolution: ${dpr}dppx)`);
        mq.addEventListener('change', handler);
      };
      const handler = () => {
        if (mq) mq.removeEventListener('change', handler);
        paintCanvas();
        attach(); // re-attach for the new DPR
      };
      attach();

      return () => {
        cancelled = true;
        if (mq) mq.removeEventListener('change', handler);
      };
    }, [paintCanvas]);

    // ── Container sizing ──
    const isFixedHeight = typeof height === 'number';
    const hasMaxHeight = maxHeight !== undefined;
    const needsScroll = isFixedHeight || hasMaxHeight;
    const contentHeight = handle.layout.totalHeight + padding.top + padding.bottom;
    const containerWidth = scrollContainerRef.current?.clientWidth ?? 0;

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      overflow: needsScroll ? 'auto' : 'visible',
      height: isFixedHeight ? `${height}px` : 'auto',
      maxHeight: hasMaxHeight ? `${maxHeight}px` : undefined,
      ...style,
    };

    // ── Cursor position (end of last line) ──
    const lastLine = handle.layout.lines[handle.layout.lines.length - 1];
    const cursorEnabled = cursor !== 'off' && lastLine !== undefined;

    return (
      <div
        ref={(node) => {
          (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          handle.containerRef(node);
        }}
        className={className}
        style={containerStyle}
        aria-label={ariaLabel ?? undefined}
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

        {/* Spacer creating correct scrollbar range when scrolling */}
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

        {/* Selection overlay — transparent DOM mirror enabling text selection / Cmd-F */}
        {selectable && handle.fontReady && containerWidth > 0 && (
          <SelectionOverlay
            lines={handle.layout.lines}
            font={resolvedFont}
            lineHeight={resolvedLineHeight}
            scrollTop={scrollContainerRef.current?.scrollTop ?? 0}
            viewportHeight={
              needsScroll
                ? scrollContainerRef.current?.clientHeight ?? 0
                : contentHeight
            }
            paddingLeft={padding.left}
            paddingTop={padding.top}
            contentHeight={contentHeight}
            width={containerWidth}
          />
        )}

        {/* Cursor / typing indicator */}
        {cursorEnabled && (
          <span
            aria-hidden="true"
            data-zj-cursor={cursor}
            style={{
              position: 'absolute',
              top: `${(lastLine?.y ?? 0) + padding.top}px`,
              left: `${(lastLine?.width ?? 0) + padding.left + 1}px`,
              width: 2,
              height: `${resolvedLineHeight}px`,
              background: color,
              animation:
                cursor === 'blink' ? 'zj-cursor-blink 1s step-end infinite' : 'none',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Jump-to-latest button when stick-to-bottom has paused */}
        {autoScroll && showScrollToBottomButton && showJump && needsScroll && (
          <button
            type="button"
            onClick={scrollToBottomImpl}
            aria-label="Jump to latest"
            style={{
              position: 'sticky',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(20,20,30,0.85)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              zIndex: 2,
              backdropFilter: 'blur(8px)',
            }}
          >
            ↓ Jump to latest
          </button>
        )}

        {/* Local cursor blink keyframes (scoped via data attribute) */}
        {cursor === 'blink' && (
          <style>{`@keyframes zj-cursor-blink { 0%, 50% { opacity: 1 } 50.01%, 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { [data-zj-cursor='blink'] { animation: none !important } }`}</style>
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
