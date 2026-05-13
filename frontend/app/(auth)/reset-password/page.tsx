"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Step = 'email' | 'code' | 'password' | 'done';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function ResetPasswordPage() {
  const [step,        setStep]        = useState<Step>('email');
  const [email,       setEmail]       = useState('');
  const [code,        setCode]        = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Siempre avanzar — no revelar si el correo existe
      setStep('code');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally { setLoading(false); }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await fetch(`${API}/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Código inválido'); return; }
      setStep('password');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally { setLoading(false); }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPass !== confirmPass) { setError('Las contraseñas no coinciden'); return; }
    if (newPass.length < 6)      { setError('Mínimo 6 caracteres'); return; }
    setError(''); setLoading(true);
    try {
      const r = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword: newPass }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Error al restablecer'); return; }
      setStep('done');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Image src="/logo-alzak.webp" alt="Alzak Foundation" width={90} height={45} className="object-contain" />
          <div className="w-px h-9 bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-col leading-tight">
            <span className="text-[1.15rem] font-bold text-alzak-blue dark:text-white">ALZAK Flow</span>
            <span className="text-[0.68rem] font-semibold text-alzak-gold uppercase tracking-widest">v1.0 · Foundation</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl px-7 py-8 shadow-xl border border-slate-100 dark:border-slate-800">

          {/* ── Paso 1: correo ── */}
          {step === 'email' && (
            <>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-alzak-blue dark:text-alzak-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">¿Olvidaste tu contraseña?</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ingresa tu correo y te enviamos un código de verificación</p>
              </div>
              <form onSubmit={handleSendCode}>
                <label htmlFor="email-reset" className="block text-[0.68rem] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">Correo institucional</label>
                <input
                  id="email-reset" type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nombre@alzakfoundation.org"
                  className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all"
                />
                {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
                <button type="submit" disabled={loading}
                  className="mt-5 w-full py-3.5 rounded-xl bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90">
                  {loading ? 'Enviando…' : 'Enviar código'}
                </button>
              </form>
            </>
          )}

          {/* ── Paso 2: código OTP ── */}
          {step === 'code' && (
            <>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Revisa tu correo</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Si <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span> está registrado, recibirás un código de 6 dígitos. Válido por 15 minutos.
                </p>
              </div>
              <form onSubmit={handleVerifyCode}>
                <label htmlFor="otp-code" className="block text-[0.68rem] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">Código de verificación</label>
                <input
                  id="otp-code" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} required
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-2xl font-bold tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all"
                />
                {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
                <button type="submit" disabled={loading || code.length < 6}
                  className="mt-5 w-full py-3.5 rounded-xl bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90">
                  {loading ? 'Verificando…' : 'Verificar código'}
                </button>
                <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}
                  className="mt-3 w-full py-2.5 rounded-xl text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Volver a ingresar correo
                </button>
              </form>
            </>
          )}

          {/* ── Paso 3: nueva contraseña ── */}
          {step === 'password' && (
            <>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-alzak-blue dark:text-alzak-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Nueva contraseña</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Crea una contraseña segura de mínimo 6 caracteres</p>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-pass" className="block text-[0.68rem] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">Nueva contraseña</label>
                    <div className="relative">
                      <input id="new-pass" type={showPass ? 'text' : 'password'} required minLength={6}
                        value={newPass} onChange={e => setNewPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3.5 pr-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all" />
                      <button type="button" onClick={() => setShowPass(v => !v)} aria-label="Mostrar contraseña"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          {showPass
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-pass" className="block text-[0.68rem] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">Confirmar contraseña</label>
                    <input id="confirm-pass" type={showPass ? 'text' : 'password'} required
                      value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all" />
                  </div>
                </div>
                {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}
                <button type="submit" disabled={loading}
                  className="mt-5 w-full py-3.5 rounded-xl bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90">
                  {loading ? 'Guardando…' : 'Cambiar contraseña'}
                </button>
              </form>
            </>
          )}

          {/* ── Paso 4: éxito ── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white mb-2">¡Contraseña actualizada!</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <Link href="/login"
                className="inline-block px-6 py-3 rounded-xl bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark font-semibold text-sm hover:opacity-90 transition-all">
                Ir al inicio de sesión
              </Link>
            </div>
          )}

          {/* Volver al login — visible en pasos 1-3 */}
          {step !== 'done' && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link href="/login" className="text-xs text-slate-400 hover:text-alzak-blue dark:hover:text-alzak-gold transition-colors">
                ← Volver al inicio de sesión
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
