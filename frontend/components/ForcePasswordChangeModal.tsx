"use client";

import { useState } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth }   from '@/context/AuthContext';
import { useToast }  from '@/components/Toast';

interface Props {
  forced?: boolean; // true = primer login (no se puede cerrar)
  onClose?: () => void;
}

export function ForcePasswordChangeModal({ forced = false, onClose }: Props) {
  const { clearMustChangePassword } = useAuth();
  const { addToast } = useToast();

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]      = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (next.length < 8)           { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (next !== confirm)          { setError('Las contraseñas no coinciden'); return; }
    if (next === 'Alzak2026*')     { setError('Debes elegir una contraseña distinta a la temporal'); return; }

    setSaving(true);
    try {
      const res = await authFetch('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al cambiar la contraseña'); return; }

      clearMustChangePassword();
      addToast('Contraseña actualizada correctamente', 'success');
      onClose?.();
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdrop = () => { if (!forced) onClose?.(); };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden"
        style={{ background: 'var(--sidebar-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-alzak-blue/10 dark:bg-alzak-gold/10 flex items-center justify-center text-xl shrink-0">
              🔐
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white text-base">
                {forced ? 'Cambia tu contraseña' : 'Cambiar contraseña'}
              </h2>
              {forced && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Es tu primer ingreso. Debes definir una contraseña personal antes de continuar.
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Contraseña actual */}
          <div>
            <label htmlFor="fpc-current" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              {forced ? 'Contraseña temporal' : 'Contraseña actual'}
            </label>
            <div className="relative">
              <input
                id="fpc-current"
                type={showCur ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder={forced ? 'Alzak2026*' : '••••••••'}
                className="w-full px-4 py-2.5 pr-10 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm"
              />
              <button type="button" onClick={() => setShowCur((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCur ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label htmlFor="fpc-new" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="fpc-new"
                type={showNew ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2.5 pr-10 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirmar */}
          <div>
            <label htmlFor="fpc-confirm" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Confirmar contraseña
            </label>
            <input
              id="fpc-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la nueva contraseña"
              className="w-full px-4 py-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm"
            />
          </div>

          {/* Indicador de fortaleza */}
          {next.length > 0 && (
            <div className="flex gap-1">
              {[
                next.length >= 8,
                /[A-Z]/.test(next),
                /[0-9]/.test(next),
                /[^A-Za-z0-9]/.test(next),
              ].map((ok, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-[8px] px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            {!forced && (
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-[12px] text-sm font-bold bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
