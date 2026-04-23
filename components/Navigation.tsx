"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useNotifications } from '@/context/NotificationContext';
import ThemeToggle from './ThemeToggle';
import NotificationPanel from './NotificationPanel';
import { useTaskStore } from '@/context/TaskStoreContext';
import { useToast } from '@/components/Toast';

// ── Iconos SVG inline ──────────────────────────────────────────────────────────
const Icon = {
  home: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  tasks: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  projects: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  notes: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l2 2 4-4" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

type IconKey = keyof typeof Icon;

interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
  minRole?: UserRole;
}

const ROLE_RANK: Record<UserRole, number> = { superadmin: 3, admin: 2, user: 1 };

const hasAccess = (userRole: UserRole, minRole?: UserRole) => {
  if (!minRole) return true;
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',  icon: 'home'      },
  { href: '/procesador', label: 'Procesador', icon: 'sparkles',  minRole: 'admin' },
  { href: '/revision',   label: 'Revisión',   icon: 'clipboard', minRole: 'admin' },
  { href: '/tareas',     label: 'Tareas',     icon: 'tasks'     },
  { href: '/proyectos',  label: 'Proyectos',  icon: 'projects',  minRole: 'admin' },
  { href: '/notas',      label: 'Notas',      icon: 'notes'     },
  { href: '/usuarios',   label: 'Usuarios',   icon: 'users',     minRole: 'admin' },
  { href: '/admin/logs', label: 'Logs',       icon: 'shield',    minRole: 'superadmin' },
];

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  admin:      'bg-alzak-blue/10 text-alzak-blue dark:bg-alzak-gold/10 dark:text-alzak-gold',
  user:       'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
};

