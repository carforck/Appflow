"use client";

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

interface UserOption {
  correo: string;
  nombre_completo: string;
}

export default function ProcesadorPage() {
  const [texto,     setTexto]     = useState('');
  const [cargando,  setCargando]  = useState(false);
  const [mensaje,   setMensaje]   = useState('');
  const [usuarios,  setUsuarios]  = useState<UserOption[]>([]);
  const [responsable, setResponsable] = useState('');

  // Cargar lista de usuarios para el selector
  useEffect(() => {
    authFetch('/users')
      .then((r) => r.json())
      .then((d) => setUsuarios(d.users ?? []))
      .catch(() => {}); // silencioso si falla
  }, []);

  const procesarMinuta = async () => {
    if (!texto.trim()) return alert('Mijo, pegue algún texto primero');
    setCargando(true);
    setMensaje('');

    try {
      const res = await authFetch('/procesar-reunion', {
        method: 'POST',
        body: JSON.stringify({
          texto,
          ...(responsable ? { responsable_sugerido: responsable } : {}),
        }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setMensaje(`✅ ¡Éxito! Proyecto ${data.proyecto} actualizado. ${data.tareas_creadas} tareas creadas.`);
        setTexto('');
        setResponsable('');
      } else {
        setMensaje('❌ Error: ' + (data.detalle ?? data.error));
      }
    } catch {
      setMensaje('❌ No se pudo conectar con el servidor. ¿El backend está activo?');
    } finally {
      setCargando(false);
    }
  };

  const exito = mensaje.startsWith('✅');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Procesador de Minutas</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Pega el texto de la reunión y deja que la IA organice el trabajo.
        </p>
      </div>

      {/* Área principal */}
      <div className="glass rounded-[20px] p-6 space-y-4">

        {/* Selector de Responsable */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
            Responsable principal <span className="normal-case font-normal text-slate-400">(opcional — ayuda a la IA)</span>
          </label>
          <select
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            className="w-full px-4 py-3 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold transition-all text-sm appearance-none"
          >
            <option value="">— Sin pre-selección —</option>
            {usuarios.map((u) => (
              <option key={u.correo} value={u.nombre_completo}>
                {u.nombre_completo}
              </option>
            ))}
          </select>
        </div>

        {/* Área de texto */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
            Texto de la minuta
          </label>
          <textarea
            className="w-full h-52 sm:h-64 p-4 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold resize-none transition-all text-sm"
            placeholder="Ej: Hoy nos reunimos por el proyecto 5024 con Bayer. Lina se encarga del informe para el próximo lunes, prioridad alta..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <button
          onClick={procesarMinuta}
          disabled={cargando}
          className={`w-full py-4 rounded-[14px] font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
            cargando
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90'
          }`}
        >
          {cargando ? '⏳ Procesando con IA...' : '✨ Procesar con IA'}
        </button>

        {mensaje && (
          <div
            className={`p-4 rounded-[14px] text-sm font-medium text-center transition-all ${
              exito
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {mensaje}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="glass rounded-[20px] p-5">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Tips para mejores resultados
        </p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2.5"><span>📌</span>Menciona el número de proyecto al inicio (ej: "proyecto 5024").</li>
          <li className="flex gap-2.5"><span>👤</span>Usa nombres completos del equipo para asignar tareas correctamente.</li>
          <li className="flex gap-2.5"><span>📅</span>Menciona fechas claras ("próximo lunes", "15 de mayo").</li>
          <li className="flex gap-2.5"><span>⚡</span>Indica prioridades: "urgente" → Alta, "cuando pueda" → Baja.</li>
        </ul>
      </div>
    </div>
  );
}
