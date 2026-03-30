// ─────────────────────────────────────────────────────────────
// Layout Web Worker — all text measurement happens here
// ─────────────────────────────────────────────────────────────
//
// This worker owns @chenglou/pretext. The main thread must NEVER
// call prepare() or layout() directly. Communication is via
// strongly-typed postMessage (see ./messages.ts).

import {
  prepareWithSegments,
  layoutWithLines,
  clearCache,
  type PreparedTextWithSegments,
} from '../vendor/pretext';
import type { WorkerRequest, WorkerResponse } from './messages';

// ── Preparation cache ────────────────────────────────────────
// Cache the last prepared result to avoid re-preparing on every token append.
// Pretext's prepare() can be expensive; layoutWithLines() is pure arithmetic (~0.09ms).
let lastText: string | null = null;
let lastFont: string | null = null;
let lastWhiteSpace: 'normal' | 'pre-wrap' = 'normal';
let lastPrepared: PreparedTextWithSegments | null = null;

// ── Message handler ──────────────────────────────────────────
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  if (msg.type === 'CLEAR_CACHE') {
    clearCache();
    lastText = null;
    lastFont = null;
    lastPrepared = null;
    return;
  }

  if (msg.type === 'LAYOUT') {
    try {
      const { id, text, font, maxWidth, lineHeight, whiteSpace = 'normal' } = msg;

      // Handle empty text
      if (text.length === 0) {
        const response: WorkerResponse = {
          type: 'LAYOUT_RESULT',
          id,
          lines: [],
          totalHeight: 0,
          lineCount: 0,
        };
        self.postMessage(response);
        return;
      }

      // Only re-prepare if text, font, or whiteSpace changed
      if (text !== lastText || font !== lastFont || whiteSpace !== lastWhiteSpace) {
        lastPrepared = prepareWithSegments(text, font, { whiteSpace });
        lastText = text;
        lastFont = font;
        lastWhiteSpace = whiteSpace;
      }

      const result = layoutWithLines(lastPrepared!, maxWidth, lineHeight);

      const lines = result.lines.map((line, i) => ({
        text: line.text,
        width: line.width,
        y: i * lineHeight,
      }));

      const response: WorkerResponse = {
        type: 'LAYOUT_RESULT',
        id,
        lines,
        totalHeight: result.height,
        lineCount: result.lineCount,
      };

      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        type: 'ERROR',
        id: msg.id,
        message: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    }
  }
};
