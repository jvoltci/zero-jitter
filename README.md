<div align="center">

# `zero-jitter`

**Zero-layout-jitter streaming text for LLM token streams.**
Off-thread measurement (Web Worker + vendored `pretext` engine) +
canvas paint with viewport culling. No DOM reflows, no scrollbar
jitter, no main-thread `measureText`.

[![npm](https://img.shields.io/npm/v/zero-jitter?color=4f46e5&label=npm&style=flat-square)](https://www.npmjs.com/package/zero-jitter)
[![bundle](https://img.shields.io/bundlephobia/minzip/zero-jitter?color=22c55e&label=gzip&style=flat-square)](https://bundlephobia.com/package/zero-jitter)
[![types](https://img.shields.io/npm/types/zero-jitter?color=2563eb&style=flat-square)](#)
[![license](https://img.shields.io/npm/l/zero-jitter?color=64748b&style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/jvoltci/zero-jitter/ci.yml?branch=master&label=CI&style=flat-square)](https://github.com/jvoltci/zero-jitter/actions)

`React 18+` · `Next.js (App + Pages)` · `Vite` · `Remix` · `CRA`

</div>

---

## TL;DR

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { ZeroJitter, type ZeroJitterHandle } from 'zero-jitter';

export default function Chat() {
  const ref = useRef<ZeroJitterHandle>(null);
  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = (e) => ref.current?.appendText(e.data);
    return () => es.close();
  }, []);
  return <ZeroJitter ref={ref} font="16px Inter" maxHeight={420} />;
}
```

That's it. CJK, RTL, emoji, selection (`Cmd+C`), find (`Cmd+F`), screen
readers, HiDPI, prefers-reduced-motion — all on by default.

---

## Why

Streaming LLM tokens into a normal `<div>` triggers DOM layout work on
**every token**. With ~30 tokens/s and a few hundred lines of context
that's hundreds of forced synchronous layouts per response — the symptom
is *layout thrashing*: jittery scrollbars, dropped frames, choppy autoscroll.

`zero-jitter` solves this with one orthogonal architectural choice:

1. **Measurement runs in a Web Worker** (vendored
   [`pretext`](https://github.com/chenglou/pretext) engine, MIT-licensed).
   The main thread never calls `measureText`.
2. **Paint lands on `<canvas>`** with binary-search viewport culling
   (`O(log n)`).
3. **Selection / copy / find** still work because we mirror the visible
   slice into a transparent DOM overlay.

The result: token append → rAF batch → worker layout → canvas fillText.
No reflows. No `getBoundingClientRect`. No React renders during streaming
(layout state lives in an external store and is consumed via
`useSyncExternalStore`).

---

## Install

```bash
npm install zero-jitter
# or
pnpm add zero-jitter
yarn add zero-jitter
bun add zero-jitter
```

Peer deps: `react ≥ 18`, `react-dom ≥ 18` (React 19 fully supported).
Zero runtime dependencies — the layout engine is vendored.

---

## Quick start (any framework)

```tsx
import { useEffect, useRef } from 'react';
import { ZeroJitter, type ZeroJitterHandle } from 'zero-jitter';

function StreamingMessage({ url }: { url: string }) {
  const ref = useRef<ZeroJitterHandle>(null);

  useEffect(() => {
    const es = new EventSource(url);
    es.onmessage = (e) => ref.current?.appendText(e.data);
    es.onerror = () => es.close();
    return () => es.close();
  }, [url]);

  return (
    <ZeroJitter
      ref={ref}
      font='16px "Inter", system-ui, sans-serif'
      color="#1f2937"
      maxHeight={420}
      padding={16}
      cursor="blink"
    />
  );
}
```

### Imperative methods

| Method                                | Effect                                                            |
| ------------------------------------- | ----------------------------------------------------------------- |
| `appendText(chunk)`                   | Append a token chunk. Coalesced per rAF. **No re-render.**        |
| `setText(text)`                       | Replace the buffer (e.g., regenerate flows).                      |
| `clear()`                             | Empty the buffer and the worker cache.                            |
| `highlight(query, options?)`          | Highlight every match of a string/RegExp. Returns `{ count }`.    |
| `clearHighlight()`                    | Remove all highlight overlays.                                    |
| `scrollToBottom()`                    | Re-stick to the bottom and scroll there.                          |

```ts
const { count } = ref.current!.highlight('error', {
  highlightColor: 'rgba(255, 213, 0, 0.45)',
  activeIndex: 0,
  activeColor: 'rgba(255, 90, 60, 0.7)',
});
```

---

## Framework recipes

### Next.js (App Router) ⚡

`zero-jitter` ships `'use client'` directives in every output file, so
nothing extra is needed beyond putting the component in a Client
Component module:

```tsx
// app/components/Stream.tsx
'use client';
import { useEffect, useRef } from 'react';
import { ZeroJitter, type ZeroJitterHandle } from 'zero-jitter';

export default function Stream() {
  const ref = useRef<ZeroJitterHandle>(null);
  useEffect(() => {
    const es = new EventSource('/api/chat');
    es.onmessage = (e) => ref.current?.appendText(e.data);
    return () => es.close();
  }, []);
  return <ZeroJitter ref={ref} font="16px Inter" maxHeight={500} />;
}
```

```tsx
// app/page.tsx — Server Component, imports the client one.
import Stream from './components/Stream';
export default function Page() {
  return <Stream />;
}
```

The Web Worker is bundled inside the package as a string and
instantiated as a `Blob` at runtime — no Next.js `webpack` config,
no `next.config.js` changes, and works with **Turbopack** out of the box.

### Next.js (Pages Router)

Same code, but no `'use client'` is required (Pages Router runs
everything client-side already).

### Vite / Remix / CRA

Same code as the [Quick start](#quick-start-any-framework) — no
bundler-specific configuration needed.

### Custom worker URL (CSP / nonce)

If your CSP forbids `blob:` workers (rare but real), point at the
shipped worker file directly:

```tsx
const workerUrl = new URL(
  'zero-jitter/dist/worker/layout.worker.js',
  import.meta.url,
);
<ZeroJitter workerUrl={workerUrl} />;
```

This works under Vite and Webpack 5 / Next.js because both bundlers
recognize `new URL(..., import.meta.url)` for worker imports.

---

## Props

| Prop                          | Type                                              | Default              | Description                                                              |
| ----------------------------- | ------------------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| `font`                        | `string`                                          | `'16px sans-serif'`  | CSS font shorthand.                                                      |
| `fontSize`                    | `number`                                          | `16`                 | Used to derive the default `lineHeight`.                                 |
| `lineHeight`                  | `number`                                          | `fontSize × 1.5`     | Line height in px.                                                       |
| `color`                       | `string`                                          | `'#000000'`          | Text color.                                                              |
| `whiteSpace`                  | `'normal' \| 'pre-wrap'`                          | `'normal'`           | Whitespace handling.                                                     |
| `height`                      | `number \| 'auto'`                                | `'auto'`             | Container height.                                                        |
| `maxHeight`                   | `number`                                          | —                    | Max height before scroll.                                                |
| `autoScroll`                  | `boolean`                                         | `true`               | Stick-to-bottom behavior. Pauses when user scrolls up.                   |
| `showScrollToBottomButton`    | `boolean`                                         | `true`               | Show *↓ Jump to latest* button when paused.                              |
| `padding`                     | `number \| {top,right,bottom,left}`               | `0`                  | Inside-canvas padding.                                                   |
| `selectable`                  | `boolean`                                         | `true`               | Render the transparent DOM selection overlay.                            |
| `cursor`                      | `'off' \| 'static' \| 'blink'`                    | `'off'`              | End-of-line cursor / typing indicator.                                   |
| `ariaLive`                    | `'polite' \| 'assertive' \| 'off'`                | `'polite'`           | Screen-reader announcement mode.                                         |
| `ariaLabel`                   | `string \| null`                                  | `'AI response'`      | Pass `null` to omit (e.g., when external `aria-labelledby` is present).  |
| `className` / `style`         |                                                   | —                    | Outer container.                                                         |
| `workerUrl`                   | `string \| URL`                                   | inline-bundled       | Override the worker URL (CSP-strict environments).                       |

---

## Architecture

```
┌─ Main thread ────────────────────────────────────────────────┐
│                                                              │
│  appendText(token) ──► rAF batch ──► postMessage(delta) ─┐   │
│                                                          │   │
│  external store ◄── parallel-array {texts, widths, dirs} ┘   │
│        │                                                     │
│        ├──► canvas.fillText (visible slice, O(log n))        │
│        ├──► <span> selection overlay (Cmd+C / Cmd+F)         │
│        └──► aria-live mirror (delta-only, debounced 300ms)   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─ Web Worker ────────────────────────────────────────────────┐
│  vendored pretext: prepareWithSegments() + layoutWithLines()│
│  (Intl.Segmenter, CJK, BiDi, emoji correction, soft hyphens)│
│  Worker holds the canonical text buffer; main ships deltas. │
└─────────────────────────────────────────────────────────────┘
```

**Why vendor pretext?** Three reasons: eliminate single-author dep
risk, enable future incremental `prepare()` for streaming, and let us
ship a single self-contained worker bundle without a `noExternal` hack.

---

## Performance characteristics

- **Main-thread cost per token**: 1 `postMessage(delta)` + 1 rAF tick.
  No `measureText`, no DOM reads.
- **Paint cost**: `O(visible lines)`. With viewport culling, a 10k-line
  buffer paints the same number of pixels as a 50-line one.
- **React render cost during stream**: zero. Layout state lives in an
  external store; only the canvas effect subscribes.
- **Postmessage payload**: `O(delta)` (token-sized), not `O(buffer)`.

> Numbers vary with content, font, and hardware. Run the included
> Storybook (`npm run storybook`) to measure on your machine.

---

## Comparison

| | DOM `<div>` | `react-window` | `react-virtuoso` | **`zero-jitter`** |
|---|---|---|---|---|
| Off-thread measurement      | ✗ | ✗ | ✗ | ✓ |
| Zero React renders during stream | ✗ | ✗ | ✗ | ✓ |
| Canvas paint                | ✗ | ✗ | ✗ | ✓ |
| CJK / BiDi / emoji correct  | partial | partial | partial | ✓ |
| Selection / copy / find     | ✓ | ✓ | ✓ | ✓ (overlay) |
| `aria-live` screen reader   | manual | manual | manual | ✓ |
| Stick-to-bottom auto-scroll | manual | manual | partial | ✓ |
| Find / highlight API        | manual | manual | manual | ✓ |
| Bundle (gz, core)           | 0 | ~5 KB | ~12 KB | ~5 KB + 30 KB worker |

---

## Internationalization & accessibility

- **CJK / Thai / Khmer** — segmented via `Intl.Segmenter` with kinsoku
  rules.
- **BiDi** — pretext computes per-segment levels; the renderer sets
  `ctx.direction` and `textAlign` per line. Pure-RTL paragraphs render
  correctly. *Mixed-direction shaping on `<canvas>` remains a documented
  limitation pending HarfBuzz integration.*
- **Emoji** — Chrome/Firefox canvas inflates emoji widths at small
  sizes; the worker auto-detects and corrects per font.
- **Screen readers** — visually hidden `aria-live` mirror announces
  only the delta since the last tick (300 ms debounce). No re-reading
  the whole buffer.
- **`prefers-reduced-motion`** — disables the cursor blink and the
  smooth-scroll variant of `scrollToBottom`.
- **`forced-colors: active`** — fall back to system text color when
  applicable (use `color: 'CanvasText'`).

---

## Bundle size

The published payload (`dist/`):

| Bundle                              | Limit (gz)  |
| ----------------------------------- | ----------- |
| `dist/index.js` (ESM, with worker)  | ≤ 50 KB     |
| `dist/index.cjs`                    | ≤ 55 KB     |
| `dist/worker/layout.worker.js`      | ≤ 40 KB     |
| `dist/internals.js`                 | ≤ 8 KB      |

CI gates every PR with `size-limit`; budgets live in
[`.size-limit.json`](./.size-limit.json).

---

## API reference

### `<ZeroJitter />`

See the [Props](#props) table.

### `useZeroJitter(config)` — for custom renderers

```ts
import { useZeroJitter } from 'zero-jitter';

function Custom() {
  const { appendText, layout, containerRef, fontReady } = useZeroJitter({
    font: '16px Inter',
    lineHeight: 24,
  });
  // Render layout.lines however you like.
}
```

### `zero-jitter/internals` — escape hatches (unstable)

```ts
import {
  paint,
  getVisibleLineRange,
  configureCanvasForHiDPI,
  getDpr,
  computeHighlights,
  isNearBottom,
  scrollToBottom,
  useContainerWidth,
  useFontReady,
} from 'zero-jitter/internals';
```

API stability: *not* covered by semver before `1.0.0`. Pin a patch
version if you depend on these.

---

## FAQ

**Does it work with Server Components?**
Yes. The component is a Client Component (`'use client'` is preserved
through the build), and the worker constructs lazily inside
`useEffect`. Import `<ZeroJitter>` from a `'use client'` file in any
Server Component.

**Will it work with my CSP?**
Default mode requires `worker-src blob:` and `script-src blob:`. If
that's not allowed, pass `workerUrl` pointing at the shipped
`zero-jitter/dist/worker/layout.worker.js`. The worker is then
loaded from the same origin under `script-src 'self'`.

**SSR / static export?**
The component renders a stable container during SSR; the worker is
client-only. No hydration mismatch.

**Why isn't text selectable by default?**
It is — through the transparent DOM overlay. Set `selectable={false}`
to opt out (slightly less DOM in long buffers).

**Markdown / code blocks?**
Use **[`stream-md`](https://www.npmjs.com/package/stream-md)** for
incremental markdown rendering; it composes well with `zero-jitter`
for the plain-text portions.

**OffscreenCanvas paint-in-worker?**
Roadmap. Currently measurement runs in the worker; paint runs on the
main thread. The architectural delta is small.

---

## Companion: StreamMD

| Use case                                                          | Package      |
| ----------------------------------------------------------------- | ------------ |
| Plain text token stream, max throughput, zero DOM reflow          | `zero-jitter` |
| Markdown token stream with incremental block rendering            | [`stream-md`](https://www.npmjs.com/package/stream-md) |

Together they form a complete streaming LLM UI stack.

---

## Development

```bash
npm install
npm run typecheck   # strict TS
npm run lint
npm test            # Vitest + happy-dom
npm run coverage
npm run build       # tsup: worker → inline-source generator → main bundle
npm run size        # bundle-size budget gate
npm run storybook   # interactive playground
```

The build pipeline:

1. `tsup` builds `dist/worker/layout.worker.js` (with vendored pretext).
2. `scripts/inline-worker.mjs` reads it and writes
   `src/.generated/worker-inline.ts` (`export const WORKER_SOURCE = "..."`).
3. `tsup` builds `dist/index.{js,cjs}` and `dist/internals.{js,cjs}`,
   inlining the worker source.

CI runs the same chain on Node 20 + 22 plus an `npm pack --dry-run`
that fails if `CLAUDE.md` ever lands in the publish payload.

---

## Contributing

Issues and PRs welcome. Please:

1. Add a test for behavior changes (`src/**/*.test.{ts,tsx}`).
2. Run `npm run lint && npm run typecheck && npm test && npm run build && npm run size`
   locally before opening a PR.
3. Add a changeset (`npm run changeset`) describing user-facing impact.

## Acknowledgements

- [`pretext`](https://github.com/chenglou/pretext) — the layout engine
  this package vendors. MIT-licensed; LICENSE preserved in
  `src/vendor/pretext/`.
- Sebastian Markbåge's [text-layout research](https://github.com/chenglou/text-layout).

## License

MIT — see [LICENSE](./LICENSE).
