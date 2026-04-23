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
