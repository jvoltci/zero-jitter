// ─────────────────────────────────────────────────────────────
// Worker Message Protocol — shared between main thread & worker
// ─────────────────────────────────────────────────────────────

/** Messages sent from the main thread TO the worker. */
export type WorkerRequest =
  | {
      type: 'LAYOUT';
      id: number; // Monotonic request ID for response correlation
      text: string; // Full accumulated text
      font: string; // CSS font shorthand, e.g. '16px Inter'
      maxWidth: number; // Container width in CSS pixels
      lineHeight: number; // Line height in CSS pixels
      whiteSpace?: 'normal' | 'pre-wrap' | undefined;
    }
  | {
      type: 'CLEAR_CACHE'; // Forward to pretext's clearCache()
    };

/** Messages sent from the worker TO the main thread. */
export type WorkerResponse =
  | {
      type: 'LAYOUT_RESULT';
      id: number;
      lines: ReadonlyArray<{
        text: string;
        width: number;
        y: number; // Pre-calculated Y offset (lineIndex × lineHeight)
      }>;
      totalHeight: number;
      lineCount: number;
    }
  | {
      type: 'ERROR';
      id: number;
      message: string;
    };
