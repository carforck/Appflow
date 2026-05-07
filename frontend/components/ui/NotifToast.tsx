"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { NotifToastItem } from '@/hooks/useNotifToast';

// ── Tarjeta individual ────────────────────────────────────────────────────────
function ToastCard({ item, onDismiss }: { item: NotifToastItem; onDismiss: () => void }) {
  const router  = useRouter();
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 12);
    return () => clearTimeout(t);
  }, []);

  const handleClick = useCallback(() => {
    onDismiss();
    router.push('/notas');
  }, [onDismiss, router]);

  const visible = enter && !item.exiting;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Nota: ${item.titulo}`}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`
        w-[340px] max-w-[calc(100vw-32px)]
        rounded-[20px] px-4 py-3.5
        shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]
        border border-white/30 dark:border-slate-700/50
        flex items-start gap-3 cursor-pointer
        select-none
        transition-all duration-300 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alzak-blue/50
        ${visible
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-3 opacity-0 scale-95'
        }
      `}
      style={{
        background:           'rgba(255, 255, 255, 0.92)',
        backdropFilter:       'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      {/* Ícono de la app */}
      <div className="shrink-0 w-10 h-10 rounded-[12px] bg-alzak-blue flex items-center justify-center text-white text-lg shadow-sm">
        💬
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">
            Alzak Flow · Notas
          </p>
          <span className="text-[10px] text-slate-400 shrink-0">ahora</span>
        </div>
        <p className="text-[13px] font-semibold text-slate-800 line-clamp-1 mt-0.5 leading-snug">
          {item.titulo}
        </p>
        <p className="text-[12px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
          {item.preview}
        </p>
      </div>

      {/* Botón de cierre */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        aria-label="Cerrar notificación"
        className="shrink-0 w-5 h-5 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-500 text-[10px] transition-colors mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}

// ── Contenedor global (montado en el layout) ──────────────────────────────────
export function NotifToastContainer({
  toasts,
  dismiss,
}: {
  toasts:  NotifToastItem[];
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notificaciones"
      className="fixed top-4 inset-x-0 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard item={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
