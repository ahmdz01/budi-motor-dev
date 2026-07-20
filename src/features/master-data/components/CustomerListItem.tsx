import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import type { Customer } from '../types';

const typeLabel: Record<Customer['customer_type'], string> = {
  general: 'Umum',
  service: 'Servis',
  workshop: 'Bengkel',
};

export function CustomerListItem({ customer }: { customer: Customer }) {
  return (
    <Link href={`/customers/${customer.id}`}>
      <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">{customer.name}</p>
          <p className="text-xs text-neutral-500">{customer.phone_number}</p>
        </div>
        <Badge variant="accent">{typeLabel[customer.customer_type]}</Badge>
      </Card>
    </Link>
  );
}