export default function Navigation() {
  const pathname            = usePathname();
  const router              = useRouter();
  const { user, logout }    = useAuth();
  const { collapsed, toggle, mobileOpen, toggleMobile, closeMobile } = useSidebar();
  const { unreadCount }     = useNotifications();
  const { revisionCount, newIngestedFiles, clearNewIngestedFiles } = useTaskStore();
  const { addToast }        = useToast();
  const [notifOpen, setNotifOpen] = useState(false);

  // Toast de auditoría: nueva minuta de Drive procesada
  useEffect(() => {
    if (newIngestedFiles.length === 0) return;
    newIngestedFiles.forEach((file) => {
      addToast(`Nueva minuta de "${file}" lista para pre-aprobación`, 'info');
    });
    clearNewIngestedFiles();
  }, [newIngestedFiles, addToast, clearNewIngestedFiles]);

  // Toasts globales para eventos de cuenta (emitidos desde AuthContext via CustomEvent)
  useEffect(() => {
    const handleForceLogout = () => {
      addToast('Tu cuenta ha sido desactivada. Sesión cerrada.', 'error');
      setTimeout(() => router.push('/login'), 1500);
    };
    const handleRoleChanged = (e: Event) => {
      const { role } = (e as CustomEvent<{ role: string }>).detail;
      addToast(`Tu rol ha sido actualizado a "${role}". La sesión se actualizará.`, 'info');
    };
    window.addEventListener('alzak:force_logout',  handleForceLogout);
    window.addEventListener('alzak:role_changed',  handleRoleChanged);
    return () => {
      window.removeEventListener('alzak:force_logout', handleForceLogout);
      window.removeEventListener('alzak:role_changed', handleRoleChanged);
    };
  }, [addToast, router]);

  const navItems = user
    ? ALL_NAV_ITEMS.filter((item) => hasAccess(user.role, item.minRole))
    : [];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.nombre
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U';

  // Nav list shared between desktop and mobile drawer
  const NavList = ({ onItemClick, forceExpanded }: { onItemClick?: () => void; forceExpanded?: boolean }) => (
    <nav className="flex-1 space-y-0.5">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const showLabel = forceExpanded || !collapsed;
        const badge = item.href === '/revision' && revisionCount > 0 ? revisionCount : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            title={collapsed && !forceExpanded ? item.label : undefined}
            className={`flex items-center gap-3 rounded-[12px] text-sm font-medium transition-all duration-150 ${
              collapsed && !forceExpanded ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
            } ${
              active
                ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="relative shrink-0">
              {Icon[item.icon]}
              {badge && collapsed && !forceExpanded && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-violet-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </span>
            {showLabel && <span className="truncate flex-1">{item.label}</span>}
            {showLabel && badge && (
              <span className="ml-auto min-w-[20px] h-5 px-1 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP — Sidebar colapsable
      ════════════════════════════════════════════════════════════════ */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full flex-col py-5 z-40 border-r border-slate-200/70 dark:border-white/5 shadow-sm transition-all duration-300 ${
          collapsed ? 'w-[68px] px-3' : 'w-64 px-4'
        }`}
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(20px)' }}
      >
        {/* ── Logo + Toggle ── */}
        <div className={`mb-8 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-[10px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark font-bold text-xs shadow">
                AF
              </div>
              <div className="min-w-0">
                <p className="font-bold text-alzak-blue dark:text-white text-sm leading-tight truncate">Alzak Flow</p>
                <p className="text-[10px] text-slate-400 leading-tight">v1.0 · Foundation</p>
              </div>
            </div>
          )}
          <button
            onClick={toggle}
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? Icon.chevronRight : Icon.chevronLeft}
          </button>
        </div>

        {/* ── Collapsed: mini logo ── */}
        {collapsed && (
          <div className="mb-6 flex justify-center">
            <div className="w-8 h-8 rounded-[10px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark font-bold text-xs shadow">
              AF
            </div>
          </div>
        )}

        {/* ── Sección / label ── */}
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-2 mb-2">
            Menú
          </p>
        )}

        {/* ── Nav items ── */}
        <NavList />

        {/* ── Footer: notificaciones + usuario ── */}
        <div className={`pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2`}>
          {/* Bell de notificaciones */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              title="Notificaciones"
              className={`w-full flex items-center gap-3 rounded-[12px] text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
              }`}
            >
              <div className="relative shrink-0">
                {Icon.bell}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span>Notificaciones</span>}
            </button>
            {/* Desktop: aparece a la derecha del sidebar */}
            {notifOpen && (
              <div className="absolute left-full bottom-0 ml-3 z-[60]">
                <NotificationPanel onClose={() => setNotifOpen(false)} />
              </div>
            )}
          </div>

          {/* Perfil de usuario */}
          {!collapsed && (
            <div className="px-1 flex items-center justify-between">
              <Link
                href="/perfil"
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              >
                <div className="w-7 h-7 shrink-0 rounded-full bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-[10px] font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {user?.nombre}
                  </p>
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ROLE_BADGE[user?.role ?? 'user']}`}>
                    {user?.role}
                  </span>
                </div>
              </Link>
              <ThemeToggle />
            </div>
          )}

          {collapsed && (
            <Link
              href="/perfil"
              className="flex justify-center mb-1"
              title={user?.nombre}
            >
              <div className="w-7 h-7 rounded-full bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-[10px] font-bold hover:opacity-80 transition-opacity">
                {initials}
              </div>
            </Link>
          )}

          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={`w-full flex items-center gap-2 rounded-[12px] text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors ${
              collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'
            }`}
          >
            {Icon.logout}
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE — Top bar con hamburger + título + bell + avatar
      ════════════════════════════════════════════════════════════════ */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b border-slate-200/60 dark:border-white/5"
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(20px)' }}
      >
        <button
          onClick={toggleMobile}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {mobileOpen ? Icon.close : Icon.menu}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[8px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark font-bold text-[10px]">AF</div>
          <span className="font-bold text-alzak-blue dark:text-white text-sm">Alzak Flow</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Bell mobile */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="relative">
                {Icon.bell}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
            {/* Mobile: fixed debajo del header */}
            {notifOpen && (
              <div className="fixed top-14 right-4 z-[90]">
                <NotificationPanel onClose={() => setNotifOpen(false)} />
              </div>
            )}
          </div>
          {/* Avatar → perfil */}
          <Link href="/perfil" className="w-9 h-9 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-[10px] font-bold">
              {initials}
            </div>
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE — Drawer (cubre pantalla completa desde la izquierda)
      ════════════════════════════════════════════════════════════════ */}
      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={closeMobile}
        />
      )}
      {/* Drawer panel */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-[60] flex flex-col py-5 px-4 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark font-bold text-xs shadow">AF</div>
            <div>
              <p className="font-bold text-alzak-blue dark:text-white text-sm leading-tight">Alzak Flow</p>
              <p className="text-[10px] text-slate-400 leading-tight">v1.0 · Foundation</p>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {Icon.close}
          </button>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-2 mb-2">Menú</p>

        {/* Nav items en drawer (sin collapsed) */}
        <div className="flex-1 overflow-y-auto kanban-scroll">
          <NavList onItemClick={closeMobile} forceExpanded />
        </div>

        {/* Footer drawer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
          <Link
            href="/perfil"
            onClick={closeMobile}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 shrink-0 rounded-full bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-[10px] font-bold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.nombre}</p>
              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ROLE_BADGE[user?.role ?? 'user']}`}>
                {user?.role}
              </span>
            </div>
            <ThemeToggle />
          </Link>
          <button
            onClick={() => { closeMobile(); handleLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
          >
            {Icon.logout}
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE — Bottom Tab Bar (primeros 5 items)
      ════════════════════════════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/60 dark:border-white/5"
        style={{
          background: 'var(--bottom-bar)',
          backdropFilter: 'blur(20px)',
          paddingTop: '10px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-[12px] transition-colors ${
              isActive(item.href)
                ? 'text-alzak-blue dark:text-alzak-gold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive(item.href) ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10' : ''}`}>
              {Icon[item.icon]}
            </div>
            <span className="text-[9px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
