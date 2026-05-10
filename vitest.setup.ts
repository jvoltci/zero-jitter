import '@testing-library/jest-dom/vitest';

// happy-dom-friendly stubs that some libraries reach for during render.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number): void => clearTimeout(id);
}

// happy-dom does not implement ResizeObserver — provide a noop.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class NoopResizeObserver implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  // @ts-expect-error happy-dom global typing
  globalThis.ResizeObserver = NoopResizeObserver;
}

// Many tests don't need a real worker; tests that do construct a fake one.
if (typeof globalThis.Worker === 'undefined') {
  class FakeWorker {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;
    postMessage(): void {}
    terminate(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return true;
    }
  }
  // @ts-expect-error global Worker
  globalThis.Worker = FakeWorker;
}
