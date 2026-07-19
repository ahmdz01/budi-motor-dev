import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Varian tombol mengikuti prinsip "tombol besar, warna sebagai bahasa
 * visual" dari Design System kita:
 * - primary: aksi utama (Bayar, Simpan) — 1 per layar idealnya
 * - secondary: aksi kedua (Batal, Kembali)
 * - danger: aksi merusak/menghapus (Nonaktifkan Barang)
 * - ghost: aksi ringan, tidak menonjol (link dalam card)
 */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-700',
  secondary: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:bg-neutral-200',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700',
  ghost: 'bg-transparent text-accent-600 hover:bg-accent-50',
};

const sizeStyles: Record<ButtonSize, string> = {
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'lg', // default besar — sesuai prinsip "tombol besar" untuk POS/Servis
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? 'Memproses...' : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
