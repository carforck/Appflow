"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Tarea {
  id: number;
  id_proyecto: string;
  tarea_descripcion: string;
  responsable_nombre: string;
  responsable_correo: string | null;
  prioridad: 'Alta' | 'Media' | 'Baja';
  status: string;
  fecha_entrega: string;
  resumen_meeting: string;
}

const FILTROS = ['Todas', 'Alta', 'Media', 'Baja'] as const;
type Filtro = typeof FILTROS[number];

const PRIORIDAD_BADGE: Record<string, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const PRIORIDAD_DOT: Record<string, string> = {
  Alta:  'bg-red-500',
  Media: 'bg-yellow-400',
  Baja:  'bg-emerald-500',
};

function formatFecha(fecha: string) {
  if (!fecha) return '—';
  try {
    return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return fecha; }
}

function isVencida(fecha: string) {
  return fecha ? new Date(fecha) < new Date() : false;
}

function TarjetaTarea({ t }: { t: Tarea }) {
  const vencida = isVencida(t.fecha_entrega);
  return (
    <div className="glass rounded-[16px] p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-all">
      <div className={`hidden sm:block w-2 h-2 rounded-full shrink-0 mt-1 ${PRIORIDAD_DOT[t.prioridad] ?? 'bg-slate-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Proy. {t.id_proyecto}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORIDAD_BADGE[t.prioridad] ?? ''}`}>
            {t.prioridad}
          </span>
          {vencida && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              Vencida
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
          {t.tarea_descripcion}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          👤 {t.responsable_nombre}
          {t.responsable_correo && (
            <span className="text-slate-400 dark:text-slate-500"> · {t.responsable_correo}</span>
          )}
        </p>
      </div>
      <div className={`shrink-0 text-right text-xs font-semibold ${vencida ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
        📅 {formatFecha(t.fecha_entrega)}
      </div>
    </div>
  );
}

function SkeletonTarea() {
  return (
    <div className="glass rounded-[16px] p-4 flex items-center gap-3 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded shrink-0" />
    </div>
  );
}

export default function TareasPage() {
  const { user } = useAuth();
  const [filtro,  setFiltro]  = useState<Filtro>('Todas');
  const [tareas,  setTareas]  = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchTareas = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/tareas');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTareas(data.tareas ?? []);
    } catch {
      setError('No se pudo conectar con el servidor. ¿El túnel SSH y el backend están activos?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTareas(); }, []);

  const filtradas = filtro === 'Todas' ? tareas : tareas.filter((t) => t.prioridad === filtro);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Tareas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {loading
              ? 'Cargando...'
              : user?.role === 'user'
                ? `Tus tareas asignadas (${tareas.length})`
                : `${tareas.length} tareas totales`}
          </p>
        </div>
        <button
          onClick={fetchTareas}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-alzak-blue dark:hover:text-alzak-gold transition-colors px-3 py-1.5 glass rounded-[10px]"
        >
          ↺ Recargar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              filtro === f
                ? 'bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark shadow-md'
                : 'glass text-slate-600 dark:text-slate-300'
            }`}
          >
            {f}
            {!loading && f !== 'Todas' && (
              <span className="ml-1.5 opacity-70">
                {tareas.filter((t) => t.prioridad === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-[20px] p-6 text-center space-y-3">
          <p className="text-2xl">⚠️</p>
          <p className="text-sm font-semibold text-red-500">{error}</p>
          <Link href="/procesador" className="text-xs text-alzak-blue dark:text-alzak-gold hover:underline">
            Ir al Procesador →
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonTarea key={i} />)}
        </div>
      )}

      {/* Vacío */}
      {!loading && !error && filtradas.length === 0 && (
        <div className="glass rounded-[20px] p-10 text-center space-y-4">
          <p className="text-5xl">📋</p>
          <div>
            <p className="font-bold text-slate-800 dark:text-white">
              {filtro === 'Todas' ? 'No hay tareas aún' : `Sin tareas de prioridad ${filtro}`}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user?.role === 'user'
                ? 'No tienes tareas asignadas actualmente.'
                : 'Procesa una minuta para crear tareas automáticamente.'}
            </p>
          </div>
          <Link
            href="/procesador"
            className="inline-block px-6 py-3 bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark text-sm font-bold rounded-[14px] hover:opacity-90 active:scale-95 transition-all shadow-md"
          >
            ✨ Procesar minuta
          </Link>
        </div>
      )}

      {/* Lista real */}
      {!loading && !error && filtradas.length > 0 && (
        <div className="space-y-3">
          {filtradas.map((t) => <TarjetaTarea key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
