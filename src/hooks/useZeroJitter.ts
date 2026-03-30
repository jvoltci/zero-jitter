// ─────────────────────────────────────────────────────────────
// useZeroJitter — Core orchestration hook
// ─────────────────────────────────────────────────────────────
//
// Manages streaming text buffer, worker communication,
// container dimensions, font loading, and layout state.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useContainerWidth } from './useContainerWidth';
import { useFontReady } from './useFontReady';
import type { LayoutLine, LayoutState, ZeroJitterConfig, ZeroJitterHandle } from '../types';
import type { WorkerRequest, WorkerResponse } from '../worker/messages';
import { DEFAULT_WHITE_SPACE } from '../utils/constants';

/** Empty layout state — used as initial value and after clear(). */
const EMPTY_LAYOUT: LayoutState = {
  lines: [],
  totalHeight: 0,
  lineCount: 0,
};

/**
 * Main-thread fallback layout engine.
 * Uses CanvasRenderingContext2D.measureText to compute line breaks when
 * the Web Worker fails to load (e.g., in dev/SSR/test environments).
 */
function fallbackLayout(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): LayoutState {
  if (!text || maxWidth <= 0) return EMPTY_LAYOUT;

  // Get a measurement canvas context
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Last resort: split on newlines
    const rawLines = text.split('\n');
    const lines: LayoutLine[] = rawLines.map((line, i) => ({
      text: line,
      width: 0,
      y: i * lineHeight,
    }));
    return { lines, totalHeight: lines.length * lineHeight, lineCount: lines.length };
  }

  ctx.font = font;

  const lines: LayoutLine[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      // Empty line
      lines.push({ text: '', width: 0, y: lines.length * lineHeight });
      continue;
    }

    const words = paragraph.split(/(\s+)/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        // Wrap: push current line, start new one
        const lineMetrics = ctx.measureText(currentLine);
        lines.push({
          text: currentLine,
          width: lineMetrics.width,
          y: lines.length * lineHeight,
        });
        currentLine = word.trimStart(); // Don't start new line with whitespace
      } else {
        currentLine = testLine;
      }
    }

    // Push remaining text
    if (currentLine) {
      const lineMetrics = ctx.measureText(currentLine);
      lines.push({
        text: currentLine,
        width: lineMetrics.width,
        y: lines.length * lineHeight,
      });
    }
  }

  return {
    lines,
    totalHeight: lines.length * lineHeight,
    lineCount: lines.length,
  };
}

