"use client";

import { useRef, useState, useEffect } from 'react';
import { Input }  from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  type ProjectStatus,
  type ProjectFormData,
} from '@/schemas/proyecto';

const STATUSES: ProjectStatus[] = ['Activo', 'Cerrado'];

interface ProjectFormProps {
  form:          ProjectFormData;
  fieldErrors:   Record<string, string>;
  isEditing:     boolean;
  isLoading?:    boolean;
  empresas?:     string[];
  financiadores?: string[];
  onPatch:       (patch: Partial<ProjectFormData>) => void;
  onSubmit:      (e: React.FormEvent) => void;
  onCancel:      () => void;
}

interface ComboFieldProps {
  id:          string;
  label:       string;
  value:       string;
  options:     string[];
  placeholder: string;
  onChange:    (val: string) => void;
}

function ComboField({ id, label, value, options, placeholder, onChange }: ComboFieldProps) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState(value);
  const ref                   = useRef<HTMLDivElement>(null);

  // Sincronizar query cuando el form se resetea
  useEffect(() => { setQuery(value); }, [value]);

  // Cerrar al clic afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);
    setOpen(true);
  };

  const select = (opt: string) => {
    setQuery(opt);
    onChange(opt);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => handleInput(e.target.value)}
          className="w-full px-4 py-2.5 pr-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 text-sm transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label="Ver opciones"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-y-auto max-h-44 kanban-scroll"
        >
          {filtered.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === query}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                opt === query
                  ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold font-semibold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProjectForm({
  form, fieldErrors, isEditing, isLoading = false,
  empresas = [], financiadores = [],
  onPatch, onSubmit, onCancel,
}: ProjectFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="px-6 py-5 space-y-4">
      <Input
        label="Código"
        id="id_proyecto"
        value={form.id_proyecto}
        onChange={(e) => onPatch({ id_proyecto: e.target.value })}
        disabled={isEditing}
        placeholder="Ej. BAY-001"
        error={fieldErrors.id_proyecto}
        required
      />

      <Input
        label="Nombre"
        id="nombre_proyecto"
        value={form.nombre_proyecto}
        onChange={(e) => onPatch({ nombre_proyecto: e.target.value })}
        placeholder="Nombre descriptivo del proyecto"
        error={fieldErrors.nombre_proyecto}
        required
      />

      <ComboField
        id="empresa"
        label="Empresa"
        value={form.empresa ?? ''}
        options={empresas}
        placeholder="Ej. ALZAK Foundation"
        onChange={(v) => onPatch({ empresa: v })}
      />

      <ComboField
        id="financiador"
        label="Financiador"
        value={form.financiador ?? ''}
        options={financiadores}
        placeholder="Ej. Bayer, Pfizer, Minciencias…"
        onChange={(v) => onPatch({ financiador: v })}
      />

      {/* Selector de estado */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estado</p>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPatch({ estado: s })}
              className={[
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2',
                form.estado === s
                  ? `${STATUS_COLOR[s]} border-transparent ring-2 ring-offset-1 ring-alzak-blue/20`
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300',
              ].join(' ')}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 py-2">
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="flex-1 py-2 flex items-center justify-center gap-2"
        >
          {isLoading && (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isLoading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
        </Button>
      </div>
    </form>
  );
}
