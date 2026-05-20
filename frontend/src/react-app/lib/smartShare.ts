/**
 * Cross-platform share helper.
 * - Uses Web Share API on supported devices (iOS Safari, Android Chrome, Windows 11 Edge, Mac Safari 14+)
 * - Falls back to clipboard copy + toast hint on desktop browsers without share support
 *
 * Returns true when the share was completed or the URL was copied, false on user cancel / failure.
 */
export interface ShareInput {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareResult {
  ok: boolean;
  method: 'web-share' | 'clipboard' | 'prompt' | 'none';
  error?: string;
}

function canShareFiles(input: ShareInput): boolean {
  if (!input.files || input.files.length === 0) return true;
  const nav = navigator as unknown as { canShare?: (data: ShareInput) => boolean };
  return typeof nav.canShare === 'function' && nav.canShare({ files: input.files });
}

export async function smartShare(input: ShareInput): Promise<ShareResult> {
  // Prefer native share if available and the payload is supported
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && canShareFiles(input)) {
    try {
      await navigator.share(input);
      return { ok: true, method: 'web-share' };
    } catch (e) {
      const msg = (e as Error)?.message || '';
      // User cancel — don't fall through to clipboard
      if ((e as Error)?.name === 'AbortError') {
        return { ok: false, method: 'web-share', error: 'cancelled' };
      }
      // Otherwise fall through to clipboard
      console.warn('[share] native share failed, falling back to clipboard:', msg);
    }
  }

  // Clipboard fallback (HTTPS or localhost only)
  const text = input.url || input.text || input.title || '';
  if (text && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard' };
    } catch (e) {
      const msg = (e as Error)?.message || '';
      console.warn('[share] clipboard failed:', msg);
    }
  }

  // Last-resort prompt
  if (text) {
    try {
      window.prompt('Copy this link:', text);
      return { ok: true, method: 'prompt' };
    } catch { /* ignore */ }
  }

  return { ok: false, method: 'none', error: 'no_share_method' };
}

export function supportsNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
