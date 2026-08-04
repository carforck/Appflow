"use client";

import { useState, useEffect } from 'react';

interface AdminPasswordModalProps {
  nombre:  string;
  correo:  string;
  onSave:  (data: { newPassword: string; requireChange: boolean }) => Promise<void>;
  onClose: () => void;
}

/** Genera una contraseña temporal legible: 12 chars con mayúsculas, minúsculas, dígitos y símbolo. */
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const nums  = '23456789';
  const syms  = '@#$%*!?';
  const all   = upper + lower + nums + syms;
  const pick  = (set: string) => set[Math.floor(Math.random() * set.length)];
  const base  = [pick(upper), pick(lower), pick(nums), pick(syms)];
  for (let i = 0; i < 8; i++) base.push(pick(all));
  return base.sort(() => Math.random() - 0.5).join('');
}

export function AdminPasswordModal({ nombre, correo, onSave, onClose }: AdminPasswordModalProps) {
  const [password,      setPassword]      = useState('');
  const [requireChange, setRequireChange] = useState(true);
  const [show,          setShow]          = useState(true);
  const [error,         setError]         = useState('');
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }

    setSaving(true);
    try {
      await onSave({ newPassword: password, requireChange });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[12px] bg-alzak-blue/10 dark:bg-alzak-gold/10 flex items-center justify-center text-xl shrink-0">
              🔑
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-800 dark:text-white text-base">Cambiar credenciales</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{nombre} · {correo}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar modal" className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nueva contraseña */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="apm-pass" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Nueva contraseña
              </label>
              <button
                type="button"
                onClick={() => { setPassword(generatePassword()); setShow(true); setError(''); }}
                className="text-[11px] font-semibold text-alzak-blue dark:text-alzak-gold hover:underline"
              >
                Generar segura
              </button>
            </div>
            <div className="relative">
              <input
                id="apm-pass"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                aria-invalid={!!error}
                aria-describedby={error ? 'apm-pass-err' : undefined}
                className="w-full px-4 py-2.5 pr-10 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm font-mono"
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? '🙈' : '👁️'}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex gap-1 mt-2">
                {checks.map((ok, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
            )}
            {error && <p id="apm-pass-err" role="alert" className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>

          {/* Requerir cambio */}
          <label className="flex items-start gap-3 p-3 rounded-[12px] bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
            <input
              type="checkbox"
              checked={requireChange}
              onChange={(e) => setRequireChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-alzak-blue dark:accent-alzak-gold"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Pedir cambio en el próximo ingreso</span>
              <span className="block text-[10px] text-slate-400">El usuario deberá definir su propia contraseña al iniciar sesión</span>
            </span>
          </label>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 rounded-[10px] px-3 py-2">
            <span>✉️</span>
            <span>Se enviará un correo a <strong className="text-slate-600 dark:text-slate-300">{correo}</strong> con la contraseña asignada. Sus sesiones activas se cerrarán.</span>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-[12px] text-sm font-bold bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Cambiar y notificar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
