// Configuración, constantes y helpers de la vista de tareas
import type { TareaStatus, TareaPrioridad } from '@/lib/mockData';

// ── Estilos por estado ────────────────────────────────────────────────────────

export const STATUS_CFG: Record<
  TareaStatus,
  { label: string; icon: string; headerCls: string; dotCls: string; countCls: string }
> = {
  'Pendiente': {
    label: 'Por Hacer', icon: '⚪',
    headerCls: 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60',
    dotCls:    'bg-slate-400',
    countCls:  'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  },
  'En Proceso': {
    label: 'En Progreso', icon: '🔵',
    headerCls: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40',
    dotCls:    'bg-alzak-blue dark:bg-alzak-gold',
    countCls:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  'Completada': {
    label: 'Hecho', icon: '🟢',
    headerCls: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40',
    dotCls:    'bg-emerald-500',
    countCls:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
};

export const PRIORIDAD_DOT: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-500',
  Media: 'bg-yellow-400',
  Baja:  'bg-emerald-500',
};

export const PRIORIDAD_BADGE: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const ALL_STATUSES: TareaStatus[] = ['Pendiente', 'En Proceso', 'Completada'];

// ── Helpers de fecha ──────────────────────────────────────────────────────────

export function formatFecha(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDateGroup(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

export function groupByDate<T extends { completedAt?: string | null; fecha_entrega: string }>(
  tasks: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  const sorted = [...tasks].sort((a, b) => {
    const da = a.completedAt ?? a.fecha_entrega;
    const db = b.completedAt ?? b.fecha_entrega;
    return new Date(db).getTime() - new Date(da).getTime();
  });
  for (const t of sorted) {
    const raw = t.completedAt ?? t.fecha_entrega;
    const key = raw.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}
