// ─────────────────────────────────────────────────────────────
// useZeroJitter — Core orchestration hook
// ─────────────────────────────────────────────────────────────
//
// Manages streaming text buffer, worker communication, container
// dimensions, font loading, and layout state.
//
// Design notes:
// - Layout state lives in an external store so token-rate updates do
//   not push through React reconciliation. Subscribers (canvas paint,
//   optional consumers) read via useSyncExternalStore.
// - Streaming uses an APPEND protocol — the worker holds the canonical
//   text buffer; the main thread just ships deltas. setText/clear send
//   LAYOUT/CLEAR. Resize sends LAYOUT (worker re-uses pretext caches).
// - When no `workerUrl` is provided we instantiate the worker from a
//   build-time inlined source string. This works in Next.js (App Router
//   and Pages Router), Vite, Remix, plain CRA, and any modern bundler
//   without bundler-specific worker plugin config.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useContainerWidth } from './useContainerWidth';
import { useFontReady } from './useFontReady';
import type {
  HighlightOptions,
  HighlightRect,
  LayoutLine,
  LayoutState,
  ZeroJitterConfig,
  ZeroJitterHandle,
} from '../types';
import type { WorkerRequest, WorkerResponse } from '../worker/messages';
import { DEFAULT_WHITE_SPACE } from '../utils/constants';
import { computeHighlights } from '../utils/highlight';
import { WORKER_SOURCE } from '../.generated/worker-inline';

const EMPTY_LAYOUT: LayoutState = {
  lines: [],
  totalHeight: 0,
  lineCount: 0,
};

// ── External layout store ────────────────────────────────────
interface LayoutStore {
  get(): LayoutState;
  set(next: LayoutState): void;
  subscribe(fn: () => void): () => void;
}

