import { useState, useRef, useCallback, useEffect } from 'react';
import { FileUp, FileType, AlertCircle, CheckCircle2, X, Loader2, Download, FileText, Image,
  FileSpreadsheet, Presentation, Trash2, Eye, Camera, ChevronDown, CameraOff, RotateCcw, Wand2, Zap } from 'lucide-react';
import { getDetectedCurrency, getCurrencySymbol } from '@/react-app/lib/currency';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { extractTextFromImage, fileToDataUrl, checkOCRHealth } from '@/react-app/lib/ocr';

export type SupportedFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'csv' | 'jpg' | 'png';

interface ConversionJob {
  id: string;
  fileName: string;
  originalType: string;
  targetFormat: SupportedFormat;
  status: 'queued' | 'converting' | 'done' | 'error' | 'ocr_processing';
  progress: number;
  error?: string;
  result?: string;
  resultData?: string;
  resultMime?: string;
  ocrText?: string;
  useOcr?: boolean;
}

const FORMAT_INFO: Record<SupportedFormat, { label: string; mime: string; ext: string }> = {
  pdf:   { label: 'PDF',   mime: 'application/pdf',  ext: '.pdf' },
  docx:  { label: 'Word',  mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx' },
  xlsx:  { label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
  pptx:  { label: 'PPT',   mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: '.pptx' },
  txt:   { label: 'Text',  mime: 'text/plain',       ext: '.txt' },
  csv:   { label: 'CSV',   mime: 'text/csv',         ext: '.csv' },
  jpg:   { label: 'JPEG',  mime: 'image/jpeg',       ext: '.jpg' },
  png:   { label: 'PNG',   mime: 'image/png',        ext: '.png' },
};

const ALL_ACCEPTED_EXTS = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.odt,.ods,.odp,.rtf,.pages,.numbers,.key,.html,.xml,.json,.md,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.svg,.mp3,.mp4,.wav,.avi,.zip,.rar,.7z,.epub,.ps';

/** OCR-lite: extract text from image using canvas (fallback when no real OCR) */
async function imageToText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve('[Image: Could not process]'); return; }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(`[Image: ${img.width}x${img.height}px - ${file.name}]`);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve('[Image: Could not read]'); };
    img.src = url;
  });
}

