import { type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize    = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-alzak-blue text-white hover:bg-alzak-blue/90 shadow-md',
  secondary: 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
  ghost:     'text-alzak-blue dark:text-alzak-gold hover:underline',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  variant = 'primary',
  size    = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'font-bold rounded-xl transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
