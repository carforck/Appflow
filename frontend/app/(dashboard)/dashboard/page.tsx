"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/api';

interface Tarea {
  id: number;
  id_proyecto: string;
  tarea_descripcion: string;
  responsable_nombre: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  fecha_entrega: string;
}

const PRIORIDAD_DOT: Record<string, string> = {
  Alta:  'bg-red-500',
  Media: 'bg-yellow-400',
  Baja:  'bg-emerald-500',
};

const PRIORIDAD_BADGE: Record<string, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function StatCard({
  label, value, color, bg, loading,
}: {
  label: string; value: number | string; color: string; bg: string; loading: boolean;
}) {
  return (
    <div className={`glass rounded-[20px] p-5 ${bg}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{label}</p>
      {loading ? (
        <div className="h-8 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mt-1" />
      ) : (
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tareas,   setTareas]   = useState<Tarea[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    authFetch('/tareas')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setTareas(d.tareas ?? []))
      .catch(() => setError('No se pudo conectar. ¿El túnel SSH y el backend están activos?'))
      .finally(() => setLoading(false));
  }, []);

  const hoy      = new Date();
  const alta     = tareas.filter((t) => t.prioridad === 'Alta').length;
  const vencidas = tareas.filter((t) => t.fecha_entrega && new Date(t.fecha_entrega) < hoy).length;
  const proyectos = new Set(tareas.map((t) => t.id_proyecto)).size;
  const recientes = [...tareas].reverse().slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">
          Hola, {user?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Resumen de Alzak Flow
          {user?.role !== 'user' && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold text-[10px] font-bold uppercase">
              {user?.role}
            </span>
          )}
        </p>
      </div>

      {/* Banner de error */}
      {error && !loading && (
        <div className="glass rounded-[16px] px-4 py-3 flex items-center gap-3 border border-red-200 dark:border-red-800/40">
          <span>⚠️</span>
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Tareas Totales" value={tareas.length} color="text-alzak-blue dark:text-alzak-gold" bg="bg-alzak-blue/8 dark:bg-alzak-gold/10"     loading={loading} />
        <StatCard label="Alta Prioridad" value={alta}          color="text-red-500"                          bg="bg-red-50 dark:bg-red-900/20"               loading={loading} />
        <StatCard label="Vencidas"       value={vencidas}      color={vencidas > 0 ? 'text-orange-500' : 'text-emerald-600'} bg={vencidas > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'} loading={loading} />
        <StatCard label="Proyectos"      value={proyectos}     color="text-violet-600"                       bg="bg-violet-50 dark:bg-violet-900/20"         loading={loading} />
      </div>

      {/* Tareas recientes */}
      <div className="glass rounded-[20px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-800 dark:text-white">Tareas Recientes</h2>
          <Link href="/tareas" className="text-xs text-alzak-blue dark:text-alzak-gold font-medium hover:underline">
            Ver todas →
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[14px] bg-slate-50 dark:bg-slate-800/50 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
                <div className="h-4 w-10 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        )}

        {!loading && recientes.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-6">
            {error ? 'Sin conexión a la base de datos.' : 'No hay tareas aún. Procesa una minuta para empezar.'}
          </p>
        )}

        {!loading && recientes.length > 0 && (
          <div className="space-y-2">
            {recientes.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORIDAD_DOT[t.prioridad] ?? 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {t.tarea_descripcion}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    Proy. {t.id_proyecto} · {t.responsable_nombre}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORIDAD_BADGE[t.prioridad] ?? ''}`}>
                  {t.prioridad}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick action */}
      <div className="glass rounded-[20px] p-5 flex items-center gap-4">
        <div className="w-12 h-12 shrink-0 rounded-[14px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-xl">
          ✨
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-white text-sm">¿Nueva minuta?</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Procésala con IA en segundos</p>
        </div>
        <Link
          href="/procesador"
          className="shrink-0 px-4 py-2.5 bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark text-xs font-bold rounded-[12px] hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          Ir →
        </Link>
      </div>
    </div>
  );
}
