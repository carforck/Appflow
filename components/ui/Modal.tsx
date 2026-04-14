"use client";

import { type ReactNode } from 'react';

interface ModalProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass w-full max-w-md rounded-[24px] shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <h2 id="modal-title" className="font-bold text-sm text-slate-800 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 text-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
