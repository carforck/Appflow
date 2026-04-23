"use client";

import { useState, useRef, useCallback } from 'react';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import type { TareaStatus } from '@/lib/mockData';
import { STATUS_CFG, ALL_STATUSES } from './taskBoardConfig';

interface MenuState { open: boolean; top: number; right: number }
const CLOSED: MenuState = { open: false, top: 0, right: 0 };

export function StatusChip({ task }: { task: TaskWithMeta }) {
  const { updateStatus } = useTaskStore();
  const [menu, setMenu]  = useState<MenuState>(CLOSED);
  const btnRef           = useRef<HTMLButtonElement>(null);

  // Batch pos + open en un solo setState → sin render intermedio
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (menu.open) {
      setMenu(CLOSED);
      return;
    }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Evitar que el menú salga por la derecha en móvil
      const right = Math.max(4, window.innerWidth - r.right);
      setMenu({ open: true, top: r.bottom + 6, right });
    }
  }, [menu.open]);

  const handleSelect = useCallback((e: React.MouseEvent, s: TareaStatus) => {
    e.stopPropagation();
    updateStatus(task.id, s);
    setMenu(CLOSED);
  }, [task.id, updateStatus]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        aria-label="Cambiar estado"
        aria-expanded={menu.open}
        aria-haspopup="listbox"
        className="text-[9px] font-bold px-2 py-1 rounded-full bg-white/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-600/60 focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
      >
        {STATUS_CFG[task.status].icon}
      </button>

      {/* Backdrop — fixed, fuera del card DOM */}
      {menu.open && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={(e) => { e.stopPropagation(); setMenu(CLOSED); }}
          aria-hidden
        />
      )}

      {/* Dropdown — always fixed, no afecta layout de la tarjeta
          Transición CSS pura: opacity + scale, sin bloquear hilo React */}
      <div
        role="listbox"
        aria-label="Cambiar estado"
        style={{ top: menu.top, right: menu.right }}
        className={`fixed z-[9999] bg-white dark:bg-slate-800 rounded-[14px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[148px] origin-top-right transition-[opacity,transform] duration-100 ${
          menu.open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {ALL_STATUSES.map((s: TareaStatus) => (
          <button
            key={s}
            role="option"
            aria-selected={task.status === s}
            onClick={(e) => handleSelect(e, s)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${
              task.status === s
                ? 'font-bold text-alzak-blue dark:text-alzak-gold bg-alzak-blue/5 dark:bg-alzak-gold/10'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            <span className="text-sm leading-none">{STATUS_CFG[s].icon}</span>
            {STATUS_CFG[s].label}
            {task.status === s && (
              <span className="ml-auto text-[9px] font-bold text-alzak-blue dark:text-alzak-gold">✓</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