function createLayoutStore(): LayoutStore {
  let snapshot: LayoutState = EMPTY_LAYOUT;
  const listeners = new Set<() => void>();
  return {
    get: () => snapshot,
    set: (next) => {
      snapshot = next;
      listeners.forEach((l) => l());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// ── Default worker bootstrap ─────────────────────────────────
//
// The minified worker source is embedded at build time. We construct
// a Blob, get a URL, and start a module Worker. The blob URL is
// revoked on the next tick — by then the worker has loaded the source.
//
// If `WORKER_SOURCE` is empty (dev — pre-build), we throw a clear
// error rather than silently degrading.

function createDefaultWorker(): Worker {
  if (typeof Worker === 'undefined') {
    throw new Error('[zero-jitter] Web Workers are not available in this environment.');
  }
  if (!WORKER_SOURCE || WORKER_SOURCE.length === 0) {
    throw new Error(
      '[zero-jitter] Inline worker source is empty. ' +
        'Run `npm run build` to populate it, or pass a `workerUrl` prop.',
    );
  }
  const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: 'module' });
  // Schedule revocation; the worker has captured the source.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return worker;
}

export function useZeroJitter(config: ZeroJitterConfig): ZeroJitterHandle {
  const { font, lineHeight, whiteSpace = DEFAULT_WHITE_SPACE, workerUrl } = config;

  // ── Layout external store ──
  const store = useMemo(() => createLayoutStore(), []);
  const layout = useSyncExternalStore(
    store.subscribe,
    store.get,
    () => EMPTY_LAYOUT,
  );

  // ── Container width / font readiness ──
  const [containerRef, containerWidth] = useContainerWidth();
  const fontReady = useFontReady(font);

  // ── Highlight state (main-thread, separate from layout store) ──
  const highlightsRef = useRef<HighlightRect[]>([]);
  const highlightOptsRef = useRef<HighlightOptions>({});

  // ── Worker / scheduling refs ──
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const rafIdRef = useRef(0);
  const rafPendingRef = useRef(false);
  const queuedDeltaRef = useRef('');
  const queuedReplaceRef = useRef<string | null>(null);
  const textRef = useRef('');

  // ── Stable ref mirrors of reactive props (read inside rAF callbacks) ──
  const fontRef = useRef(font);
  fontRef.current = font;
  const lineHeightRef = useRef(lineHeight);
  lineHeightRef.current = lineHeight;
  const whiteSpaceRef = useRef(whiteSpace);
  whiteSpaceRef.current = whiteSpace;
  const widthRef = useRef(containerWidth);
  widthRef.current = containerWidth;
  const fontReadyRef = useRef(fontReady);
  fontReadyRef.current = fontReady;

  // ── Worker lifecycle (one worker per hook instance) ──
  useEffect(() => {
    let worker: Worker;
    try {
      worker = workerUrl
        ? new Worker(workerUrl, { type: 'module' })
        : createDefaultWorker();
    } catch (err) {
      console.warn('[zero-jitter] Failed to create Web Worker:', err);
      return;
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === 'LAYOUT_RESULT') {
        if (response.id < requestIdRef.current) return; // stale
        const lh = lineHeightRef.current;
        const lines: LayoutLine[] = new Array(response.texts.length);
        for (let i = 0; i < response.texts.length; i++) {
          lines[i] = {
            text: response.texts[i]!,
            width: response.widths[i]!,
            y: i * lh,
            dir: response.dirs[i] ?? 'ltr',
          };
        }
        store.set({
          lines,
          totalHeight: response.totalHeight,
          lineCount: response.lineCount,
        });
      } else if (response.type === 'ERROR') {
        console.error('[zero-jitter] Worker error:', response.message);
      }
    };

    worker.onerror = (e) => {
      console.error('[zero-jitter] Worker error event:', e.message);
    };

    workerRef.current = worker;

    // Replay any text buffered before the worker existed.
    if (textRef.current.length > 0) {
      queuedReplaceRef.current = textRef.current;
      schedule();
    }

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // We intentionally re-init only when workerUrl changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerUrl, store]);

  // ── Flush queued operations to the worker ──
  const flush = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    if (!fontReadyRef.current || widthRef.current <= 0) return;

    const replace = queuedReplaceRef.current;
    const delta = queuedDeltaRef.current;

    requestIdRef.current++;
    const id = requestIdRef.current;

    if (replace !== null) {
      const message: WorkerRequest = {
        type: 'LAYOUT',
        id,
        text: replace,
        font: fontRef.current,
        maxWidth: widthRef.current,
        lineHeight: lineHeightRef.current,
        whiteSpace: whiteSpaceRef.current,
      };
      textRef.current = replace;
      worker.postMessage(message);
    } else if (delta.length > 0) {
      const message: WorkerRequest = {
        type: 'APPEND',
        id,
        delta,
        font: fontRef.current,
        maxWidth: widthRef.current,
        lineHeight: lineHeightRef.current,
        whiteSpace: whiteSpaceRef.current,
      };
      textRef.current += delta;
      worker.postMessage(message);
    } else {
      // Width / font / lineHeight changed — replay current buffer.
      if (textRef.current.length === 0) return;
      const message: WorkerRequest = {
        type: 'LAYOUT',
        id,
        text: textRef.current,
        font: fontRef.current,
        maxWidth: widthRef.current,
        lineHeight: lineHeightRef.current,
        whiteSpace: whiteSpaceRef.current,
      };
      worker.postMessage(message);
    }

    queuedReplaceRef.current = null;
    queuedDeltaRef.current = '';
  }, []);

  const schedule = useCallback(() => {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      rafPendingRef.current = false;
      flush();
    });
  }, [flush]);

  // ── Re-layout on width / font / lineHeight / whiteSpace changes ──
  useEffect(() => {
    if (!fontReady || containerWidth <= 0) return;
    if (textRef.current.length === 0) return;
    schedule();
  }, [containerWidth, fontReady, font, lineHeight, whiteSpace, schedule]);

  // ── Cleanup rAF on unmount ──
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // ── Public imperative API ──
  const appendText = useCallback(
    (chunk: string) => {
      if (chunk.length === 0) return;
      if (queuedReplaceRef.current !== null) {
        queuedReplaceRef.current += chunk;
      } else {
        queuedDeltaRef.current += chunk;
      }
      schedule();
    },
    [schedule],
  );

  const setText = useCallback(
    (text: string) => {
      queuedReplaceRef.current = text;
      queuedDeltaRef.current = '';
      schedule();
    },
    [schedule],
  );

  const clear = useCallback(() => {
    queuedReplaceRef.current = null;
    queuedDeltaRef.current = '';
    textRef.current = '';
    highlightsRef.current = [];
    highlightOptsRef.current = {};
    store.set(EMPTY_LAYOUT);
    workerRef.current?.postMessage({ type: 'CLEAR' } satisfies WorkerRequest);
  }, [store]);

  const highlight = useCallback(
    (query: string | RegExp, options?: HighlightOptions): { count: number } => {
      const lines = store.get().lines;
      const caseInsensitive = options?.caseInsensitive ?? true;
      const rects = computeHighlights(lines, query, fontRef.current, caseInsensitive);
      highlightsRef.current = rects;
      highlightOptsRef.current = options ?? {};
      // Re-emit layout to trigger a paint (same shape, new ref).
      store.set({ ...store.get() });
      return { count: rects.length };
    },
    [store],
  );

  const clearHighlight = useCallback(() => {
    if (highlightsRef.current.length === 0) return;
    highlightsRef.current = [];
    highlightOptsRef.current = {};
    store.set({ ...store.get() });
  }, [store]);

  // scrollToBottom is owned by the component layer; standalone-hook users
  // render their own scroller, so we expose a no-op stable identity here.
  const scrollToBottom = useCallback(() => {
    /* component layer overrides */
  }, []);

  const handle: ZeroJitterHandle = {
    appendText,
    setText,
    clear,
    highlight,
    clearHighlight,
    scrollToBottom,
    layout,
    containerRef,
    fontReady,
  };

  // Side-channel for the component layer to read highlight state without
  // re-rendering on every change.
  (handle as unknown as Record<string, unknown>).__highlightsRef = highlightsRef;
  (handle as unknown as Record<string, unknown>).__highlightOptsRef = highlightOptsRef;

  return handle;
}
