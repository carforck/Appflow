"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import { MOCK_USERS, MockUser } from '@/lib/mockData';

// ── Estilos por rol ────────────────────────────────────────────────────────────
const ROLE_CFG: Record<UserRole, { label: string; cls: string }> = {
  superadmin: { label: 'Superadmin', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  admin:      { label: 'Admin',      cls: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   },
  user:       { label: 'Investigador', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300'   },
};

// ── Switch component ───────────────────────────────────────────────────────────
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────
interface UserForm {
  correo: string;
  nombre_completo: string;
  role: UserRole;
  activo: boolean;
}

const EMPTY_FORM: UserForm = {
  correo: '',
  nombre_completo: '',
  role: 'user',
  activo: true,
};

interface FormModalProps {
  initial: UserForm | null;  // null = crear nuevo
  existingEmails: string[];
  onSave: (data: UserForm) => void;
  onClose: () => void;
}

function FormModal({ initial, existingEmails, onSave, onClose }: FormModalProps) {
  const isEdit = initial !== null;
  const [form, setForm] = useState<UserForm>(initial ?? EMPTY_FORM);
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
      <div
        className="w-full max-w-md glass rounded-[24px] shadow-2xl overflow-hidden"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60">
          <h2 className="font-bold text-slate-800 dark:text-white">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Nombre completo
            </label>
            <input
              type="text"
              value={form.nombre_completo}
              onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
              placeholder="Nombre Apellido"
              className="w-full px-4 py-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm transition-all"
            />
            {errors.nombre_completo && <p className="text-xs text-red-500 mt-1">{errors.nombre_completo}</p>}
          </div>

          {/* Correo */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Correo institucional
            </label>
            <input
              type="email"
              value={form.correo}
              onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              placeholder="nombre@alzak.org"
              disabled={isEdit}
              className="w-full px-4 py-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {errors.correo && <p className="text-xs text-red-500 mt-1">{errors.correo}</p>}
          </div>

          {/* Rol */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Rol
            </label>
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
            <Switch checked={form.activo} onChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-[12px] text-sm font-bold bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── User Card ──────────────────────────────────────────────────────────────────
function UserCard({
  u,
  canEdit,
  onEdit,
  onToggle,
}: {
  u: MockUser;
  canEdit: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const rcfg = ROLE_CFG[u.role];
  const initials = u.nombre_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div className={`flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-[16px] border transition-all ${
      u.activo
        ? 'border-slate-100 dark:border-slate-700/50 shadow-sm'
        : 'border-slate-100 dark:border-slate-700/30 opacity-60'
    }`}>
      {/* Avatar */}
      <div className="w-9 h-9 shrink-0 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-xs font-bold text-alzak-blue dark:text-alzak-gold">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{u.nombre_completo}</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rcfg.cls}`}>{rcfg.label}</span>
          {!u.activo && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              Inactivo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate">{u.correo}</p>
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={u.activo} onChange={onToggle} />
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-alzak-blue dark:hover:text-alzak-gold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Editar usuario"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Guard: solo admin+
  useEffect(() => {
    if (!isLoading && user && user.role === 'user') router.replace('/dashboard');
  }, [user, isLoading, router]);

  const [users, setUsers]           = useState<MockUser[]>(MOCK_USERS);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'Todos'>('Todos');
  const [filterActivo, setFilterActivo] = useState<'Todos' | 'Activos' | 'Inactivos'>('Todos');
  const [modalUser, setModalUser]   = useState<MockUser | null | undefined>(undefined); // undefined = cerrado

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin';

  // Filtrar
  const filtered = useMemo(() => {
    return users
      .filter((u) => filterRole === 'Todos' || u.role === filterRole)
      .filter((u) => filterActivo === 'Todos' || (filterActivo === 'Activos' ? u.activo : !u.activo))
      .filter((u) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return u.nombre_completo.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
      });
  }, [users, filterRole, filterActivo, search]);

  const handleSave = (data: MockUser) => {
    if (modalUser) {
      // Editar
      setUsers((prev) => prev.map((u) => (u.correo === data.correo ? data : u)));
    } else {
      // Crear
      setUsers((prev) => [...prev, data]);
    }
    setModalUser(undefined);
  };

  const handleToggleActivo = (correo: string) => {
    setUsers((prev) => prev.map((u) => (u.correo === correo ? { ...u, activo: !u.activo } : u)));
  };

  const existingEmails = users.map((u) => u.correo);

  const stats = {
    total:    users.length,
    activos:  users.filter((u) => u.activo).length,
    admins:   users.filter((u) => u.role !== 'user').length,
  };

  if (isLoading || !user || user.role === 'user') return null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Usuarios</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {stats.activos} activos · {stats.total - stats.activos} inactivos · {stats.admins} con roles elevados
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setModalUser(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark text-xs font-bold rounded-[12px] hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo usuario
          </button>
        )}
      </div>

      {/* ── Stats rápidos ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-[16px] p-4 text-center">
          <p className="text-2xl font-bold text-alzak-blue dark:text-alzak-gold">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total</p>
        </div>
        <div className="glass rounded-[16px] p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activos}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Activos</p>
        </div>
        <div className="glass rounded-[16px] p-4 text-center">
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.admins}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Con acceso</p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30"
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filtro rol */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'Todos')}
          className="px-3 py-2 text-xs rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30"
        >
          <option value="Todos">Todos los roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="user">Investigador</option>
        </select>

        {/* Filtro activo */}
        <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-[12px]">
          {(['Todos', 'Activos', 'Inactivos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActivo(f)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                filterActivo === f
                  ? 'bg-white dark:bg-slate-700 text-alzak-blue dark:text-alzak-gold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="glass rounded-[20px] p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-3xl">👥</p>
            <p className="text-sm text-slate-400">Sin usuarios para este filtro</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <UserCard
                key={u.correo}
                u={u}
                canEdit={canEdit}
                onEdit={() => setModalUser(u)}
                onToggle={() => handleToggleActivo(u.correo)}
              />
            ))}
          </div>
        )}
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-3">
          {filtered.length} de {users.length} usuarios
        </p>
      </div>

      {/* ── Modal create/edit ── */}
      {modalUser !== undefined && (
        <FormModal
          initial={modalUser ? { correo: modalUser.correo, nombre_completo: modalUser.nombre_completo, role: modalUser.role, activo: modalUser.activo } : null}
          existingEmails={existingEmails}
          onSave={handleSave}
          onClose={() => setModalUser(undefined)}
        />
      )}
    </div>
  );
}
