"use client";

import { StatusBadge } from '@/components/ui/Badge';
import type { MockProject } from '@/lib/mockData';

interface ProjectTableProps {
  projects: MockProject[];
  onEdit:   (p: MockProject) => void;
}

const HEADERS = ['Código', 'Nombre', 'Financiador', 'Estado', ''];

export function ProjectTable({ projects, onEdit }: ProjectTableProps) {
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
                  i < projects.length - 1
                    ? 'border-b border-slate-100/60 dark:border-slate-700/40'
                    : '',
                ].join(' ')}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-alzak-blue dark:text-alzak-gold bg-alzak-blue/[0.08] dark:bg-alzak-gold/[0.08] px-2 py-0.5 rounded-lg whitespace-nowrap">
                    {p.id_proyecto}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                  {p.nombre}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {p.financiador ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEdit(p)}
                    className="text-xs text-alzak-blue dark:text-alzak-gold hover:underline font-semibold"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
