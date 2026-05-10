// ─────────────────────────────────────────────────────────────
// SelectionOverlay — Transparent DOM mirror for native selection
// ─────────────────────────────────────────────────────────────
//
// The canvas paints the visible text but cannot be selected. This
// overlay positions one transparent <span> per visible line, using
// the exact same font / size / line-height as the canvas. The
// browser handles native selection, copy (Cmd+C), and find-in-page
// (Cmd+F) on the overlay, while the canvas remains the painted
// surface beneath.
//
// Performance: only renders the visible slice (start..end). For
// 10k-line buffers this is a few dozen nodes max.

import React from 'react';
import type { LayoutLine } from '../types';
import { getVisibleLineRange } from '../renderer/viewport';

interface SelectionOverlayProps {
  lines: ReadonlyArray<LayoutLine>;
  font: string;
  lineHeight: number;
  scrollTop: number;
  viewportHeight: number;
  paddingLeft: number;
  paddingTop: number;
  /** Total content height (used by the overlay container's intrinsic size). */
  contentHeight: number;
  /** Width available for text (clientWidth). */
  width: number;
}

const baseLineStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  margin: 0,
  padding: 0,
  whiteSpace: 'pre',
  color: 'transparent',
  // Native selection styling stays on; the painted canvas underneath is not affected.
  userSelect: 'text',
  pointerEvents: 'auto',
  // Disable accidental layout reflow effects.
  contain: 'layout paint',
};

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  lines,
  font,
  lineHeight,
  scrollTop,
  viewportHeight,
  paddingLeft,
  paddingTop,
  contentHeight,
  width,
}) => {
  if (lines.length === 0) return null;

  const { start, end } = getVisibleLineRange(lines, scrollTop, viewportHeight, lineHeight);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: `${width}px`,
    height: `${contentHeight}px`,
    pointerEvents: 'none',
    // Ensure the overlay is above the canvas in stacking order so selection
    // is hit-tested correctly.
    zIndex: 1,
  };

  const visible: React.ReactNode[] = [];
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!line) continue;
    visible.push(
      <span
        key={i}
        style={{
          ...baseLineStyle,
          top: `${line.y + paddingTop}px`,
          left: `${paddingLeft}px`,
          font,
          lineHeight: `${lineHeight}px`,
          height: `${lineHeight}px`,
          direction: line.dir ?? 'ltr',
        }}
      >
        {line.text}
      </span>,
    );
  }

  return (
    <div aria-hidden="true" style={containerStyle}>
      {visible}
    </div>
  );
};

SelectionOverlay.displayName = 'ZeroJitter.SelectionOverlay';
