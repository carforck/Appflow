"use client";

import { useState, useEffect } from 'react';
import type { UserRole } from '@/context/AuthContext';
import { Switch }    from '@/components/ui/Switch';
import { ROLE_CFG, UserForm, EMPTY_FORM } from './userConstants';

interface UserFormModalProps {
  initial:        UserForm | null;   // null = crear nuevo
  existingEmails: string[];
  onSave:         (data: UserForm) => void;
  onClose:        () => void;
}

export function UserFormModal({ initial, existingEmails, onSave, onClose }: UserFormModalProps) {
  const isEdit  = initial !== null;
  const [form,   setForm]   = useState<UserForm>(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof UserForm, string>> = {};
    if (!form.nombre_completo.trim()) errs.nombre_completo = 'El nombre es obligatorio';
    if (!form.correo.trim()) {
      errs.correo = 'El correo es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      errs.correo = 'Formato de correo inválido';
    } else if (!isEdit && existingEmails.includes(form.correo.toLowerCase())) {
      errs.correo = 'Este correo ya existe';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSave({ ...form, correo: form.correo.toLowerCase().trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md glass rounded-[24px] shadow-2xl overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60">
          <h2 className="font-bold text-slate-800 dark:text-white">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar modal" className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="uf-nombre" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Nombre completo
            </label>
            <input
              id="uf-nombre"
              type="text"
              value={form.nombre_completo}
              onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
              placeholder="Nombre Apellido"
              aria-invalid={!!errors.nombre_completo}
              aria-describedby={errors.nombre_completo ? 'uf-nombre-err' : undefined}
              className="w-full px-4 py-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm transition-all"
            />
            {errors.nombre_completo && <p id="uf-nombre-err" role="alert" className="text-xs text-red-500 mt-1">{errors.nombre_completo}</p>}
          </div>

          {/* Correo */}
          <div>
            <label htmlFor="uf-correo" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Correo institucional
            </label>
            <input
              id="uf-correo"
              type="email"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              placeholder="nombre@alzak.org"
              disabled={isEdit}
              aria-invalid={!!errors.correo}
              aria-describedby={errors.correo ? 'uf-correo-err' : undefined}
              className="w-full px-4 py-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {errors.correo && <p id="uf-correo-err" role="alert" className="text-xs text-red-500 mt-1">{errors.correo}</p>}
          </div>

          {/* Rol */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Rol</p>
            <div className="grid grid-cols-3 gap-2">
              {(['user', 'admin', 'superadmin'] as UserRole[]).map((r) => {
                const cfg = ROLE_CFG[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`px-3 py-2 rounded-[10px] text-xs font-semibold border transition-all ${
                      form.role === r
                        ? `${cfg.cls} border-transparent ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600`
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activo */}
          <div className="flex items-center justify-between p-3 rounded-[12px] bg-slate-50 dark:bg-slate-800/60">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Usuario activo</p>
              <p className="text-[10px] text-slate-400">Puede iniciar sesión en el sistema</p>
            </div>
            <Switch checked={form.activo} onChange={(v) => setForm((f) => ({ ...f, activo: v }))} label="Usuario activo" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-[12px] text-sm font-bold bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90 active:scale-95 transition-all shadow-sm">
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
