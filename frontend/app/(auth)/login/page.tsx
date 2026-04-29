"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const SLIDES = [
  { src: '/login/sofa.webp',     alt: 'Alzak Foundation — espacio de trabajo' },
  { src: '/login/ALZAK-21.webp', alt: 'Alzak Foundation — equipo' },
];

/* ─────────────────────────────────────────────
   Slider: fade 1.2 s, intervalo 9 s
   Usado como fondo en móvil y como columna en desktop
───────────────────────────────────────────── */
function ImageSlider() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % SLIDES.length);
        setVisible(true);
      }, 1200);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  const goTo = (i: number) => {
    setVisible(false);
    setTimeout(() => { setCurrent(i); setVisible(true); }, 400);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-alzak-dark">
      <Image
        key={current}
        src={SLIDES[current].src}
        alt={SLIDES[current].alt}
        fill
        priority
        sizes="(min-width: 1024px) 52vw, 100vw"
        className="object-cover"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 1200ms ease-in-out' }}
      />

      {/* Gradientes institucionales */}
      <div className="absolute inset-0 bg-gradient-to-tr from-alzak-dark/85 via-alzak-blue/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-alzak-dark/70 to-transparent" />

      {/* Texto branding — solo visible en desktop (en móvil lo tapa el card) */}
      <div className="hidden lg:block absolute bottom-12 left-10 right-10">
        <h2 className="text-white text-[2rem] font-bold leading-tight tracking-tight mb-3">
          Sistema de Gestión<br />de Proyectos
        </h2>
        <p className="text-white/55 text-[0.875rem] leading-relaxed max-w-[280px]">
          Centraliza equipos, proyectos y tareas en un solo lugar.
        </p>
      </div>

      {/* Dots — posición adaptada: arriba en móvil (no tapa el form), abajo en desktop */}
      <div className="absolute bottom-5 lg:bottom-7 right-6 lg:right-8 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Imagen ${i + 1}`}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-500 ${
              i === current
                ? 'w-7 h-1.5 bg-alzak-gold'
                : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Página
───────────────────────────────────────────── */
export default function LoginPage() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router    = useRouter();

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
    /*
      MÓVIL:   posición relativa, slider como fondo absoluto, card flotante encima
      DESKTOP: flex row, columna izquierda (slider) + columna derecha (form normal)
    */
    <div className="relative min-h-screen flex flex-col lg:flex-row">

      {/* ── Slider: fondo absoluto en móvil, columna fija en desktop ── */}
      <div className="absolute inset-0 lg:relative lg:inset-auto lg:w-[52%] xl:w-[58%] lg:flex-shrink-0">
        <ImageSlider />
      </div>

      {/* ── Panel formulario ── */}
      {/*
        Móvil:   z-10 sobre el slider, centrado verticalmente con padding, fondo transparente
        Desktop: flex normal, fondo de página, sin glassmorphism
      */}
      <div
        className="relative z-10 flex-1 flex flex-col justify-center items-center
                   px-5 py-10 sm:px-10
                   lg:px-14 xl:px-20
                   lg:bg-[var(--background)]"
      >
        {/* Card glass solo en móvil */}
        <div
          className="w-full max-w-[360px] sm:max-w-[400px]
                     bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl
                     rounded-2xl px-7 py-8 shadow-2xl
                     lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none
                     lg:rounded-none lg:shadow-none lg:px-0 lg:py-0"
        >

          {/* ── Logo + nombre + versión (centrado) ── */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Image
              src="/logo-alzak.webp"
              alt="Alzak Foundation"
              width={100}
              height={50}
              className="object-contain shrink-0"
            />
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[1.25rem] font-bold text-alzak-blue dark:text-white tracking-tight">
                Alzak Flow
              </span>
              <span className="text-[0.72rem] font-semibold text-alzak-gold uppercase tracking-widest">
                v1.0 · Foundation
              </span>
            </div>
          </div>

          {/* Subtítulo */}
          <div className="mb-7 text-center">
            <h1 className="text-[1.3rem] font-bold tracking-tight text-alzak-blue dark:text-white leading-tight">
              Bienvenido de vuelta
            </h1>
            <p className="text-[0.8rem] text-slate-500 dark:text-slate-400 mt-1.5">
              Accede con tu cuenta institucional
            </p>
          </div>

          {/* ── Formulario ── */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-[0.68rem] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-1.5"
              >
                Correo institucional
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@alzakfoundation.org"
                required
                autoComplete="email"
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full px-4 py-3.5 rounded-xl
                           bg-white dark:bg-slate-800/80
                           border border-slate-200 dark:border-slate-700/60
                           text-slate-800 dark:text-slate-100
                           placeholder:text-slate-300 dark:placeholder:text-slate-600
                           text-[0.88rem]
                           focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40
                           focus:border-alzak-blue dark:focus:border-alzak-gold/60
                           transition-all shadow-sm"
              />
            </div>

            {/* Contraseña */}
            <div className="mb-1">
              <label
                htmlFor="password"
                className="block text-[0.68rem] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl
                             bg-white dark:bg-slate-800/80
                             border border-slate-200 dark:border-slate-700/60
                             text-slate-800 dark:text-slate-100
                             placeholder:text-slate-300 dark:placeholder:text-slate-600
                             text-[0.88rem]
                             focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40
                             focus:border-alzak-blue dark:focus:border-alzak-gold/60
                             transition-all shadow-sm"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1
                             text-slate-400 hover:text-slate-600
                             dark:text-slate-500 dark:hover:text-slate-300
                             transition-colors rounded
                             focus-visible:ring-2 focus-visible:ring-alzak-blue/40"
                >
                  {showPassword ? (
                    <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Olvidé contraseña */}
            <div className="flex justify-end mt-2">
              <a
                href="/reset-password"
                className="text-[0.73rem] font-medium
                           text-alzak-blue/60 dark:text-alzak-gold/60
                           hover:text-alzak-blue dark:hover:text-alzak-gold
                           transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Error animado */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                error ? 'max-h-20 opacity-100 mt-3' : 'max-h-0 opacity-0'
              }`}
            >
              {error && (
                <div
                  id="login-error"
                  role="alert"
                  className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl
                             bg-red-50 dark:bg-red-950/40
                             border border-red-200/80 dark:border-red-800/40"
                >
                  <svg className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-[0.78rem] text-red-600 dark:text-red-400 font-medium leading-snug">{error}</p>
                </div>
              )}
            </div>

            {/* Botón */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                           bg-alzak-blue dark:bg-alzak-gold
                           text-white dark:text-alzak-dark
                           font-semibold text-[0.88rem] tracking-wide
                           shadow-md hover:shadow-lg hover:opacity-90
                           active:scale-[0.985] transition-all duration-150
                           disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verificando credenciales…
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </div>

          </form>

          {/* Footer */}
          <div className="mt-7 pt-5 border-t border-slate-200/60 dark:border-slate-700/40 text-center">
            <p className="text-[0.68rem] text-slate-400 dark:text-slate-600 tracking-wide">
              © 2026 Alzak Foundation · Gestión de Proyectos
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
