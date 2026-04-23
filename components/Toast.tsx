"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ addToast: () => {} });

const TOAST_STYLE: Record<ToastType, string> = {
  success: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100',
  info:    'bg-blue-50    dark:bg-blue-900/40    border-blue-300    dark:border-blue-700    text-blue-800    dark:text-blue-100',
  warning: 'bg-amber-50   dark:bg-amber-900/40   border-amber-300   dark:border-amber-700   text-amber-800   dark:text-amber-100',
  error:   'bg-red-50     dark:bg-red-900/40     border-red-300     dark:border-red-700     text-red-800     dark:text-red-100',
};
const TOAST_ICON: Record<ToastType, string> = {
  success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Fixed container — above mobile bottom bar on small screens */}
      <div
        aria-live="polite"
        className="fixed bottom-24 lg:bottom-5 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-[16px] border shadow-xl text-sm font-medium pointer-events-auto backdrop-blur-sm ${TOAST_STYLE[t.type]}`}
          >
            <span className="text-base shrink-0 mt-0.5">{TOAST_ICON[t.type]}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
