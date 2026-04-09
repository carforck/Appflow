"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Fondos decorativos */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-alzak-blue/10 dark:bg-alzak-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-alzak-gold/10 dark:bg-alzak-blue/8 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm glass rounded-[24px] p-8 shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-[20px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark font-bold text-2xl shadow-lg">
            AF
          </div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Alzak Flow</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inicia sesión con tu cuenta institucional
          </p>
        </div>

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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold transition-all text-sm"
            />
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
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">© 2026 Alzak Foundation</p>
      </div>
    </div>
  );
}
