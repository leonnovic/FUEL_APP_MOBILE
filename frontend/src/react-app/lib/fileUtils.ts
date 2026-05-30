/**
 * fileUtils.ts — Mobile-safe file download and PDF handling utility.
 *
 * Strategy:
 * 1. Native Capacitor share sheet on mobile (iOS/Android) — avoids the broken
 *    <a download> behaviour inside WKWebView / Android WebView.
 * 2. On desktop browsers, falls back to a standard anchor-click download.
 * 3. If the browser lacks Blob URL support, falls back to window.open().
 */

import { Capacitor } from "@capacitor/core";

interface DownloadOptions {
  /** File content as a Blob, base64 string, or URL string */
  data: Blob | string;
  /** Suggested filename including extension, e.g. "report-2025.pdf" */
  filename: string;
  /** MIME type — defaults to "application/octet-stream" */
  mimeType?: string;
  /** Human-readable title shown in the native share sheet (mobile only) */
  title?: string;
}

/** Convert a base64 string to a Blob */
function base64ToBlob(b64: string, mimeType: string): Blob {
  const byteChars = atob(b64.replace(/^data:[^;]+;base64,/, ""));
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/** Convert data (Blob | base64 | URL) to a Blob */
async function toBlob(data: Blob | string, mimeType: string): Promise<Blob> {
  if (data instanceof Blob) return data;
  if (typeof data === "string" && data.startsWith("data:")) {
    return base64ToBlob(data, mimeType);
  }
  if (typeof data === "string" && (data.startsWith("http://") || data.startsWith("https://"))) {
    const resp = await fetch(data);
    return resp.blob();
  }
  // Plain base64 string without data URI prefix
  return base64ToBlob(data, mimeType);
}

/** Convert a Blob to a base64 data-URI (needed for Capacitor Share) */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Trigger a file download or native share.
 * Safe to call on iOS, Android, and desktop browsers.
 */
export async function downloadFile(opts: DownloadOptions): Promise<void> {
  const { filename, title } = opts;
  const mimeType = opts.mimeType ?? "application/octet-stream";

  const blob = await toBlob(opts.data, mimeType);

  // --- Capacitor (iOS / Android) ---
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      const base64 = await blobToBase64(blob);
      await Share.share({
        title: title ?? filename,
        files: [base64],
        dialogTitle: title ?? `Save ${filename}`,
      });
      return;
    } catch (_e) {
      // Share plugin not available — fall through to browser download
    }
  }

  // --- PWA / Mobile browser (navigator.share with files) ---
  if (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    "canShare" in navigator
  ) {
    const file = new File([blob], filename, { type: mimeType });
    if ((navigator as Navigator & { canShare: (d: object) => boolean }).canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title ?? filename });
        return;
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          // Fall through on unexpected errors
        } else {
          return; // User cancelled — that's fine
        }
      }
    }
  }

  // --- Desktop / fallback: Blob URL anchor click ---
  if (typeof URL !== "undefined" && URL.createObjectURL) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // Delay revoke to give browser time to start download
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 2000);
    return;
  }

  // --- Last resort: open in new tab ---
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Download a PDF from a URL, Blob, or base64 string.
 * Convenience wrapper around downloadFile with PDF mime type.
 */
export async function downloadPdf(
  data: Blob | string,
  filename = "document.pdf",
  title?: string
): Promise<void> {
  return downloadFile({ data, filename, mimeType: "application/pdf", title });
}

/**
 * Download a CSV string as a file.
 */
export async function downloadCsv(csvContent: string, filename = "export.csv"): Promise<void> {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  return downloadFile({ data: blob, filename, mimeType: "text/csv" });
}

/**
 * Download a JSON object as a formatted .json file.
 */
export async function downloadJson(data: unknown, filename = "export.json"): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  return downloadFile({ data: blob, filename, mimeType: "application/json" });
}

/**
 * Read a local file selected via an <input type="file"> element.
 * Returns the file content as an ArrayBuffer.
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read a local file as a base64 data URI.
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if a file MIME type is a safe upload type.
 */
export function isSafeMimeType(mimeType: string): boolean {
  const SAFE_TYPES = new Set([
    "application/pdf",
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "text/csv", "text/plain",
    "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "application/vnd.ms-excel", // xls
  ]);
  return SAFE_TYPES.has(mimeType.toLowerCase());
}
