# Next.js App Router example

A drop-in `zero-jitter` integration for the Next.js App Router.

## Files

- [`app/page.tsx`](./app/page.tsx) — Server Component that imports the
  client streaming component.
- [`app/components/Stream.tsx`](./app/components/Stream.tsx) — Client
  Component that wires `EventSource` to `<ZeroJitter>`.
- [`app/api/chat/route.ts`](./app/api/chat/route.ts) — minimal SSE
  endpoint that emits a tokenized response (replace with your LLM
  provider).

## Run it

```bash
npx create-next-app@latest my-app --typescript --app
cd my-app
npm install zero-jitter
# Copy the files from this directory into the corresponding paths,
# then:
npm run dev
```

## Notes

- No `next.config.js` changes are required.
- Works under both **Webpack** and **Turbopack**.
- The Web Worker is bundled inside the package as a string and
  instantiated as a `Blob` URL at runtime — so there is no
  bundler-specific worker plugin to configure.
- For CSP-strict deployments that disallow `blob:` workers, pass
  `workerUrl={new URL('zero-jitter/dist/worker/layout.worker.js', import.meta.url)}`.
