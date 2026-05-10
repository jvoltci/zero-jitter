import { describe, it, expect, vi } from 'vitest';
import { getDpr, configureCanvasForHiDPI } from './dpr';

describe('getDpr', () => {
  it('falls back to 1 when devicePixelRatio is absent', () => {
    const original = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });
    expect(getDpr()).toBe(1);
    Object.defineProperty(window, 'devicePixelRatio', { value: original, configurable: true });
  });

  it('reads window.devicePixelRatio', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    expect(getDpr()).toBe(2);
  });
});

describe('configureCanvasForHiDPI', () => {
  it('sets CSS size and backing-store size for the given DPR', () => {
    const canvas = document.createElement('canvas');
    const fakeCtx = {
      scale: vi.fn(),
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(canvas, 'getContext').mockReturnValue(fakeCtx);

    const ctx = configureCanvasForHiDPI(canvas, 100, 50, 2);
    expect(canvas.style.width).toBe('100px');
    expect(canvas.style.height).toBe('50px');
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(100);
    expect(ctx).toBe(fakeCtx);
  });

  it('returns null when the context cannot be acquired', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    expect(configureCanvasForHiDPI(canvas, 100, 50, 1)).toBeNull();
  });
});
