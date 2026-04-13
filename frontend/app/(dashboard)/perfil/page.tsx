"use client";

import { useAuth } from '@/context/AuthContext';
import { useTaskStore } from '@/context/TaskStoreContext';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import type { UserRole } from '@/lib/mockData';

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  admin:      'bg-alzak-blue/10 text-alzak-blue dark:bg-alzak-gold/10 dark:text-alzak-gold',
  user:       'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
};

const ROLE_LABEL: Record<UserRole, string> = {
  superadmin: 'Super Administrador',
  admin:      'Administrador',
  user:       'Investigador',
};

export default function PerfilPage() {
  const { user, logout }  = useAuth();
  const { tasks }         = useTaskStore();
  const router            = useRouter();

  if (!user) return null;

  const initials = user.nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Activity summary
  const myTasks       = tasks.filter((t) => t.responsable_correo === user.email);
  const totalAssigned = myTasks.length;
  const completed     = myTasks.filter((t) => t.status === 'Completada').length;
  const inProgress    = myTasks.filter((t) => t.status === 'En Proceso').length;
  const pending       = myTasks.filter((t) => t.status === 'Pendiente').length;
  const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  // Recent completed tasks
  const recentCompleted = myTasks
    .filter((t) => t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 4);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Información de tu cuenta</p>
      </div>

      {/* Profile card */}
      <div className="glass rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-alzak-blue/20 to-alzak-gold/10" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-8 mb-4 flex items-end justify-between">
            <div className="w-16 h-16 rounded-2xl bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-xl font-bold shadow-lg border-4 border-white dark:border-slate-900">
              {initials}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <ThemeToggle />
            </div>
          </div>

          {/* Name + role */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user.nombre}</h2>
            <div className="flex items-center gap-2">
              <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${ROLE_BADGE[user.role]}`}>
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Alzak Foundation · Investigación Clínica</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity summary */}
      <div className="glass rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 p-5" style={{ background: 'var(--sidebar-bg)' }}>
        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4">Resumen de actividad</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Asignadas',   value: totalAssigned, color: 'text-slate-700 dark:text-slate-200' },
            { label: 'Completadas', value: completed,     color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'En Proceso',  value: inProgress,    color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Pendientes',  value: pending,       color: 'text-amber-600 dark:text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 rounded-[14px] bg-slate-50 dark:bg-slate-800/60">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {totalAssigned > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Tasa de completado</span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recent completed tasks */}
      {recentCompleted.length > 0 && (
        <div className="glass rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 p-5" style={{ background: 'var(--sidebar-bg)' }}>
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-3">Tareas completadas recientemente</h3>
          <div className="space-y-2">
            {recentCompleted.map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-[12px] bg-slate-50 dark:bg-slate-800/60">
                <span className="text-emerald-500 text-base shrink-0 mt-0.5">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{t.tarea_descripcion}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.nombre_proyecto}</p>
                </div>
                {t.completedAt && (
                  <p className="text-[10px] text-slate-400 shrink-0">
                    {new Date(t.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Cerrar sesión</span>
      </button>
    </div>
  );
}
