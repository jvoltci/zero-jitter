import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeHighlights } from './highlight';
import type { LayoutLine } from '../types';

function mkLines(...texts: string[]): LayoutLine[] {
  return texts.map((text, i) => ({ text, width: 0, y: i * 20 }));
}

beforeEach(() => {
  // Stub canvas measureText so widths are deterministic regardless of font.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    measureText: (s: string) => ({ width: s.length * 10 }),
    set font(_v: string) {},
    get font() {
      return '';
    },
  })) as unknown as HTMLCanvasElement['getContext'];
});

describe('computeHighlights', () => {
  it('returns empty for empty query', () => {
    const lines = mkLines('hello world');
    expect(computeHighlights(lines, '', '16px sans-serif')).toEqual([]);
  });

  it('finds case-insensitive string matches across lines', () => {
    const lines = mkLines('Hello World', 'hello there');
    const rects = computeHighlights(lines, 'hello', '16px sans-serif');
    expect(rects.map((r) => r.lineIndex)).toEqual([0, 1]);
    expect(rects.map((r) => r.matchIndex)).toEqual([0, 1]);
    // each match width = 5 chars * 10 = 50
    expect(rects[0]!.width).toBe(50);
  });

  it('handles regex queries', () => {
    const lines = mkLines('abc 123 def 456');
    const rects = computeHighlights(lines, /\d+/, '16px sans-serif');
    expect(rects).toHaveLength(2);
    expect(rects[0]!.matchIndex).toBe(0);
    expect(rects[1]!.matchIndex).toBe(1);
  });

  it('returns empty when no matches exist', () => {
    const lines = mkLines('abc def');
    expect(computeHighlights(lines, 'xyz', '16px sans-serif')).toEqual([]);
  });

  it('escapes regex metacharacters in string queries', () => {
    const lines = mkLines('foo (bar) baz');
    const rects = computeHighlights(lines, '(bar)', '16px sans-serif');
    expect(rects).toHaveLength(1);
  });
});
