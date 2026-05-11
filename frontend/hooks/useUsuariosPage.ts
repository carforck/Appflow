"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter }   from 'next/navigation';
import { useAuth }     from '@/context/AuthContext';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useToast }    from '@/components/Toast';
import { authFetch }   from '@/lib/api';
import type { MockUser } from '@/lib/mockData';
import type { UserRole } from '@/context/AuthContext';
import type { UserForm } from '@/components/usuarios/userConstants';

export function useUsuariosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Guard: solo admin+
  useEffect(() => {
    if (!isLoading && user && user.role === 'user') router.replace('/dashboard');
  }, [user, isLoading, router]);

  const { users: apiUsers, loading: usersLoading, error: usersError, refresh: refreshUsers } = useUsuarios();
  const { addToast } = useToast();

  // Copia local para mutaciones optimistas (edit/toggle)
  const [users, setUsers] = useState<MockUser[]>([]);
  useEffect(() => { setUsers(apiUsers); }, [apiUsers]);

  const [search,       setSearch]       = useState('');
  const [filterRole,   setFilterRole]   = useState<UserRole | 'Todos'>('Todos');
  const [filterActivo, setFilterActivo] = useState<'Todos' | 'Activos' | 'Inactivos'>('Todos');
  // undefined = cerrado, null = crear nuevo, MockUser = editar
  const [modalUser, setModalUser] = useState<MockUser | null | undefined>(undefined);

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin';

  const filtered = useMemo(() =>
    users
      .filter((u) => filterRole   === 'Todos' || u.role === filterRole)
      .filter((u) => filterActivo === 'Todos' || (filterActivo === 'Activos' ? u.activo : !u.activo))
      .filter((u) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return u.nombre_completo.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
      }),
    [users, filterRole, filterActivo, search],
  );

  const stats = useMemo(() => ({
    total:   users.length,
    activos: users.filter((u) => u.activo).length,
    admins:  users.filter((u) => u.role !== 'user').length,
  }), [users]);

  const existingEmails = users.map((u) => u.correo);

  const handleSave = (data: UserForm) => {
    if (modalUser) {
      setUsers((prev) => prev.map((u) => (u.correo === data.correo ? (data as MockUser) : u)));
    } else {
      setUsers((prev) => [...prev, data as MockUser]);
    }
    setModalUser(undefined);
  };

  const handleToggleActivo = async (correo: string) => {
    const prev = users.find((u) => u.correo === correo);
    if (!prev) return;

    // Optimistic update
    setUsers((list) => list.map((u) => (u.correo === correo ? { ...u, activo: !u.activo } : u)));

    try {
      const res = await authFetch(`/users/${encodeURIComponent(correo)}/activo`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Revertir si falló
        setUsers((list) => list.map((u) => (u.correo === correo ? { ...u, activo: prev.activo } : u)));
        addToast(data.error ?? 'Error al cambiar estado del usuario', 'error');
        return;
      }
      const data = await res.json() as { activo: boolean };
      addToast(
        data.activo ? 'Usuario habilitado correctamente' : 'Usuario inhabilitado. Su sesión fue cerrada.',
        data.activo ? 'success' : 'info',
      );
    } catch {
      setUsers((list) => list.map((u) => (u.correo === correo ? { ...u, activo: prev.activo } : u)));
      addToast('Error de conexión al cambiar estado', 'error');
    }
  };

  const handleDelete = async (correo: string) => {
    try {
      const res = await authFetch(`/users/${encodeURIComponent(correo)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error ?? 'Error al eliminar usuario', 'error');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.correo !== correo));
      addToast('Usuario eliminado correctamente', 'success');
    } catch {
      addToast('Error de conexión al eliminar usuario', 'error');
    }
  };

  const isRedirecting = !isLoading && !!user && user.role === 'user';

  return {
    // Status
    isLoading, isRedirecting, usersLoading, usersError, refreshUsers,
    // Data
    user, filtered, stats, existingEmails, canEdit,
    // Filters
    search, setSearch,
    filterRole, setFilterRole,
    filterActivo, setFilterActivo,
    // Modal
    modalUser, setModalUser,
    // Handlers
    handleSave, handleToggleActivo, handleDelete,
  };
}
