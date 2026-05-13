"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth }      from '@/context/AuthContext';
import { useTaskStore } from '@/context/TaskStoreContext';
import { useRouter }    from 'next/navigation';
import ThemeToggle      from '@/components/ThemeToggle';
import { ForcePasswordChangeModal } from '@/components/ForcePasswordChangeModal';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { daysUntil, formatFecha } from '@/components/tareas/taskBoardConfig';
import type { UserRole } from '@/lib/mockData';

// ── Constantes de estilo ──────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekLabel(date: Date) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PerfilPage() {
  const { user, logout }  = useAuth();
  const { tasks }         = useTaskStore();
  const router            = useRouter();
  const [showPwdModal, setShowPwdModal] = useState(false);

  // ── Mis tareas (todos los hooks ANTES del early return) ──────────────────
  const myTasks       = tasks.filter((t) => t.responsable_correo === user?.email);
  const totalAssigned = myTasks.length;
  const completed     = myTasks.filter((t) => t.status === 'Completada').length;
  const inProgress    = myTasks.filter((t) => t.status === 'En Proceso').length;
  const pending       = myTasks.filter((t) => t.status === 'Pendiente').length;
  const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  const overdue = myTasks
    .filter((t) => t.status !== 'Completada' && daysUntil(t.fecha_entrega) < 0)
    .sort((a, b) => daysUntil(a.fecha_entrega) - daysUntil(b.fecha_entrega));

  const upcoming = myTasks
    .filter((t) => {
      const d = daysUntil(t.fecha_entrega);
      return t.status !== 'Completada' && d >= 0 && d <= 7;
    })
    .sort((a, b) => daysUntil(a.fecha_entrega) - daysUntil(b.fecha_entrega));

  const weeklyData = useMemo(() => {
    const now   = new Date();
    const weeks = Array.from({ length: 5 }, (_, i) => {
      const start = startOfWeek(new Date(now));
      start.setDate(start.getDate() - (4 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { label: getWeekLabel(start), start, end, count: 0 };
    });

    myTasks
      .filter((t) => t.status === 'Completada' && t.completedAt)
      .forEach((t) => {
        const d = new Date(t.completedAt!);
        const w = weeks.find((w) => d >= w.start && d <= w.end);
        if (w) w.count++;
      });

    return weeks.map(({ label, count }) => ({ label, count }));
  }, [myTasks]);

  // ── 5. Proyectos en los que participa ────────────────────────────────────
  const projectMap = useMemo(() => {
    const map = new Map<string, { nombre: string; total: number; completadas: number; id: string }>();
    myTasks.forEach((t) => {
      const key = t.id_proyecto ?? t.nombre_proyecto ?? 'Sin proyecto';
      if (!map.has(key)) {
        map.set(key, { nombre: t.nombre_proyecto ?? key, total: 0, completadas: 0, id: key });
      }
      const p = map.get(key)!;
      p.total++;
      if (t.status === 'Completada') p.completadas++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [myTasks]);

  if (!user) return null;

  const initials = user.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Información de tu cuenta</p>
      </div>

      {/* ── Card de perfil ── */}
      <div className="glass rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="h-20 bg-gradient-to-r from-alzak-blue/20 to-alzak-gold/10" />
        <div className="px-6 pb-6">
          <div className="-mt-8 mb-4 flex items-end justify-between">
            <div className="w-16 h-16 rounded-2xl bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-xl font-bold shadow-lg border-4 border-white dark:border-slate-900">
              {initials}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <ThemeToggle />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user.nombre}</h2>
          <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>
            {ROLE_LABEL[user.role]}
          </span>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {user.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Alzak Foundation · Investigación Clínica
            </div>
          </div>
        </div>
      </div>

      {/* ── Resumen de actividad ── */}
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
        {totalAssigned > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Tasa de completado</span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── 1. Tareas vencidas ── */}
      {overdue.length > 0 && (
        <div className="glass rounded-[24px] border border-red-200/60 dark:border-red-900/30 p-5" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              Tareas vencidas
              <span className="ml-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">{overdue.length}</span>
            </h3>
            <Link href="/tareas" className="text-[11px] text-slate-400 hover:text-alzak-blue dark:hover:text-alzak-gold transition-colors">Ver tablero →</Link>
          </div>
          <div className="space-y-2">
            {overdue.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-[12px] bg-red-50/60 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                <span className="text-red-500 text-sm shrink-0 mt-0.5">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{t.tarea_descripcion}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{t.nombre_proyecto}</p>
                </div>
                <span className="text-[10px] font-bold text-red-500 shrink-0 whitespace-nowrap">
                  {Math.abs(daysUntil(t.fecha_entrega))}d atrás
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Próximas a vencer ── */}
      {upcoming.length > 0 && (
        <div className="glass rounded-[24px] border border-amber-200/60 dark:border-amber-900/30 p-5" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Vencen esta semana
              <span className="ml-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full">{upcoming.length}</span>
            </h3>
            <Link href="/tareas" className="text-[11px] text-slate-400 hover:text-alzak-blue dark:hover:text-alzak-gold transition-colors">Ver tablero →</Link>
          </div>
          <div className="space-y-2">
            {upcoming.map((t) => {
              const d = daysUntil(t.fecha_entrega);
              return (
                <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-[12px] bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                  <span className="text-amber-500 text-sm shrink-0 mt-0.5">🕐</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{t.tarea_descripcion}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{t.nombre_proyecto}</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0 whitespace-nowrap">
                    {d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `${d}d · ${formatFecha(t.fecha_entrega)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Gráfico de productividad ── */}
      {totalAssigned > 0 && (
        <div className="glass rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 p-5" style={{ background: 'var(--sidebar-bg)' }}>
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-1">Productividad semanal</h3>
          <p className="text-[11px] text-slate-400 mb-4">Tareas completadas por semana</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--sidebar-bg)', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [v ?? 0, 'Completadas']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={i === weeklyData.length - 1 ? '#1a365d' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 5. Proyectos en los que participa ── */}
      {projectMap.length > 0 && (
        <div className="glass rounded-[24px] border border-slate-200/60 dark:border-slate-700/60 p-5" style={{ background: 'var(--sidebar-bg)' }}>
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-3">Mis proyectos</h3>
          <div className="space-y-2.5">
            {projectMap.map((p) => {
              const pct = p.total > 0 ? Math.round((p.completadas / p.total) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-1 flex-1 mr-2">{p.nombre}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">{p.completadas}/{p.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-alzak-blue dark:bg-alzak-gold transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cambiar contraseña ── */}
      <button
        onClick={() => setShowPwdModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] text-sm font-semibold text-alzak-blue dark:text-alzak-gold border border-alzak-blue/20 dark:border-alzak-gold/20 hover:bg-alzak-blue/5 dark:hover:bg-alzak-gold/10 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        Cambiar contraseña
      </button>

      {/* ── Cerrar sesión ── */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        Cerrar sesión
      </button>

      {showPwdModal && <ForcePasswordChangeModal onClose={() => setShowPwdModal(false)} />}
    </div>
  );
}
