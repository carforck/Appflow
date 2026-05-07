"use client";

type Win    = Window & { jspdf?: { jsPDF: new (...a: unknown[]) => unknown } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WinH2C = Window & { html2canvas?: (el: HTMLElement, opts?: Record<string, any>) => Promise<HTMLCanvasElement> };

async function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = () => rej(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadPDFLibs(): Promise<{ JsPDF: any }> {
  if (!(window as Win).jspdf) {
    await loadScript('/vendor/jspdf.umd.min.js');
    await loadScript('/vendor/jspdf.plugin.autotable.min.js');
  }
  const JsPDF = (window as Win).jspdf?.jsPDF;
  if (!JsPDF) throw new Error('jsPDF not loaded');
  return { JsPDF };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function openPDFPreview(doc: any): void {
  const blob = doc.output('blob') as Blob;
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Logo Alzak para PDFs
let _logoB64:  string | null = null;
let _logoLoad: Promise<string | null> | null = null;

async function _fetchLogo(): Promise<string | null> {
  try {
    const resp   = await fetch('/logo-alzak.webp');
    const blob   = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(blobUrl); resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(blobUrl);
        _logoB64 = canvas.toDataURL('image/png');
        resolve(_logoB64);
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(null); };
      img.src = blobUrl;
    });
  } catch { return null; }
}

export function getLogoBase64(): Promise<string | null> {
  if (_logoB64)   return Promise.resolve(_logoB64);
  if (!_logoLoad) _logoLoad = _fetchLogo();
  return _logoLoad;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addPDFLogo(doc: any, pageW: number, bannerH = 22): Promise<void> {
  const logoH = bannerH - 6;
  const logoW = logoH * 2;
  const x     = pageW - logoW - 5;
  const y     = (bannerH - logoH) / 2;
  const b64   = await getLogoBase64();
  if (b64) {
    doc.addImage(b64, 'PNG', x, y, logoW, logoH);
  } else {
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(pageW - 26, 5, 12, 12, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text('AF', pageW - 22, 12.5);
  }
}

// html2canvas — captura de graficas con fondo blanco forzado (sin dark mode)
async function loadHtml2Canvas(): Promise<void> {
  if (!(window as WinH2C).html2canvas) {
    await loadScript('/vendor/html2canvas.min.js');
  }
}

export interface ChartCapture {
  dataUrl: string;
  pxW:     number;
  pxH:     number;
}

export async function captureChart(elementId: string): Promise<ChartCapture | null> {
  try {
    await loadHtml2Canvas();
    const el = document.getElementById(elementId);
    if (!el) return null;
    const h2c = (window as WinH2C).html2canvas;
    if (!h2c) return null;
    const canvas = await h2c(el, {
      scale:           2,
      useCORS:         true,
      allowTaint:      true,
      logging:         false,
      backgroundColor: '#ffffff',
      onclone: (cloneDoc: Document) => {
        cloneDoc.documentElement.classList.remove('dark');
        const cloned = cloneDoc.getElementById(elementId);
        if (cloned) {
          cloned.style.setProperty('background',         '#ffffff', 'important');
          cloned.style.setProperty('backdrop-filter',    'none',    'important');
          cloned.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
          cloned.style.setProperty('box-shadow',         'none',    'important');
        }
        // Recharts renderiza SVG — html2canvas necesita dimensiones explícitas en el SVG
        cloneDoc.querySelectorAll('svg').forEach((svg) => {
          const rect = svg.getBoundingClientRect();
          if (rect.width  > 0 && !svg.getAttribute('width'))  svg.setAttribute('width',  String(rect.width));
          if (rect.height > 0 && !svg.getAttribute('height')) svg.setAttribute('height', String(rect.height));
        });
        // Inlinear fill/stroke para que html2canvas pinte los paths y textos del SVG
        cloneDoc.querySelectorAll('svg *').forEach((node) => {
          const computed = window.getComputedStyle(node);
          const svgEl    = node as SVGElement;
          const fill   = computed.fill;
          const stroke = computed.stroke;
          if (fill   && fill   !== 'none' && !svgEl.style.fill)   svgEl.style.fill   = fill;
          if (stroke && stroke !== 'none' && !svgEl.style.stroke) svgEl.style.stroke = stroke;
        });
      },
    });
    return { dataUrl: canvas.toDataURL('image/png'), pxW: canvas.width, pxH: canvas.height };
  } catch { return null; }
}
