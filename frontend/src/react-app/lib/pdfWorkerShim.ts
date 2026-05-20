/**
 * Build a Blob-URL'd pdf.js worker that polyfills `Promise.withResolvers`
 * before importing the real worker. Mirror of the main-thread polyfill in
 * `lib/polyfills.ts`, but injected into the worker's global scope.
 *
 * Older Huawei / Samsung browsers ship a Chromium that pre-dates ES2024;
 * pdf.js v4+ uses `Promise.withResolvers` inside the worker and crashes
 * with "Promise.withResolvers is not a function" without this shim.
 */

const POLYFILL_SOURCE = `
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function() {
    var resolve, reject;
    var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });
    return { promise: promise, resolve: resolve, reject: reject };
  };
}
`;

/**
 * Returns a Blob URL that, when used as a Web Worker source, evaluates the
 * polyfill first and then `importScripts(realWorkerUrl)`. `importScripts`
 * works for classic workers; for ES-module workers (`.mjs`) we fall back
 * to dynamic `import()` inside the Blob.
 */
export function makePatchedWorkerSrc(realWorkerUrl: string): string {
  const isModule = realWorkerUrl.endsWith('.mjs');
  const body = isModule
    ? `${POLYFILL_SOURCE}\nimport(${JSON.stringify(realWorkerUrl)}).catch(function(e){ self.console && console.error('worker load failed', e); });`
    : `${POLYFILL_SOURCE}\ntry { importScripts(${JSON.stringify(realWorkerUrl)}); } catch (e) { self.console && console.error('worker load failed', e); }`;
  const blob = new Blob([body], {
    type: isModule ? 'text/javascript' : 'application/javascript',
  });
  return URL.createObjectURL(blob);
}
