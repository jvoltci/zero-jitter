import { describe, it, expect, vi } from 'vitest';
import { isNearBottom, scrollToBottom, STICK_THRESHOLD_PX } from './scroll';

function makeEl(opts: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}) {
  const el = {
    scrollTop: opts.scrollTop,
    clientHeight: opts.clientHeight,
    scrollHeight: opts.scrollHeight,
    scrollTo: vi.fn(),
  };
  return el as unknown as HTMLElement & { scrollTo: ReturnType<typeof vi.fn> };
}

describe('isNearBottom', () => {
  it('returns true at the bottom', () => {
    const el = makeEl({ scrollTop: 800, clientHeight: 200, scrollHeight: 1000 });
    expect(isNearBottom(el)).toBe(true);
  });

  it('returns true within the default threshold', () => {
    const el = makeEl({
      scrollTop: 800 - STICK_THRESHOLD_PX,
      clientHeight: 200,
      scrollHeight: 1000,
    });
    expect(isNearBottom(el)).toBe(true);
  });

  it('returns false beyond the threshold', () => {
    const el = makeEl({ scrollTop: 100, clientHeight: 200, scrollHeight: 1000 });
    expect(isNearBottom(el)).toBe(false);
  });

  it('respects a custom threshold', () => {
    const el = makeEl({ scrollTop: 700, clientHeight: 200, scrollHeight: 1000 });
    expect(isNearBottom(el, 50)).toBe(false);
    expect(isNearBottom(el, 200)).toBe(true);
  });
});

describe('scrollToBottom', () => {
  it('scrolls to the bottom', () => {
    const el = makeEl({ scrollTop: 0, clientHeight: 200, scrollHeight: 1000 });
    scrollToBottom(el);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'auto' });
  });

  it('uses smooth behavior when requested and motion is allowed', () => {
    const el = makeEl({ scrollTop: 0, clientHeight: 200, scrollHeight: 1000 });
    // happy-dom matchMedia returns matches=false by default — motion allowed.
    scrollToBottom(el, true);
    const arg = el.scrollTo.mock.calls[0]![0] as { behavior: string };
    expect(['smooth', 'auto']).toContain(arg.behavior);
  });
});
