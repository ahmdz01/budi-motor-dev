import { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Badge status — penerapan langsung prinsip "warna sebagai bahasa
 * visual utama" dari Design System kita. Dipakai luas: status servis,
 * status hutang, status stok, dll.
 */
type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  neutral: 'bg-neutral-100 text-neutral-700',
  accent: 'bg-accent-100 text-accent-700',
};

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
