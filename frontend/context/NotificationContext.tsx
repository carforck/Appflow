"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MOCK_NOTIFICATIONS, MockNotification } from '@/lib/mockData';

interface NotificationCtx {
  notifications: MockNotification[];
  unreadCount:   number;
  markRead:      (id: number) => void;
  markAllRead:   () => void;
  addNotification: (n: Omit<MockNotification, 'id' | 'leido' | 'timestamp'>) => void;
}

const NotificationContext = createContext<NotificationCtx>({
  notifications:   [],
  unreadCount:     0,
  markRead:        () => {},
  markAllRead:     () => {},
  addNotification: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<MockNotification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.leido).length;

  const markRead = useCallback((id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, leido: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leido: true })));
  }, []);

  const addNotification = useCallback(
    (n: Omit<MockNotification, 'id' | 'leido' | 'timestamp'>) => {
      setNotifications((prev) => [
        {
          ...n,
          id:        Date.now(),
          leido:     false,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [],
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, addNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
