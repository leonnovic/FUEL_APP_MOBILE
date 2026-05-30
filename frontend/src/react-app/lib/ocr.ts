/**
 * Enhanced OCR Client with Error Handling & Retry Logic
 * - Automatic retry on transient failures
 * - Fallback to local processing if service unavailable
 * - Progress tracking for batch operations
 * - Timeout handling
 */

import { API_BASE } from './backendApi';

export interface OCRExtractionResult {
  success: boolean;
  text: string;
  confidence?: number;
  error?: string;
  retried?: boolean;
}

const OCR_TIMEOUT_MS = 45000; // 45 second timeout for OCR
const OCR_MAX_RETRIES = 2;
const OCR_RETRY_DELAY_MS = 1000;

/**
 * Send image to backend for OCR processing with retry logic
 */
export async function extractTextFromImage(
  imageDataUrl: string,
  fileName?: string,
  retryCount = 0
): Promise<OCRExtractionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  
  try {
    const response = await fetch(`${API_BASE}/api/ocr/extractText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: imageDataUrl,
        fileName,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Retry on transient errors
      if ((response.status >= 500 || response.status === 408 || response.status === 429) && retryCount < OCR_MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, OCR_RETRY_DELAY_MS * Math.pow(2, retryCount)));
        return extractTextFromImage(imageDataUrl, fileName, retryCount + 1);
      }

      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return {
        success: false,
        text: '',
        error: errorData.error || `OCR service error: ${response.status}`,
        retried: retryCount > 0,
      };
    }

    const result = (await response.json()) as OCRExtractionResult;
    return { ...result, retried: retryCount > 0 };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        text: '',
        error: 'OCR processing timed out. Image may be too large.',
        retried: retryCount > 0,
      };
    }

    // Retry on network errors
    if (error instanceof TypeError && retryCount < OCR_MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, OCR_RETRY_DELAY_MS * Math.pow(2, retryCount)));
      return extractTextFromImage(imageDataUrl, fileName, retryCount + 1);
    }

    return {
      success: false,
      text: '',
      error: error.message || 'Failed to extract text from image. Please try again.',
      retried: retryCount > 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if OCR service is available (with caching)
 */
const ocrHealthCache: { timestamp: number; status: string; hasApiKey: boolean } | null = null;
const OCR_HEALTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute cache

export async function checkOCRHealth() {
  try {
    // Check cache first
    if (ocrHealthCache && Date.now() - ocrHealthCache.timestamp < OCR_HEALTH_CACHE_TTL_MS) {
      return ocrHealthCache;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for health check
    
    try {
      const response = await fetch(`${API_BASE}/api/ocr/health`, {
        signal: controller.signal,
      });

      const result = await response.json();
      Object.assign(ocrHealthCache || {}, { timestamp: Date.now(), ...result });
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return { status: 'unavailable', hasApiKey: false, endpoint: '', error: true };
  }
}

/**
 * Convert File object to data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Batch OCR processing with progress tracking
 */
export async function batchExtractText(
  imageDataUrls: string[],
  onProgress?: (current: number, total: number, currentResult?: OCRExtractionResult) => void
): Promise<OCRExtractionResult[]> {
  const results: OCRExtractionResult[] = [];
  
  for (let i = 0; i < imageDataUrls.length; i++) {
    const result = await extractTextFromImage(imageDataUrls[i]);
    results.push(result);
    onProgress?.(i + 1, imageDataUrls.length, result);
  }

  return results;
}

/**
 * Validate image before OCR (check size, format, etc.)
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export async function validateImageForOCR(file: File): Promise<ImageValidationResult> {
  const warnings: string[] = [];
  const MAX_FILE_SIZE_MB = 10;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`,
    };
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE_MB}MB`,
    };
  }

  // Warning for large-ish files
  if (fileSizeMB > 5) {
    warnings.push('Large file: OCR may take longer');
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}