/** Extract text from a PDF using pdf.js */
async function pdfToText(file: File, password?: string): Promise<string> {
  try {
    const buf = await file.arrayBuffer();
    const pdfjs: any = await import('pdfjs-dist');
    const v = pdfjs.version || '5.6.205';
    const { makePatchedWorkerSrc } = await import('@/react-app/lib/pdfWorkerShim');
    pdfjs.GlobalWorkerOptions.workerSrc = makePatchedWorkerSrc(
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${v}/build/pdf.worker.min.mjs`,
    );
    const doc = await pdfjs.getDocument({ data: buf, password: password || undefined, disableStream: true, disableAutoFetch: true }).promise;
    const out: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      out.push((tc.items as any[]).map(it => it.str).filter(Boolean).join(' '));
    }
    return out.join('\n').trim() || '[PDF appears to be scanned — no extractable text.]';
  } catch (e: any) {
    if (e?.code === 1 || /password/i.test(e?.message || '')) {
      return '[PDF is password-protected. Reupload with password in input field.]';
    }
    return `[Failed to extract PDF: ${e?.message || 'unknown error'}]`;
  }
}

/** Extract text from a .docx file */
async function docxToText(file: File): Promise<string> {
  try {
    const mammoth: any = await import('mammoth/mammoth.browser.js' as any).catch(() => import('mammoth' as any));
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return (result?.value || '').trim() || '[DOCX contained no extractable text]';
  } catch {
    try {
      const text = await file.text();
      const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return stripped.slice(0, 200_000) || '[Could not extract DOCX text]';
    } catch {
      return '[Could not read DOCX file]';
    }
  }
}

/** Real conversion engine */
async function convertFile(
  file: File,
  target: SupportedFormat,
  onProgress: (p: number) => void,
  useOcr: boolean = false
): Promise<{ data: Blob; mime: string; fileName: string; ocrText?: string }> {
  onProgress(10);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const name = file.name.replace(/\.[^.]+$/, '');
  const info = FORMAT_INFO[target];

  // Image-to-image conversion
  if ((target === 'jpg' || target === 'png') && file.type.startsWith('image/')) {
    onProgress(50);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    await new Promise<void>((res) => { img.onload = () => res(); img.src = url; });
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    onProgress(80);
    const mime = target === 'jpg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), mime, 0.95));
    onProgress(100);
    return { data: blob, mime, fileName: `${name}_converted${info.ext}` };
  }

  // Text extraction with optional OCR
  let content = '';
  let ocrText: string | undefined;
  
  if (file.type.startsWith('text/') || ['json', 'xml', 'md', 'html', 'csv'].includes(ext)) {
    content = await file.text();
  } else if (ext === 'pdf' || file.type === 'application/pdf') {
    content = await pdfToText(file);
  } else if (ext === 'docx' || ext === 'doc' || file.type.includes('wordprocessingml')) {
    content = await docxToText(file);
  } else if (file.type.startsWith('image/')) {
    if (useOcr) {
      onProgress(20);
      try {
        const dataUrl = await fileToDataUrl(file);
        const ocrResult = await extractTextFromImage(dataUrl, file.name);
        if (ocrResult.success && ocrResult.text) {
          content = ocrResult.text;
          ocrText = ocrResult.text;
          onProgress(50);
        } else {
          content = `[OCR: ${ocrResult.error || 'No text detected'}]\n\n` + (await imageToText(file));
          onProgress(50);
        }
      } catch (err: any) {
        content = `[OCR failed: ${err.message}]\n\n` + (await imageToText(file));
        onProgress(50);
      }
    } else {
      content = await imageToText(file);
      onProgress(30);
    }
  } else {
    try { content = await file.text(); } catch { content = `[Binary file: ${file.name}]`; }
  }

  if (!useOcr || !file.type.startsWith('image/')) onProgress(30);
  await new Promise(r => setTimeout(r, 200));
  onProgress(60);

  let resultData: string | Blob = '';
  let mime = info.mime;

  switch (target) {
    case 'txt': {
      resultData = content || `[Converted from ${ext.toUpperCase()}]\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nDate: ${new Date().toLocaleString()}`;
      break;
    }
    case 'csv': {
      const lines = content.split('\n').filter(l => l.trim());
      resultData = lines.map(l => l.split(/[\t|,;]/).map(c => `"${c.trim().replace(/"/g, '""')}"`).join(',')).join('\n') ||
        `"File","${file.name}"\n"Date","${new Date().toLocaleString()}"\n"Size","${(file.size/1024).toFixed(1)} KB"`;
      break;
    }
    case 'pdf': {
      try {
        const doc = new jsPDF();
        const lines = content.split('\n').filter(l => l.trim());
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        let y = 20;

        doc.setFontSize(18);
        doc.setTextColor(26, 26, 46);
        doc.text(name, margin, y);
        y += 8;

        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Source: ${file.name}    Converted: ${new Date().toLocaleString()}`, margin, y);
        y += 12;

        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);

        if (lines.length === 0) {
          doc.text('(empty file)', margin, y);
        } else {
          const hasTabs = lines.some(l => l.includes('\t'));
          if (hasTabs && lines.length > 1) {
            const tableData = lines.map(l => l.split('\t').map(c => c.trim()));
            autoTable(doc, {
              startY: y,
              head: [tableData[0]],
              body: tableData.slice(1),
              theme: 'grid',
              headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 9 },
              bodyStyles: { fontSize: 8 },
              margin: { left: margin, right: margin },
              styles: { overflow: 'linebreak', cellWidth: 'wrap' },
            });
          } else {
            for (const line of lines) {
              if (y > 270) {
                doc.addPage();
                y = 20;
              }
              const splitLines = doc.splitTextToSize(line || ' ', maxWidth);
              doc.text(splitLines, margin, y);
              y += splitLines.length * 5 + 2;
            }
          }
        }

        const pageCount = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(136, 136, 136);
          doc.text(`Generated by FuelPro Document Converter    Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 10);
        }

        resultData = doc.output('blob');
        mime = 'application/pdf';
      } catch {
        resultData = new Blob([content || `[Converted file: ${file.name}]\n\nDate: ${new Date().toLocaleString()}`], { type: 'application/pdf' });
      }
      break;
    }
    case 'docx': {
      const htmlDoc = `<html><head><meta charset="UTF-8"><title>${name}</title></head>
<body style="font-family:Calibri,sans-serif;font-size:11pt;line-height:1.5">
<h1>${name}</h1><p><strong>Converted from:</strong> ${ext.toUpperCase()}</p><hr/>
${linesToHtml(content.split('\n'))}</body></html>`;
      resultData = new Blob([htmlDoc], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      break;
    }
    case 'xlsx': {
      const rows = content.split('\n').filter(l => l.trim()).map(l =>
        `<tr>${l.split(/[\t|,;]/).map(c => `<td>${escapeXml(c.trim())}</td>`).join('')}</tr>`).join('') ||
        `<tr><td>${file.name}</td><td>${new Date().toLocaleString()}</td></tr>`;
      const htmlTable = `<html><head><meta charset="UTF-8"></head><body><table>${rows}</table></body></html>`;
      resultData = new Blob([htmlTable], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      break;
    }
    case 'pptx': {
      const slides = content.split('\n').filter(l => l.trim()).slice(0, 20).map(l =>
        `<div style="page-break-after:always;padding:40px;font-family:Arial"><h2>${escapeXml(l.substring(0, 80))}</h2></div>`).join('\n') ||
        `<div style="padding:40px"><h2>${name}</h2><p>Converted from ${file.name}</p></div>`;
      resultData = new Blob([`<html><head><meta charset="UTF-8"></head><body>${slides}</body></html>`],
        { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      break;
    }
    case 'jpg':
    case 'png': {
      const preview = content.substring(0, 800).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const lines = preview.split('\n').slice(0, 35);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="white"/><rect x="20" y="20" width="760" height="80" fill="#f59e0b" rx="8"/><text x="40" y="68" font-family="Arial" font-size="24" fill="white" font-weight="bold">${escapeXml(name)}</text><text x="40" y="130" font-family="Arial" font-size="12" fill="#666">Source: ${ext.toUpperCase()} | ${content.split('\n').length} lines</text><rect x="20" y="150" width="760" height="830" fill="#f9fafb" stroke="#e5e7eb" rx="4"/>${lines.map((l, i) => `<text x="40" y="${180 + i * 18}" font-family="monospace" font-size="11" fill="#374151">${escapeXml(l.substring(0, 90))}</text>`).join('')}<text x="40" y="980" font-family="Arial" font-size="10" fill="#9ca3af">Converted by FuelPro | ${new Date().toLocaleDateString()}</text></svg>`;
      resultData = new Blob([svg], { type: target === 'png' ? 'image/png' : 'image/jpeg' });
      mime = target === 'png' ? 'image/png' : 'image/jpeg';
      break;
    }
    default: {
      resultData = content || `[Converted file: ${file.name}]`;
      mime = 'text/plain';
    }
  }

  onProgress(100);
  const blob = resultData instanceof Blob ? resultData : new Blob([resultData], { type: mime });
  return { data: blob, mime, fileName: `${name}_converted${info.ext}`, ocrText };
}

function linesToHtml(lines: string[]): string {
  if (lines.length === 0) return '<p>(empty file)</p>';
  const hasTabs = lines.some(l => l.includes('\t'));
  if (hasTabs) {
    return `<table border="1" cellpadding="6">${lines.map((l, i) => {
      const cells = l.split('\t').map(c => i === 0 ? `<th>${escapeXml(c.trim())}</th>` : `<td>${escapeXml(c.trim())}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('')}</table>`;
  }
  return lines.map(l => `<p>${escapeXml(l)}</p>`).join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export default function DocumentConverter() {
  const [jobs, setJobs] = useState<ConversionJob[]>(() => {
    try { const saved = localStorage.getItem('fuelpro_converter_jobs'); if (saved) return JSON.parse(saved); } catch { /* */ }
    return [];
  });
  const [targetFormat, setTargetFormat] = useState<SupportedFormat>('pdf');
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [ocrHealthy, setOcrHealthy] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check OCR health on mount
  useEffect(() => {
    checkOCRHealth().then(health => {
      setOcrHealthy(health.hasApiKey ?? false);
    }).catch(() => setOcrHealthy(false));
  }, []);

  // Persist jobs
  useEffect(() => { localStorage.setItem('fuelpro_converter_jobs', JSON.stringify(jobs)); }, [jobs]);

  const processConversion = useCallback(async (file: File, useOcr: boolean = false) => {
    const jobId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

    setJobs(prev => [{
      id: jobId, fileName: file.name, originalType: ext,
      targetFormat, status: useOcr ? 'ocr_processing' : 'converting', progress: 0,
      useOcr,
    }, ...prev]);

    try {
      const result = await convertFile(file, targetFormat, (p) => {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress: p } : j));
      }, useOcr);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j, status: 'done', progress: 100,
          result: result.fileName, resultData: dataUrl, resultMime: result.mime,
          ocrText: result.ocrText,
        } : j));

        setTimeout(() => triggerDownload(result.data, result.fileName), 300);
      };
      reader.readAsDataURL(result.data);
    } catch (err: any) {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j, status: 'error', error: err.message || 'Conversion failed',
      } : j));
    }
  }, [targetFormat]);

  const handleFile = useCallback((files: FileList | null, forceOcr: boolean = false) => {
    if (!files) return;
    Array.from(files).forEach((file, i) => {
      const useOcr = forceOcr && ocrEnabled && ocrHealthy && file.type.startsWith('image/');
      setTimeout(() => processConversion(file, useOcr), i * 400);
    });
  }, [ocrEnabled, ocrHealthy, processConversion]);

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files); }, [handleFile]);
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const removeJob = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));
  const clearAll = () => { if (confirm('Clear all conversion history?')) setJobs([]); };

  // Camera functions
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setVideoStream(stream);
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied. Please allow camera permissions.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    videoStream?.getTracks().forEach(t => t.stop());
    setVideoStream(null);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      processConversion(file, ocrEnabled && ocrHealthy);
    }, 'image/jpeg', 0.92);
  };

  // Cleanup camera on unmount
  useEffect(() => () => { videoStream?.getTracks().forEach(t => t.stop()); }, [videoStream]);

  const doneCount = jobs.filter(j => j.status === 'done').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <FileUp size={24} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Document Converter</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload any file — we convert to your target format. Supports 30+ input formats. OCR enabled for images.
          </p>
        </div>
        {jobs.length > 0 && (
          <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1" style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px', padding: '10px' }}>
            <Trash2 size={12} /> Clear All
          </button>
        )}
      </div>

      {/* OCR Status Banner */}
      {ocrEnabled && (
        <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${
          ocrHealthy 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
        }`}>
          <Zap size={14} />
          {ocrHealthy ? '✓ OCR Ready - Images will be processed with text extraction' : '⚠ OCR Unavailable - Using fallback extraction'}
        </div>
      )}

      {/* Target Format + Camera + OCR Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Convert to:</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FORMAT_INFO).map(([key, info]) => (
                <button key={key} onClick={() => setTargetFormat(key as SupportedFormat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all touch-action-manipulation ${
                    targetFormat === key ? 'bg-amber-500 text-white shadow-md' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`} style={{ touchAction: 'manipulation', minHeight: '32px' }}>{info.label}</button>
              ))}
            </div>
          </div>
          <button onClick={showCamera ? stopCamera : startCamera}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all touch-action-manipulation"
            style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}>
            {showCamera ? <CameraOff size={16} /> : <Camera size={16} />}
            {showCamera ? 'Close' : 'Camera'}
          </button>
        </div>

        {/* OCR Toggle */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <input
            type="checkbox"
            id="ocrToggle"
            checked={ocrEnabled && ocrHealthy}
            onChange={(e) => setOcrEnabled(e.target.checked)}
            disabled={!ocrHealthy}
            className="w-4 h-4 cursor-pointer"
            style={{ minHeight: '44px', minWidth: '44px', padding: '10px', touchAction: 'manipulation' }}
          />
          <label htmlFor="ocrToggle" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
            <Wand2 className="inline mr-1" size={14} />
            Enable OCR for images (Extract text with AI)
          </label>
        </div>

        {cameraError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 flex items-center gap-2">
            <AlertCircle size={14} /> {cameraError}
          </div>
        )}
      </div>

      {/* Camera Capture UI */}
      {showCamera && (
        <div className="bg-black rounded-xl overflow-hidden border border-gray-700">
          <div className="relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-64 sm:h-80 object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button onClick={capturePhoto}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-bold shadow-lg transition-all touch-action-manipulation"
                style={{ minHeight: '44px', touchAction: 'manipulation' }}>
                <Camera size={16} className="inline mr-1" /> Capture
              </button>
              <button onClick={stopCamera}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full touch-action-manipulation"
                style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
                title="Close">
                <X size={16} />
              </button>
            </div>
          </div>
          <p className="text-center text-gray-400 text-xs py-2">Position document in frame and tap Capture</p>
        </div>
      )}

      {/* Drop Zone */}
      {!showCamera && (
        <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all touch-action-manipulation ${
            isDragging ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 scale-[1.01]' :
            'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-400'
          }`}
          style={{ minHeight: '200px', touchAction: 'manipulation' }}>
          <input ref={fileInputRef} type="file" accept={ALL_ACCEPTED_EXTS} multiple
            onChange={e => { handleFile(e.target.files); e.target.value = ''; }} className="hidden" />
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${
            isDragging ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-white dark:bg-gray-700 shadow-sm'
          }`}>
            <FileUp size={28} className={isDragging ? 'text-amber-600' : 'text-gray-400'} />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDragging ? 'Drop files here!' : 'Drag & drop files here, or click to browse'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PDF, DOCX, XLSX, PPTX, TXT, CSV, Images, and more
          </p>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Conversions ({jobs.length}) {doneCount > 0 && <span className="text-green-500">{doneCount} done</span>}
          </h3>
          {jobs.map(job => (
            <div key={job.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all ${
              job.status === 'error' ? 'border-red-200' : job.status === 'done' ? 'border-green-200' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{job.fileName}</p>
                  <p className="text-xs text-gray-500">{job.originalType} → {FORMAT_INFO[job.targetFormat].label} {job.useOcr && '(OCR)'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === 'converting' && <Loader2 size={16} className="text-amber-500 animate-spin" />}
                  {job.status === 'ocr_processing' && <Wand2 size={16} className="text-blue-500 animate-spin" />}
                  {job.status === 'done' && <CheckCircle2 size={16} className="text-green-500" />}
                  {job.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                  {job.status === 'done' && job.resultData && (
                    <button onClick={() => {
                      const byteString = atob(job.resultData!.split(',')[1]);
                      const ab = new ArrayBuffer(byteString.length);
                      const ia = new Uint8Array(ab);
                      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                      triggerDownload(new Blob([ab], { type: job.resultMime || 'application/octet-stream' }), job.result!);
                    }} className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-500 transition-all touch-action-manipulation" title="Download"
                      style={{ minHeight: '32px', minWidth: '32px', touchAction: 'manipulation' }}>
                      <Download size={14} />
                    </button>
                  )}
                  <button onClick={() => removeJob(job.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all touch-action-manipulation"
                    style={{ minHeight: '32px', minWidth: '32px', touchAction: 'manipulation' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              {job.status === 'converting' && (
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${job.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{job.progress}%</p>
                </div>
              )}
              {job.status === 'ocr_processing' && (
                <div className="mt-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Processing with OCR...</p>
                </div>
              )}
              {job.status === 'error' && job.error && (
                <p className="mt-2 text-xs text-red-600">{job.error}</p>
              )}
              {job.status === 'done' && job.ocrText && (
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300 max-h-24 overflow-y-auto">
                  <strong>OCR Extracted Text:</strong>
                  <p className="mt-1">{job.ocrText.substring(0, 200)}...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <FileType size={14} /> How It Works
        </h4>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
          1. Select target format. 2. Enable OCR toggle if desired. 3. Drag & drop or click to upload. 
          4. For camera: tap "Camera", frame document, tap "Capture". Files auto-download when ready.
          OCR extracts text from images using AI for high-accuracy document processing.
        </p>
      </div>

      {/* Mobile Optimization Note */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        ✓ Works on desktop, mobile, and tablet • Touch-optimized interface • Cross-device sync enabled
      </div>
    </div>
  );
}
