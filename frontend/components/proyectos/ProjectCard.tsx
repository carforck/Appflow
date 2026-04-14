"use client";

import { StatusBadge } from '@/components/ui/Badge';
import type { MockProject } from '@/lib/mockData';

interface ProjectCardProps {
  project: MockProject;
  onEdit:  (p: MockProject) => void;
}

export function ProjectCard({ project: p, onEdit }: ProjectCardProps) {
  return (
    <article
      className="glass rounded-[16px] border border-slate-200/60 dark:border-slate-700/60 p-4 active:scale-[0.98] transition-transform"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Código + Estado */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-[11px] font-bold text-alzak-blue dark:text-alzak-gold bg-alzak-blue/10 dark:bg-alzak-gold/10 px-2 py-0.5 rounded-lg shrink-0">
          {p.id_proyecto}
        </span>
        <StatusBadge status={p.status} />
      </div>

      {/* Nombre */}
      <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug mb-1">
        {p.nombre}
      </p>

      {/* Financiador (opcional) */}
      {p.financiador && (
        <p className="text-xs text-slate-400 mb-3">{p.financiador}</p>
      )}

      {/* Acción — tap target mínimo 44px */}
      <button
        onClick={() => onEdit(p)}
        className="min-h-[44px] flex items-center text-xs text-alzak-blue dark:text-alzak-gold font-semibold hover:underline"
      >
        Editar →
      </button>
    </article>
  );
}
