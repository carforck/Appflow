"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MOCK_PROJECTS_FULL, MockProject } from '@/lib/mockData';

interface ProjectStoreCtx {
  projects:      MockProject[];
  createProject: (p: MockProject) => void;
  updateProject: (id: string, updates: Partial<Omit<MockProject, 'id_proyecto'>>) => void;
}

const ProjectStoreContext = createContext<ProjectStoreCtx>({
  projects:      [],
  createProject: () => {},
  updateProject: () => {},
});

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<MockProject[]>(MOCK_PROJECTS_FULL);

  const createProject = useCallback((p: MockProject) => {
    setProjects((prev) => [p, ...prev]);
  }, []);

  const updateProject = useCallback(
    (id: string, updates: Partial<Omit<MockProject, 'id_proyecto'>>) => {
      setProjects((prev) =>
        prev.map((p) => (p.id_proyecto === id ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  return (
    <ProjectStoreContext.Provider value={{ projects, createProject, updateProject }}>
      {children}
    </ProjectStoreContext.Provider>
  );
}

export const useProjectStore = () => useContext(ProjectStoreContext);
