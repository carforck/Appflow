import type { UserRole } from '@/context/AuthContext';

export const ROLE_CFG: Record<UserRole, { label: string; cls: string }> = {
  superadmin: { label: 'Superadmin',   cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  admin:      { label: 'Admin',        cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   },
  user:       { label: 'Investigador', cls: 'bg-slate-100  text-slate-600  dark:bg-slate-700/60  dark:text-slate-300'  },
};

export interface UserForm {
  correo:          string;
  nombre_completo: string;
  role:            UserRole;
  activo:          boolean;
}

export const EMPTY_FORM: UserForm = {
  correo:          '',
  nombre_completo: '',
  role:            'user',
  activo:          true,
};
