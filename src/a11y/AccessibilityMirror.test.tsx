import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AccessibilityMirror } from './AccessibilityMirror';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('AccessibilityMirror', () => {
  it('renders a polite live region', () => {
    render(<AccessibilityMirror text="" liveRegion="polite" id="zj-x" />);
    const region = screen.getByRole('log');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('id')).toBe('zj-x');
  });

  it('debounces updates and announces only the delta', () => {
    const { rerender } = render(
      <AccessibilityMirror text="" liveRegion="polite" id="zj-x" />,
    );
    rerender(<AccessibilityMirror text="Hello" liveRegion="polite" id="zj-x" />);
    // before debounce — nothing announced yet
    expect(screen.getByRole('log').textContent).toBe('');

    act(() => {
      vi.advanceTimersByTime(310);
    });
    expect(screen.getByRole('log').textContent).toBe('Hello');

    rerender(
      <AccessibilityMirror text="Hello world" liveRegion="polite" id="zj-x" />,
    );
    act(() => {
      vi.advanceTimersByTime(310);
    });
    // delta only — not the full string
    expect(screen.getByRole('log').textContent).toBe(' world');
  });

  it('clears immediately on empty text', () => {
    const { rerender } = render(
      <AccessibilityMirror text="hi" liveRegion="polite" id="zj-x" />,
    );
    act(() => {
      vi.advanceTimersByTime(310);
    });
    rerender(<AccessibilityMirror text="" liveRegion="polite" id="zj-x" />);
    expect(screen.getByRole('log').textContent).toBe('');
  });
});
