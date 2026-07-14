import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import jsQR from 'jsqr';

// Load pdfjs worker from the package itself (works with Vite on Windows/Mac/Linux)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }

  return fullText;
}

export async function extractTextFromImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);

  // Try QR decode first
  try {
    const image = new Image();
    image.src = url;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        URL.revokeObjectURL(url);
        return code.data;
      }
    }
  } catch (e) {
    console.error('QR read failed', e);
  }

  // Fallback: OCR with Tesseract.js
  const result = await Tesseract.recognize(url, 'eng');
  URL.revokeObjectURL(url);
  return result.data.text;
}

export function exportReportToPdf(
  scan: import('@/store/scan-store').ScanRecord,
  _elementRef?: React.RefObject<HTMLDivElement>
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const levelColor =
    scan.level === 'low' ? '#22c55e' : scan.level === 'medium' ? '#f97316' : '#ef4444';
  const levelLabel =
    scan.level === 'low'
      ? 'SAFE / BENIGN'
      : scan.level === 'medium'
      ? 'SUSPICIOUS / WARNING'
      : 'CRITICAL THREAT / SCAM';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SilentShield AI Report — ${scan.id.slice(0, 8)}</title>
      <style>
        body { font-family: monospace; background: #09090b; color: #fafafa; padding: 32px; margin: 0; }
        h1 { font-size: 1.5rem; margin-bottom: 4px; }
        .sub { color: #a1a1aa; font-size: 0.8rem; margin-bottom: 24px; }
        .score { font-size: 3rem; font-weight: 800; color: ${levelColor}; }
        .level { color: ${levelColor}; font-weight: 700; font-size: 1.1rem; margin-bottom: 24px; }
        .section { margin-bottom: 20px; }
        .section h2 { font-size: 0.9rem; color: #a1a1aa; border-bottom: 1px solid #27272a; padding-bottom: 8px; margin-bottom: 12px; }
        .reason { padding: 8px 12px; background: #18181b; border: 1px solid #27272a; border-radius: 6px; margin-bottom: 8px; font-size: 0.85rem; }
        .payload { background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 16px; white-space: pre-wrap; font-size: 0.8rem; max-height: 300px; overflow: auto; }
        .footer { margin-top: 32px; color: #52525b; font-size: 0.75rem; text-align: center; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <h1>🛡️ SilentShield AI — Analysis Report</h1>
      <div class="sub">Generated: ${new Date(scan.timestamp).toLocaleString()} &middot; ID: ${scan.id.slice(0, 8)} &middot; Running entirely on-device</div>
      <div class="score">${scan.score}<span style="font-size:1.5rem">/100</span></div>
      <div class="level">${levelLabel}</div>
      <div class="section">
        <h2>Category</h2>
        <div class="reason">${scan.category}</div>
      </div>
      <div class="section">
        <h2>Input Summary</h2>
        <div class="reason">${scan.inputSummary}</div>
      </div>
      <div class="section">
        <h2>Detection Rules Triggered (${scan.resultPayload.reasons.length})</h2>
        ${scan.resultPayload.reasons.map((r: string) => `<div class="reason">&#9888; ${r}</div>`).join('')}
      </div>
      ${scan.originalText ? `<div class="section"><h2>Inspected Payload</h2><div class="payload">${scan.originalText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>` : ''}
      <div class="footer">This report was generated locally by SilentShield AI. No data left your device.</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}
