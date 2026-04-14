import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label:    string;
  error?:   string;
}

export function Input({ label, error, required, id, className, ...props }: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>

      <input
        id={inputId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
        className={[
          'w-full text-sm px-3 py-2 rounded-xl border',
          'bg-white dark:bg-slate-800',
          'text-slate-800 dark:text-white placeholder-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-alzak-blue/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          error
            ? 'border-red-400 dark:border-red-500'
            : 'border-slate-200 dark:border-slate-700',
          className ?? '',
        ].join(' ')}
      />

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-[11px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
