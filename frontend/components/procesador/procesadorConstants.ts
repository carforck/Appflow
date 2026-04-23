import type { TareaPrioridad, TareaStatus } from '@/lib/mockData';

export const PRIORIDADES: TareaPrioridad[] = ['Alta', 'Media', 'Baja'];

export const PRIO_COLOR: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-400',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-400',
  Baja:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-green-400',
};

export const STATUSES: TareaStatus[] = ['Pendiente', 'En Proceso', 'Completada'];
