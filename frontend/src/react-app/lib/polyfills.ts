/**
 * Browser polyfills for older runtimes (Huawei Browser, Samsung Internet,
 * embedded WebViews) that don't ship the latest ECMAScript additions yet.
 *
 * IMPORTANT: import this file FIRST in `main.tsx`, before any other modules,
 * so the polyfills land on the global before any user code (notably pdf.js)
 * tries to use them.
 */

// --------------------------------------------------------------------------
// Promise.withResolvers — ES2024, only available in Chromium 119+, Safari 17.4,
// Firefox 121. pdf.js v4+ uses it; older Huawei/Samsung browsers crash with
// "Promise.withResolvers is not a function" without this shim.
// --------------------------------------------------------------------------
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== 'function') {
  (Promise as unknown as {
    withResolvers: <T>() => {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// --------------------------------------------------------------------------
// Array.prototype.at — Safari 15-, older WebViews.
// --------------------------------------------------------------------------
if (typeof (Array.prototype as unknown as { at?: unknown }).at !== 'function') {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, 'at', {
    value: function at(this: unknown[], n: number) {
      const len = this.length;
      const i = n < 0 ? len + n : n;
      return i >= 0 && i < len ? this[i] : undefined;
    },
    writable: true, configurable: true,
  });
}

// --------------------------------------------------------------------------
// crypto.randomUUID — older Android WebViews.
// --------------------------------------------------------------------------
if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID !== 'function') {
  (window.crypto as Crypto & { randomUUID?: () => string }).randomUUID = function () {
    const b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`;
  };
}

export {};
