import { Card } from '@/shared/components/Card';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import type { ServiceListItem as ServiceListItemType } from '../types';

function formatVehicleLabel(item: ServiceListItemType): string {
  const parts = [item.motor_brand, item.motor_model].filter(Boolean);
  const model = parts.join(' ');

  if (item.police_plate && model) return `${item.police_plate} · ${model}`;
  if (item.police_plate) return item.police_plate;
  if (model) return model;
  return 'Tanpa data kendaraan';
}

export function ServiceListItem({ service }: { service: ServiceListItemType }) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-neutral-900">{service.customer_name}</p>
          <p className="text-xs text-neutral-500">{formatVehicleLabel(service)}</p>
        </div>
        <ServiceStatusBadge status={service.status} />
      </div>
      <p className="line-clamp-2 text-sm text-neutral-600">{service.complaint}</p>
      {service.is_warranty_claim && (
        <span className="text-warning-700 text-xs font-medium">Klaim Garansi</span>
      )}
    </Card>
  );
}