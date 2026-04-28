"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

const BYPASS_ROLES: { role: UserRole; label: string; desc: string; color: string }[] = [
  {
    role: 'superadmin',
    label: 'Superadmin',
    desc: 'Carlos Carranza — acceso total + Logs',
    color: 'border-violet-300 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40',
  },
  {
    role: 'admin',
    label: 'Admin / PM',
    desc: 'Alejandra Puerto — Procesador + Board',
    color: 'border-alzak-blue/30 dark:border-alzak-gold/30 bg-alzak-blue/5 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold hover:bg-alzak-blue/10 dark:hover:bg-alzak-gold/20',
  },
  {
    role: 'user',
    label: 'Investigador',
    desc: 'Lina Salcedo — solo mis tareas',
    color: 'border-slate-200 dark:border-slate-600/60 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70',
  },
];

export default function LoginPage() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginMock } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { ok, error: loginError } = await login(email, password);
    if (ok) {
      router.replace('/dashboard');
    } else {
      setError(loginError ?? 'Credenciales incorrectas');
      setLoading(false);
    }
  };

  const handleBypass = (role: UserRole) => {
    loginMock(role);
    router.replace('/dashboard');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Fondos decorativos */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-alzak-blue/8 dark:bg-alzak-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-alzak-gold/8 dark:bg-alzak-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm space-y-4">
        {/* ── Card principal ── */}
        <div className="glass rounded-[24px] p-8 shadow-2xl">
          {/* ── Branding header ── */}
          <div className="flex items-center gap-4 mb-7">
            {/* Logo izquierda */}
            <div className="shrink-0">
              <Image
                src="/logo-alzak.webp"
                alt="Alzak Foundation"
                width={120}
                height={60}
                priority
                className="object-contain"
              />
            </div>
            {/* Divisor */}
            <div className="w-px self-stretch bg-slate-200 dark:bg-slate-700 shrink-0" />
            {/* Texto derecha */}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                by Alzak Foundation
              </p>
              <h1 className="text-2xl font-bold text-alzak-blue dark:text-white leading-tight">
                Alzak Flow
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                Sistema de Gestión de Proyectos
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Inicia sesión con tu cuenta institucional
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Correo institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@alzak.org"
                required
                className="w-full px-4 py-3 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold transition-all text-sm"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50 rounded"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-[12px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-[14px] bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">© 2026 Alzak Foundation</p>
        </div>

        {/* ── Dev Bypass Panel ── */}
        <div className="glass rounded-[20px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Dev Bypass — Modo Prueba
            </p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 leading-relaxed">
            Elige un rol para ingresar sin backend. Cada rol tiene vistas y permisos distintos.
          </p>
          <div className="space-y-2">
            {BYPASS_ROLES.map(({ role, label, desc, color }) => (
              <button
                key={role}
                onClick={() => handleBypass(role)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[12px] border text-left transition-all ${color}`}
              >
                <div>
                  <p className="text-xs font-bold">{label}</p>
                  <p className="text-[10px] opacity-70">{desc}</p>
                </div>
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
