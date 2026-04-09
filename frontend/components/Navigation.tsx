"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';

// ── Iconos inline (sin dependencias externas) ──────────────────────────────
const Icon = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  tasks: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

type IconKey = keyof typeof Icon;

const BASE_ITEMS: { href: string; label: string; icon: IconKey }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/procesador', label: 'Procesador', icon: 'sparkles' },
  { href: '/tareas', label: 'Tareas', icon: 'tasks' },
];

const ADMIN_ITEMS: { href: string; label: string; icon: IconKey }[] = [
  { href: '/admin', label: 'Admin', icon: 'settings' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const items = user?.role === 'admin' ? [...BASE_ITEMS, ...ADMIN_ITEMS] : BASE_ITEMS;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* ═══════════════════════════════════════════
          DESKTOP — Sidebar izquierdo
      ════════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col py-6 px-4 z-40 border-r border-slate-200/60 dark:border-white/5"
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(24px)' }}
      >
        {/* Logo */}
        <div className="px-2 mb-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark font-bold text-sm shadow-md">
            AF
          </div>
          <div>
            <p className="font-bold text-alzak-blue dark:text-white text-sm leading-tight">Alzak Flow</p>
            <p className="text-[10px] text-slate-400">v1.0 · Alzak Foundation</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {Icon[item.icon]}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer: usuario + tema + logout */}
        <div className="pt-4 space-y-3 border-t border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 shrink-0 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/20 flex items-center justify-center text-alzak-blue dark:text-alzak-gold text-xs font-bold">
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {user?.name}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[14px] text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
          >
            {Icon.logout}
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
          MOBILE — Bottom Tab Bar
      ════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/60 dark:border-white/5"
        style={{
          background: 'var(--bottom-bar)',
          backdropFilter: 'blur(24px)',
          paddingTop: '10px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-[14px] transition-all duration-200 ${
              isActive(item.href)
                ? 'text-alzak-blue dark:text-alzak-gold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10'
                  : ''
              }`}
            >
              {Icon[item.icon]}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
