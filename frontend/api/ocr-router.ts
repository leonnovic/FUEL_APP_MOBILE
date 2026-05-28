import { z } from 'zod';
import { createRouter, publicQuery } from './middleware';

/**
 * OCR Router: Handles document OCR extraction via GLM-OCR (z.ai)
 * - Runs in background (non-blocking)
 * - Supports images, PDFs, and documents
 * - Returns extracted text or fallback indicators
 */

const OCR_API_KEY = process.env.GLM_OCR_API_KEY || process.env.ZHIPU_API_KEY;
const OCR_API_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/vision';

interface GLMOCRResponse {
  code: number;
  msg: string;
  data?: {
    recognized_text: string;
    confidence?: number;
  };
}

/**
 * Call GLM-OCR API with base64 image
 */
async function callGLMOCR(base64Image: string): Promise<{ success: boolean; text: string; error?: string }> {
  if (!OCR_API_KEY) {
    return {
      success: false,
      text: '',
      error: 'OCR API key not configured on server. Contact admin.',
    };
  }

  try {
    // Extract base64 data from data URL if needed
    const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await fetch(OCR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OCR_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4v-plus',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`,
                },
              },
              {
                type: 'text',
                text: 'Extract all text from this image. Return ONLY the extracted text without any commentary or formatting.',
              },
            ],
          },
        ],
      }),
      timeout: 30000, // 30 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        text: '',
        error: `OCR API error: ${errorData.msg || response.statusText}`,
      };
    }

    const result = await response.json() as GLMOCRResponse;

    if (result.code !== 0 || !result.data?.recognized_text) {
      return {
        success: false,
        text: '',
        error: result.msg || 'OCR returned empty result',
      };
    }

    return {
      success: true,
      text: result.data.recognized_text.trim(),
    };
  } catch (error: any) {
    const message = error?.message || 'OCR processing failed';
    console.error('OCR Error:', error);
    return {
      success: false,
      text: '',
      error: message,
    };
  }
}

/**
 * Fallback: Simple text detection (no real OCR, just metadata)
 */
function fallbackOCRMock(fileName: string): string {
  return `[Image file: ${fileName} - OCR service unavailable. Using fallback detection.]`;
}

export const ocrRouter = createRouter({
  /**
   * Extract text from image using GLM-OCR
   * Input: base64-encoded image data URL
   * Returns: extracted text or fallback indicator
   */
  extractText: publicQuery
    .input(
      z.object({
        imageData: z.string().min(50), // Base64 data URL
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate input
      if (!input.imageData.startsWith('data:image/')) {
        return {
          success: false,
          text: '',
          error: 'Invalid image data format',
        };
      }

      // If no API key, use fallback
      if (!OCR_API_KEY) {
        return {
          success: false,
          text: fallbackOCRMock(input.fileName || 'unknown.jpg'),
          error: 'OCR service not configured',
        };
      }

      // Call GLM-OCR API
      return await callGLMOCR(input.imageData);
    }),

  /**
   * Health check for OCR service
   */
  health: publicQuery.query(async () => {
    return {
      status: 'ok',
      hasApiKey: !!OCR_API_KEY,
      endpoint: OCR_API_ENDPOINT,
    };
  }),
});
