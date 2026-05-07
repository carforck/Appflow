"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { authFetch } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import type { MockProject } from '@/lib/mockData';

// Re-exportamos MockProject como alias semántico mientras se unifica la tipología
export type Project = MockProject;

interface ProjectStoreCtx {
  projects:      Project[];
  loading:       boolean;
  error:         string | null;
  createProject: (p: Omit<Project, never>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id_proyecto'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refresh:       () => Promise<void>;
}

const ProjectStoreContext = createContext<ProjectStoreCtx>({
  projects:      [],
  loading:       false,
  error:         null,
  createProject: async () => {},
  updateProject: async () => {},
  deleteProject: async () => {},
  refresh:       async () => {},
});

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // ── Cargar proyectos desde la API ────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/projects');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ ProjectStore: error cargando proyectos —', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Sincronización en tiempo real: cualquier mutación de proyecto emite project_changed
  useEffect(() => {
    if (!socket) return;
    socket.on('project_changed', refresh);
    return () => { socket.off('project_changed', refresh); };
  }, [socket, refresh]);

  // ── Crear proyecto via API ───────────────────────────────────────────────
  const createProject = useCallback(async (p: Project) => {
    const res = await authFetch('/api/projects', {
      method:  'POST',
      body:    JSON.stringify(p),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    const { project } = await res.json();
    setProjects((prev) => [project, ...prev]);
  }, []);

  // ── Actualizar proyecto via API ──────────────────────────────────────────
  const updateProject = useCallback(async (
    id: string,
    updates: Partial<Omit<Project, 'id_proyecto'>>,
  ) => {
    const res = await authFetch(`/api/projects/${id}`, {
      method: 'PUT',
      body:   JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    const { project } = await res.json();
    setProjects((prev) =>
      prev.map((p) => (p.id_proyecto === id ? project : p))
    );
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const res = await authFetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    setProjects((prev) => prev.filter((p) => p.id_proyecto !== id));
  }, []);

  return (
    <ProjectStoreContext.Provider
      value={{ projects, loading, error, createProject, updateProject, deleteProject, refresh }}
    >
      {children}
    </ProjectStoreContext.Provider>
  );
}

export const useProjectStore = () => useContext(ProjectStoreContext);
