import { describe, it, expect } from 'vitest';
import type { WorkerRequest, WorkerResponse } from './messages';

describe('worker message protocol shapes', () => {
  it('LAYOUT, APPEND, RESIZE, CLEAR are valid requests', () => {
    const layout = {
      type: 'LAYOUT',
      id: 1,
      text: 'hi',
      font: '16px sans-serif',
      maxWidth: 100,
      lineHeight: 24,
    } satisfies WorkerRequest;
    const append = {
      type: 'APPEND',
      id: 2,
      delta: ' there',
      font: '16px sans-serif',
      maxWidth: 100,
      lineHeight: 24,
    } satisfies WorkerRequest;
    const resize = {
      type: 'RESIZE',
      id: 3,
      maxWidth: 200,
      lineHeight: 24,
    } satisfies WorkerRequest;
    const clear = { type: 'CLEAR' } satisfies WorkerRequest;
    expect(layout.type).toBe('LAYOUT');
    expect(append.type).toBe('APPEND');
    expect(resize.type).toBe('RESIZE');
    expect(clear.type).toBe('CLEAR');
  });

  it('LAYOUT_RESULT and ERROR are valid responses', () => {
    const result = {
      type: 'LAYOUT_RESULT',
      id: 1,
      texts: ['hello'],
      widths: [42],
      dirs: ['ltr'] as ('ltr' | 'rtl')[],
      totalHeight: 24,
      lineCount: 1,
    } satisfies WorkerResponse;
    const error = {
      type: 'ERROR',
      id: 1,
      message: 'boom',
    } satisfies WorkerResponse;
    expect(result.type).toBe('LAYOUT_RESULT');
    expect(error.type).toBe('ERROR');
  });
});