export function useZeroJitter(config: ZeroJitterConfig): ZeroJitterHandle {
  const { font, lineHeight, whiteSpace = DEFAULT_WHITE_SPACE, workerUrl } = config;

  // ── Text buffer (never in useState — avoids re-render per token) ──
  const textRef = useRef('');

  // ── Layout state (the ONLY state that triggers re-render) ──
  const [layout, setLayout] = useState<LayoutState>(EMPTY_LAYOUT);

  // ── Container width tracking ──
  const [containerRef, containerWidth] = useContainerWidth();

  // ── Font loading gate ──
  const fontReady = useFontReady(font);

  // ── Worker lifecycle ──
  const workerRef = useRef<Worker | null>(null);
  const workerFailedRef = useRef(false);
  const requestIdRef = useRef(0);
  const rafPendingRef = useRef(false);
  const rafIdRef = useRef(0);

  // Resolve the worker URL
  const resolvedWorkerUrl = useRef<string | URL | undefined>(workerUrl);
  resolvedWorkerUrl.current = workerUrl;

  // Store current config in refs for the fallback path
  const fontRef = useRef(font);
  fontRef.current = font;
  const lineHeightRef = useRef(lineHeight);
  lineHeightRef.current = lineHeight;
  const containerWidthRef = useRef(containerWidth);
  containerWidthRef.current = containerWidth;

  useEffect(() => {
    let worker: Worker;
    let blobUrl: string | null = null;

    try {
      const url = resolvedWorkerUrl.current;
      if (url) {
        worker = new Worker(url, { type: 'module' });
      } else {
        // Create an inline worker with the layout logic bundled in.
        // This avoids the need for a separate worker file in dev environments.
        const workerCode = `
          // Inline fallback worker — uses measureText for layout.
          // In production, consumers should use the bundled worker from 'zero-jitter/worker'.
          
          let measureCanvas = null;
          let measureCtx = null;
          
          function getMeasureCtx() {
            if (!measureCtx) {
              measureCanvas = new OffscreenCanvas(1, 1);
              measureCtx = measureCanvas.getContext('2d');
            }
            return measureCtx;
          }
          
          self.onmessage = function(event) {
            const msg = event.data;
            
            if (msg.type === 'CLEAR_CACHE') {
              return;
            }
            
            if (msg.type === 'LAYOUT') {
              try {
                const { id, text, font, maxWidth, lineHeight } = msg;
                
                if (!text || maxWidth <= 0) {
                  self.postMessage({ type: 'LAYOUT_RESULT', id, lines: [], totalHeight: 0, lineCount: 0 });
                  return;
                }
                
                const ctx = getMeasureCtx();
                ctx.font = font;
                
                const lines = [];
                const paragraphs = text.split('\\n');
                
                for (const paragraph of paragraphs) {
                  if (paragraph === '') {
                    lines.push({ text: '', width: 0, y: lines.length * lineHeight });
                    continue;
                  }
                  
                  const words = paragraph.split(/(\\s+)/);
                  let currentLine = '';
                  
                  for (const word of words) {
                    const testLine = currentLine + word;
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width > maxWidth && currentLine !== '') {
                      const lineMetrics = ctx.measureText(currentLine);
                      lines.push({ text: currentLine, width: lineMetrics.width, y: lines.length * lineHeight });
                      currentLine = word.replace(/^\\s+/, '');
                    } else {
                      currentLine = testLine;
                    }
                  }
                  
                  if (currentLine) {
                    const lineMetrics = ctx.measureText(currentLine);
                    lines.push({ text: currentLine, width: lineMetrics.width, y: lines.length * lineHeight });
                  }
                }
                
                self.postMessage({
                  type: 'LAYOUT_RESULT',
                  id,
                  lines,
                  totalHeight: lines.length * lineHeight,
                  lineCount: lines.length,
                });
              } catch (error) {
                self.postMessage({
                  type: 'ERROR',
                  id: msg.id,
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            }
          };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        blobUrl = URL.createObjectURL(blob);
        worker = new Worker(blobUrl);
      }
    } catch {
      // If Worker creation fails entirely, we'll use main-thread fallback
      console.warn('[ZeroJitter] Failed to create Web Worker. Using main-thread fallback.');
      workerFailedRef.current = true;
      return;
    }

    workerRef.current = worker;

    // Handle responses from the worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      if (response.type === 'LAYOUT_RESULT') {
        // Discard stale responses (response.id < latest sent ID)
        if (response.id < requestIdRef.current) return;

        setLayout({
          lines: response.lines,
          totalHeight: response.totalHeight,
          lineCount: response.lineCount,
        });
      } else if (response.type === 'ERROR') {
        console.error('[ZeroJitter Worker Error]', response.message);
      }
    };

    worker.onerror = (error) => {
      console.error('[ZeroJitter Worker Error]', error);
      // Fall back to main thread on worker error
      workerFailedRef.current = true;
      workerRef.current = null;
    };

    const capturedBlobUrl = blobUrl;
    return () => {
      worker.terminate();
      workerRef.current = null;
      if (capturedBlobUrl) {
        URL.revokeObjectURL(capturedBlobUrl);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — worker is created once

  // ── Layout scheduling (rAF batching) ──
  const scheduleLayout = useCallback(() => {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;

    rafIdRef.current = requestAnimationFrame(() => {
      rafPendingRef.current = false;

      if (!fontReady || containerWidth === 0) return;

      const worker = workerRef.current;
      if (worker && !workerFailedRef.current) {
        // Worker path
        requestIdRef.current++;
        const message: WorkerRequest = {
          type: 'LAYOUT',
          id: requestIdRef.current,
          text: textRef.current,
          font,
          maxWidth: containerWidth,
          lineHeight,
          whiteSpace,
        };
        worker.postMessage(message);
      } else {
        // Main-thread fallback path
        const result = fallbackLayout(
          textRef.current,
          fontRef.current,
          containerWidthRef.current,
          lineHeightRef.current,
        );
        setLayout(result);
      }
    });
  }, [font, lineHeight, whiteSpace, fontReady, containerWidth]);

  // Re-layout when container width or font readiness changes
  useEffect(() => {
    if (fontReady && containerWidth > 0 && textRef.current.length > 0) {
      scheduleLayout();
    }
  }, [fontReady, containerWidth, scheduleLayout]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // ── Public API ──
  const appendText = useCallback(
    (chunk: string) => {
      textRef.current += chunk;
      scheduleLayout();
    },
    [scheduleLayout],
  );

  const setText = useCallback(
    (text: string) => {
      textRef.current = text;
      scheduleLayout();
    },
    [scheduleLayout],
  );

  const clear = useCallback(() => {
    textRef.current = '';
    setLayout(EMPTY_LAYOUT);

    const worker = workerRef.current;
    if (worker) {
      const message: WorkerRequest = { type: 'CLEAR_CACHE' };
      worker.postMessage(message);
    }
  }, []);

  return {
    appendText,
    setText,
    clear,
    layout,
    containerRef,
    fontReady,
  };
}
