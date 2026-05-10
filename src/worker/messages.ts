// ─────────────────────────────────────────────────────────────
// Worker Message Protocol — shared between main thread & worker
// ─────────────────────────────────────────────────────────────

/** Messages sent from the main thread TO the worker. */
export type WorkerRequest =
  | {
      type: 'LAYOUT';
      id: number; // Monotonic request ID for response correlation
      text: string; // Full accumulated text (replaces worker-side buffer)
      font: string; // CSS font shorthand, e.g. '16px Inter'
      maxWidth: number; // Container width in CSS pixels
      lineHeight: number; // Line height in CSS pixels
      whiteSpace?: 'normal' | 'pre-wrap' | undefined;
    }
  | {
      type: 'APPEND';
      id: number; // Monotonic request ID
      delta: string; // Text to append to the worker's current buffer
      font: string;
      maxWidth: number;
      lineHeight: number;
      whiteSpace?: 'normal' | 'pre-wrap' | undefined;
    }
  | {
      type: 'RESIZE';
      id: number; // Monotonic request ID
      maxWidth: number; // New container width — text/font unchanged
      lineHeight: number;
    }
  | {
      type: 'CLEAR'; // Reset worker text buffer + caches
    };

/** Messages sent from the worker TO the main thread. */
export type WorkerResponse =
  | {
      type: 'LAYOUT_RESULT';
      id: number;
      /** Parallel arrays — line i is at (texts[i], widths[i], dirs[i]). */
      texts: string[];
      widths: number[];
      dirs: ('ltr' | 'rtl')[];
      totalHeight: number;
      lineCount: number;
    }
  | {
      type: 'ERROR';
      id: number;
      message: string;
    };
