"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { TaskStoreProvider } from '@/context/TaskStoreContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ProjectStoreProvider } from '@/context/ProjectStoreContext';
import { ToastProvider } from '@/components/Toast';
import { StagingProvider } from '@/context/StagingContext';
import { UserStoreProvider } from '@/context/UserStoreContext';
import Navigation from '@/components/Navigation';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navigation />
      <main
        className={`transition-all duration-300 pt-14 lg:pt-0 pb-28 lg:pb-10 min-h-screen ${
          collapsed ? 'lg:ml-[68px]' : 'lg:ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-alzak-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <NotificationProvider>
      <ProjectStoreProvider>
        <TaskStoreProvider>
          <UserStoreProvider>
            <StagingProvider>
              <SidebarProvider>
                <ToastProvider>
                  <DashboardContent>{children}</DashboardContent>
                </ToastProvider>
              </SidebarProvider>
            </StagingProvider>
          </UserStoreProvider>
        </TaskStoreProvider>
      </ProjectStoreProvider>
    </NotificationProvider>
  );
}
