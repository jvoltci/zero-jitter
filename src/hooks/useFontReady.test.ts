import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFontReady } from './useFontReady';

interface FakeFontFaceSet {
  check: ReturnType<typeof vi.fn>;
  ready: Promise<void>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  const fakeFonts: FakeFontFaceSet = {
    check: vi.fn().mockReturnValue(false),
    ready: Promise.resolve(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(document, 'fonts', {
    value: fakeFonts,
    configurable: true,
  });
});

describe('useFontReady', () => {
  it('returns true once the font check passes', async () => {
    (document.fonts as unknown as FakeFontFaceSet).check
      .mockReturnValueOnce(false)
      .mockReturnValue(true);
    const { result } = renderHook(() => useFontReady('16px Inter'));
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('returns false initially when font is not yet loaded', () => {
    const { result } = renderHook(() => useFontReady('16px MissingFont'));
    expect(result.current).toBe(false);
  });
});
