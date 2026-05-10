// ─────────────────────────────────────────────────────────────
// Layout Web Worker — all text measurement happens here
// ─────────────────────────────────────────────────────────────
//
// This worker owns the vendored pretext engine. The main thread must NEVER
// call prepare() or layout() directly. Communication is via strongly-typed
// postMessage (see ./messages.ts).
//
// Buffer ownership: the worker holds the canonical text buffer. The main
// thread sends APPEND deltas during streaming (cheap) or LAYOUT to replace.
// On every layout request we re-prepare — pretext caches segment widths
// per-font internally, so subsequent prepares share the same width cache.

import {
  prepareWithSegments,
  layoutWithLines,
  clearCache,
  type PreparedTextWithSegments,
} from '../vendor/pretext';
import type { WorkerRequest, WorkerResponse } from './messages';

// ── Worker-side state ────────────────────────────────────────
let currentText = '';
let currentFont: string | null = null;
let currentWhiteSpace: 'normal' | 'pre-wrap' = 'normal';
let prepared: PreparedTextWithSegments | null = null;

function reprepare(text: string, font: string, whiteSpace: 'normal' | 'pre-wrap'): void {
  prepared = prepareWithSegments(text, font, { whiteSpace });
  currentText = text;
  currentFont = font;
  currentWhiteSpace = whiteSpace;
}

/**
 * Compute the dominant text direction for a single line.
 *
 * `prepared.segLevels` is null when the text is plain LTR (pretext skips
 * computing it). When it exists, even levels = LTR, odd = RTL. We pick
 * the dominant level across the line's segment range.
 */
function computeLineDir(
  p: PreparedTextWithSegments,
  startSegmentIndex: number,
  endSegmentIndex: number,
): 'ltr' | 'rtl' {
  const levels = p.segLevels;
  if (!levels || levels.length === 0) return 'ltr';
  let ltrChars = 0;
  let rtlChars = 0;
  for (let i = startSegmentIndex; i < endSegmentIndex && i < levels.length; i++) {
    const seg = p.segments[i] ?? '';
    const level = levels[i] ?? 0;
    if (level % 2 === 0) ltrChars += seg.length;
    else rtlChars += seg.length;
  }
  return rtlChars > ltrChars ? 'rtl' : 'ltr';
}

function postLayoutResult(id: number, maxWidth: number, lineHeight: number): void {
  if (!prepared) {
    self.postMessage({
      type: 'LAYOUT_RESULT',
      id,
      texts: [],
      widths: [],
      dirs: [],
      totalHeight: 0,
      lineCount: 0,
    } satisfies WorkerResponse);
    return;
  }
  const result = layoutWithLines(prepared, maxWidth, lineHeight);
  const texts: string[] = new Array(result.lines.length);
  const widths: number[] = new Array(result.lines.length);
  const dirs: ('ltr' | 'rtl')[] = new Array(result.lines.length);

  for (let i = 0; i < result.lines.length; i++) {
    const line = result.lines[i]!;
    texts[i] = line.text;
    widths[i] = line.width;
    dirs[i] = computeLineDir(prepared, line.start.segmentIndex, line.end.segmentIndex);
  }

  self.postMessage({
    type: 'LAYOUT_RESULT',
    id,
    texts,
    widths,
    dirs,
    totalHeight: result.height,
    lineCount: result.lineCount,
  } satisfies WorkerResponse);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  try {
    if (msg.type === 'CLEAR') {
      clearCache();
      currentText = '';
      currentFont = null;
      prepared = null;
      return;
    }

    if (msg.type === 'RESIZE') {
      // Same text/font — just re-emit with the new width.
      // (We still call layoutWithLines; pretext keeps segment widths cached.)
      if (!prepared) {
        self.postMessage({
          type: 'LAYOUT_RESULT',
          id: msg.id,
          texts: [],
          widths: [],
          dirs: [],
          totalHeight: 0,
          lineCount: 0,
        } satisfies WorkerResponse);
        return;
      }
      postLayoutResult(msg.id, msg.maxWidth, msg.lineHeight);
      return;
    }

    if (msg.type === 'LAYOUT') {
      const whiteSpace = msg.whiteSpace ?? 'normal';
      if (msg.text.length === 0) {
        currentText = '';
        prepared = null;
        self.postMessage({
          type: 'LAYOUT_RESULT',
          id: msg.id,
          texts: [],
          widths: [],
          dirs: [],
          totalHeight: 0,
          lineCount: 0,
        } satisfies WorkerResponse);
        return;
      }
      if (msg.text !== currentText || msg.font !== currentFont || whiteSpace !== currentWhiteSpace) {
        reprepare(msg.text, msg.font, whiteSpace);
      }
      postLayoutResult(msg.id, msg.maxWidth, msg.lineHeight);
      return;
    }

    if (msg.type === 'APPEND') {
      const whiteSpace = msg.whiteSpace ?? 'normal';
      const next = currentText + msg.delta;
      if (next.length === 0) {
        prepared = null;
        currentText = '';
        self.postMessage({
          type: 'LAYOUT_RESULT',
          id: msg.id,
          texts: [],
          widths: [],
          dirs: [],
          totalHeight: 0,
          lineCount: 0,
        } satisfies WorkerResponse);
        return;
      }
      // Re-prepare the full buffer. Future enhancement: incremental prepare
      // that only segments the appended tail. For now, pretext's per-segment
      // width cache keeps the marginal cost tractable.
      reprepare(next, msg.font, whiteSpace);
      postLayoutResult(msg.id, msg.maxWidth, msg.lineHeight);
      return;
    }
  } catch (error) {
    const id = 'id' in msg ? msg.id : -1;
    const response: WorkerResponse = {
      type: 'ERROR',
      id,
      message: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
