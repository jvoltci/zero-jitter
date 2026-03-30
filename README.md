# ZeroJitter

> **Zero-layout-jitter streaming text renderer for LLM tokens.**

A production-grade React/TypeScript library that streams LLM tokens into a jitter-free `<canvas>` surface. Text measurement and layout are offloaded to a Web Worker via [`@chenglou/pretext`](https://github.com/chenglou/pretext), keeping the main thread free for 60fps interactions.

## ✨ Features

- **🚀 Zero Layout Thrashing** — All text measurement happens in a Web Worker. The main thread never calls `measureText()`.
- **🎨 Canvas Rendering** — Bypasses DOM layout entirely. No reflows, no forced synchronous layouts, no scrollbar jitter.
- **♿ Fully Accessible** — Parallel visually-hidden `aria-live` DOM mirror for screen readers.
- **📐 HiDPI / Retina** — Automatic `devicePixelRatio` scaling with monitor-switching detection.
- **⚡ Viewport Culling** — O(log n) binary search paints only visible lines. Handles 10,000+ lines smoothly.
- **🔤 Font Sync** — Blocks layout until custom fonts are loaded. No flash of wrong font.
- **📦 Tree-Shakeable** — ESM + CJS dual output, `sideEffects: false`.

## 📦 Installation

```bash
npm install zero-jitter
```

**Zero external runtime dependencies.** The text layout engine is vendored. Only peer deps:

```json
{
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0"
}
```

## 🚀 Quick Start

```tsx
import { useRef, useEffect } from 'react';
import { ZeroJitter, type ZeroJitterHandle } from 'zero-jitter';

function ChatMessage() {
  const ref = useRef<ZeroJitterHandle>(null);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = (e) => ref.current?.appendText(e.data);
    return () => es.close();
  }, []);

  return <ZeroJitter ref={ref} font="16px Inter" maxHeight={400} />;
}
```

## 🏗️ Architecture

```
┌─ Main Thread ──────────────────────────────────────────────┐
│                                                            │
│  SSE tokens → useZeroJitter hook → postMessage → Worker    │
│                                                            │
│  Worker response → CanvasRenderer.paint() → <canvas>       │
│                 → AccessibilityMirror  → <div aria-live>   │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌─ Web Worker Thread ────────────────────────────────────────┐
│                                                            │
│  Vendored pretext engine: prepareWithSegments() → layout() │
│  (Intl.Segmenter, CJK, BiDi, emoji correction)            │
│  Returns: { lines[], totalHeight, lineCount }              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

> **Note:** The text layout engine ([pretext](https://github.com/chenglou/pretext)) is vendored
> into `src/vendor/pretext/` (MIT licensed) rather than kept as an npm dependency.
> This eliminates single-author risk and enables future streaming optimizations
> (incremental `prepare()` for measuring only new tokens).

## 📖 API

### `<ZeroJitter />` Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `font` | `string` | `'16px sans-serif'` | CSS font shorthand |
| `fontSize` | `number` | `16` | Font size in px |
| `lineHeight` | `number` | `fontSize × 1.5` | Line height in px |
| `color` | `string` | `'#000'` | Text color |
| `whiteSpace` | `'normal' \| 'pre-wrap'` | `'normal'` | White space mode |
| `height` | `number \| 'auto'` | `'auto'` | Container height |
| `maxHeight` | `number` | — | Max height before scroll |
| `autoScroll` | `boolean` | `true` | Auto-scroll on new content |
| `padding` | `number \| {top,right,bottom,left}` | `0` | Canvas padding |
| `ariaLive` | `'polite' \| 'assertive' \| 'off'` | `'polite'` | Screen reader mode |
| `className` | `string` | — | Container CSS class |
| `style` | `CSSProperties` | — | Container inline styles |
| `workerUrl` | `string \| URL` | auto | Custom worker URL |

### `ZeroJitterHandle` (imperative ref)

```typescript
interface ZeroJitterHandle {
  appendText(chunk: string): void;  // Append token (no re-render)
  setText(text: string): void;      // Replace all text
  clear(): void;                    // Clear text and reset
  layout: LayoutState;              // Current layout result
  containerRef: (node: HTMLElement | null) => void;
  fontReady: boolean;               // Font loaded?
}
```

### `useZeroJitter` Hook

For advanced use cases where you need direct access to the layout engine:

```typescript
import { useZeroJitter } from 'zero-jitter';

function CustomRenderer() {
  const { appendText, layout, containerRef, fontReady } = useZeroJitter({
    font: '16px Inter',
    lineHeight: 24,
  });

  // Use layout.lines to render however you want
}
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Storybook
npm run storybook

# Lint
npm run lint
```

## 📐 How It Works

1. **Token arrives** → `appendText(chunk)` appends to a `useRef` (zero React re-renders)
2. **rAF batch** → Multiple tokens within a frame are coalesced into one worker message
3. **Worker measures** → `@chenglou/pretext` does `prepareWithSegments()` + `layoutWithLines()`
4. **Result returns** → Worker posts `{ lines[], totalHeight }` back to main thread
5. **Canvas paints** → Only visible lines are `fillText()`'d (O(log n) viewport culling)
6. **A11y updates** → Debounced (300ms) `aria-live` region mirrors text for screen readers

### Why Canvas?

DOM text rendering triggers layout recalculation on every token append. In a streaming LLM chat UI, this means:
- Forced synchronous layouts (Layout Thrashing)
- Scrollbar position jumps (Jitter)
- Frame drops during rapid token arrival

Canvas `fillText()` bypasses the entire DOM layout pipeline. Combined with off-thread measurement, the main thread stays free for user interaction.

## 📄 License

MIT
