import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { NOW, server } from './server';

// jsdom lacks a few browser APIs that Radix and sonner rely on.
class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function () {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= function () {};
window.matchMedia ??= (query: string) =>
  ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {},
     addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;

beforeAll(() => {
  // Freeze only Date: timers stay real, so msw and user-event behave normally.
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  server.listen({ onUnhandledRequest: 'error' });
  // The app calls fetch('/api/...'). Node has no page origin to resolve relative URLs against,
  // so prefix one here. Wrapped after listen() so msw still intercepts the call.
  const mswFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    mswFetch(typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input, init)
  ) as typeof fetch;
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());