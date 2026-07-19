import { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-neutral-200 bg-white p-4 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
