import { Card } from '@/shared/components/Card';
import { cn } from '@/shared/utils/cn';

type MetricTone = 'success' | 'warning' | 'danger' | 'accent' | 'neutral';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  tone?: MetricTone;
  onClick?: () => void;
}

const toneStyles: Record<MetricTone, string> = {
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  accent: 'bg-accent-50 text-accent-700',
  neutral: 'bg-neutral-50 text-neutral-700',
};

export function MetricCard({ label, value, subValue, tone = 'neutral', onClick }: MetricCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(toneStyles[tone], onClick && 'cursor-pointer active:opacity-80')}
    >
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {subValue && <p className="mt-0.5 text-xs opacity-70">{subValue}</p>}
    </Card>
  );
}
