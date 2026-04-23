"use client";

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/Badge';
import type { MockProject } from '@/lib/mockData';

interface ProjectCardProps {
  project:    MockProject;
  onEdit:     (p: MockProject) => void;
  onDelete:   (id: string) => void;
  isDeleting: boolean;
}

export function ProjectCard({ project: p, onEdit, onDelete, isDeleting }: ProjectCardProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <article
      className="glass rounded-[16px] border border-slate-200/60 dark:border-slate-700/60 p-4 transition-transform"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Código + Estado */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-[11px] font-bold text-alzak-blue dark:text-alzak-gold bg-alzak-blue/10 dark:bg-alzak-gold/10 px-2 py-0.5 rounded-lg shrink-0">
          {p.id_proyecto}
        </span>
        <StatusBadge status={p.estado} />
      </div>

      {/* Nombre */}
      <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug mb-1">
        {p.nombre_proyecto}
      </p>

      {/* Financiador */}
      {p.financiador && (
        <p className="text-xs text-slate-400 mb-3">{p.financiador}</p>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <button
          onClick={() => onEdit(p)}
          className="min-h-[44px] flex items-center text-xs text-alzak-blue dark:text-alzak-gold font-semibold hover:underline focus-visible:underline"
        >
          Editar →
        </button>

        {isDeleting ? (
          <span className="text-xs text-slate-400">Eliminando…</span>
        ) : confirming ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-red-500 font-semibold">¿Eliminar?</span>
            <button
              onClick={() => { setConfirming(false); onDelete(p.id_proyecto); }}
              className="min-h-[44px] px-2 font-bold text-red-500 hover:underline"
            >
              Sí
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="min-h-[44px] px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="min-h-[44px] px-2 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </article>
  );
}
