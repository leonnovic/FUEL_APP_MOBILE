import { API_BASE, apiFetch } from './backendApi';

/**
 * OCR API Client
 * Communicates with backend OCR service (GLM-OCR via z.ai)
 */

export interface OCRExtractionResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Send image to backend for OCR processing
 * @param imageDataUrl Base64-encoded image data URL
 * @param fileName Optional filename for context
 * @returns Extracted text or error message
 */
export async function extractTextFromImage(
  imageDataUrl: string,
  fileName?: string
): Promise<OCRExtractionResult> {
  try {
    const result = await apiFetch<OCRExtractionResult>(
      '/api/ocr/extractText',
      {
        method: 'POST',
        body: JSON.stringify({
          imageData: imageDataUrl,
          fileName,
        }),
      },
      true // Include auth token
    );
    return result;
  } catch (error: any) {
    return {
      success: false,
      text: '',
      error: error.message || 'Failed to extract text from image',
    };
  }
}

/**
 * Check if OCR service is available
 */
export async function checkOCRHealth() {
  try {
    const result = await apiFetch<{
      status: string;
      hasApiKey: boolean;
      endpoint: string;
    }>('/api/ocr/health', {}, false);
    return result;
  } catch {
    return { status: 'unavailable', hasApiKey: false, endpoint: '' };
  }
}

/**
 * Convert File object to data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Batch OCR processing (for multiple images)
 */
export async function batchExtractText(
  imageDataUrls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<OCRExtractionResult[]> {
  const results: OCRExtractionResult[] = [];

  for (let i = 0; i < imageDataUrls.length; i++) {
    const result = await extractTextFromImage(imageDataUrls[i]);
    results.push(result);
    onProgress?.(i + 1, imageDataUrls.length);
  }

  return results;
}
