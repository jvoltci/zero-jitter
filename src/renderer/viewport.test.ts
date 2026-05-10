import { describe, it, expect } from 'vitest';
import { getVisibleLineRange } from './viewport';

const lines = (count: number, lineHeight: number) =>
  Array.from({ length: count }, (_, i) => ({ y: i * lineHeight }));

describe('getVisibleLineRange', () => {
  it('returns 0..0 for empty input', () => {
    expect(getVisibleLineRange([], 0, 100, 20)).toEqual({ start: 0, end: 0 });
  });

  it('returns the full range when viewport covers all lines', () => {
    const ls = lines(5, 20);
    expect(getVisibleLineRange(ls, 0, 1000, 20)).toEqual({ start: 0, end: 5 });
  });

  it('clips to the visible window with binary search', () => {
    const ls = lines(1000, 16);
    // Show lines from y=320 to y=640 → indices [20, 40)
    const range = getVisibleLineRange(ls, 320, 320, 16);
    expect(range.start).toBe(20);
    expect(range.end).toBe(40);
  });

  it('returns end=lines.length when viewport extends past content', () => {
    const ls = lines(10, 20);
    expect(getVisibleLineRange(ls, 100, 1000, 20)).toEqual({ start: 5, end: 10 });
  });

  it('returns empty range when scrolled past the last line', () => {
    const ls = lines(10, 20);
    expect(getVisibleLineRange(ls, 1000, 100, 20)).toEqual({ start: 10, end: 10 });
  });

  it('handles a single line at scrollTop=0', () => {
    const ls = lines(1, 20);
    expect(getVisibleLineRange(ls, 0, 100, 20)).toEqual({ start: 0, end: 1 });
  });
});
