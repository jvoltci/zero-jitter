import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { ZeroJitter } from './ZeroJitter';
import type { ZeroJitterHandle } from '../types';

beforeEach(() => {
  // The inline worker source is empty pre-build — the hook logs a warning
  // and falls back to no-op. We expect that warning in unit tests.
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Stub canvas getContext for happy-dom.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    measureText: (s: string) => ({ width: s.length * 7 }),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    set font(_v: string) {},
    get font() {
      return '';
    },
    set fillStyle(_v: string) {},
    get fillStyle() {
      return '';
    },
    set textBaseline(_v: string) {},
    get textBaseline() {
      return 'top';
    },
    set textAlign(_v: string) {},
    get textAlign() {
      return 'left';
    },
    set direction(_v: string) {},
    get direction() {
      return 'ltr';
    },
    set imageSmoothingEnabled(_v: boolean) {},
    get imageSmoothingEnabled() {
      return false;
    },
  })) as unknown as HTMLCanvasElement['getContext'];
});

describe('<ZeroJitter />', () => {
  it('renders without crashing', () => {
    const { container } = render(<ZeroJitter />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('exposes an imperative handle with the documented surface', () => {
    const ref = createRef<ZeroJitterHandle>();
    render(<ZeroJitter ref={ref} />);
    expect(typeof ref.current?.appendText).toBe('function');
    expect(typeof ref.current?.setText).toBe('function');
    expect(typeof ref.current?.clear).toBe('function');
    expect(typeof ref.current?.highlight).toBe('function');
    expect(typeof ref.current?.clearHighlight).toBe('function');
    expect(typeof ref.current?.scrollToBottom).toBe('function');
    expect(ref.current?.layout).toMatchObject({ lines: [], lineCount: 0, totalHeight: 0 });
  });

  it('omits the aria-label when ariaLabel is null', () => {
    const { container } = render(<ZeroJitter ariaLabel={null} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.hasAttribute('aria-label')).toBe(false);
  });
});
