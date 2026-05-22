import { useState, useCallback } from 'react';

export interface OCRResult {
  text: string;
  confidence: number;
  sourceFile: string;
  processedAt: string;
}

interface OCRError {
  code: string;
  message: string;
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<OCRError | null>(null);

  const processImage = useCallback(async (file: File | Blob): Promise<OCRResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!file.type.startsWith('image/')) {
        throw { code: 'INVALID_FILE', message: 'File must be an image' };
      }

      if (file.size > 5 * 1024 * 1024) {
        throw { code: 'FILE_TOO_LARGE', message: 'Image must be smaller than 5MB' };
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('https://api.ocr.z.ai/v1/extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(import.meta as any).env?.REACT_APP_OCR_API_KEY || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw {
          code: 'OCR_API_ERROR',
          message: errorData.message || 'OCR processing failed',
        };
      }

      const data = await response.json();

      const result: OCRResult = {
        text: data.text || '',
        confidence: data.confidence || 0.8,
        sourceFile: file instanceof File ? file.name : 'blob',
        processedAt: new Date().toISOString(),
      };

      setIsProcessing(false);
      return result;
    } catch (e) {
      const err = e as OCRError;
      setError(err);
      setIsProcessing(false);
      return null;
    }
  }, []);

  const extractReceiptData = useCallback(async (ocrText: string) => {
    const patterns = {
      amount: /(?:total|amount|price|cost)[:\\s]+([\\d,]+(?:\\.\\d{2})?)/gi,
      date: /(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})/g,
      items: /(.+?)\\s+([\\d,]+(?:\\.\\d{2})?)/gm,
      vendor: /^([^\\n]+)/m,
    };

    const amounts = [];
    let match;
    while ((match = patterns.amount.exec(ocrText)) !== null) {
      amounts.push(parseFloat(match[1].replace(/,/g, '')));
    }

    const dates = ocrText.match(patterns.date) || [];
    const lines = ocrText.split('\\n').filter(l => l.trim());

    return {
      vendor: lines[0] || 'Unknown',
      amounts,
      totalAmount: amounts.length > 0 ? amounts[amounts.length - 1] : 0,
      dates: dates[0] || new Date().toISOString().split('T')[0],
      rawText: ocrText,
    };
  }, []);

  return {
    processImage,
    extractReceiptData,
    isProcessing,
    error,
  };
}
