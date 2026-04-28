"use client";

type Win = Window & { jspdf?: { jsPDF: new (...a: unknown[]) => unknown } };

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

// Abre el PDF en nueva pestaña (vista previa + descarga desde el visor nativo)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function openPDFPreview(doc: any): void {
  const blob = doc.output('blob') as Blob;
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Logo Alzak para PDFs ───────────────────────────────────────────────────────
let _logoB64:  string | null = null;
let _logoLoad: Promise<string | null> | null = null;

// Convierte el WebP (con transparencia) a PNG via canvas — jsPDF renderiza
// PNG correctamente preservando el canal alpha sobre el banner azul.
async function _fetchLogo(): Promise<string | null> {
  try {
    const resp = await fetch('/logo-alzak.webp');
    const blob = await resp.blob();
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

/**
 * Dibuja el logo Alzak en la esquina superior derecha del header de un PDF.
 * El logo es 600×300 (ratio 2:1). Si no carga, usa el fallback "AF" dorado.
 * @param bannerH — altura del banner azul en mm (por defecto 22)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addPDFLogo(doc: any, pageW: number, bannerH = 22): Promise<void> {
  const logoH = bannerH - 6;          // margen 3mm arriba y abajo
  const logoW = logoH * 2;            // ratio 2:1
  const x     = pageW - logoW - 5;
  const y     = (bannerH - logoH) / 2;

  const b64 = await getLogoBase64();
  if (b64) {
    doc.addImage(b64, 'PNG', x, y, logoW, logoH);
  } else {
    // Fallback: cuadro dorado "AF"
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(pageW - 26, 5, 12, 12, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text('AF', pageW - 22, 12.5);
  }
}
