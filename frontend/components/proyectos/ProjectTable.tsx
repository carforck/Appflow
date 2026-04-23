"use client";

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/Badge';
import type { MockProject } from '@/lib/mockData';

interface ProjectTableProps {
  projects:   MockProject[];
  onEdit:     (p: MockProject) => void;
  onDelete:   (id: string) => void;
  deletingId: string | null;
}

function DeleteCell({ projectId, onDelete, isDeleting }: {
  projectId: string; onDelete: () => void; isDeleting: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (isDeleting) {
    return <span className="text-xs text-slate-400">Eliminando…</span>;
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2 text-xs">
        <span className="text-red-500 font-semibold">¿Eliminar?</span>
        <button
          onClick={() => { setConfirming(false); onDelete(); }}
          className="font-bold text-red-500 hover:underline focus-visible:underline"
        >
          Sí
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={`Eliminar proyecto ${projectId}`}
      className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-red-400/50 rounded"
    >
      Eliminar
    </button>
  );
}

const HEADERS = ['Código', 'Nombre', 'Financiador', 'Estado', ''];

export function ProjectTable({ projects, onEdit, onDelete, deletingId }: ProjectTableProps) {
  return (
    <div
      className="glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr
                key={p.id_proyecto}
                className={[
                  'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors',
                  i < projects.length - 1 ? 'border-b border-slate-100/60 dark:border-slate-700/40' : '',
                ].join(' ')}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-alzak-blue dark:text-alzak-gold bg-alzak-blue/[0.08] dark:bg-alzak-gold/[0.08] px-2 py-0.5 rounded-lg whitespace-nowrap">
                    {p.id_proyecto}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                  {p.nombre_proyecto}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {p.financiador ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.estado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <button
                      onClick={() => onEdit(p)}
                      className="text-xs text-alzak-blue dark:text-alzak-gold hover:underline font-semibold"
                    >
                      Editar
                    </button>
                    <DeleteCell
                      projectId={p.id_proyecto}
                      onDelete={() => onDelete(p.id_proyecto)}
                      isDeleting={deletingId === p.id_proyecto}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
