import { Card } from '@/shared/components/Card';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import type { ServiceDetail } from '../types';

const customerTypeLabel: Record<ServiceDetail['customer_type_used'], string> = {
  general: 'Umum',
  service: 'Servis',
  workshop: 'Bengkel',
};

export function ServiceDetailHeader({ service }: { service: ServiceDetail }) {
  const vehicleParts = [service.motor_brand, service.motor_model].filter(Boolean);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-neutral-900">{service.customer_name}</p>
          <p className="text-sm text-neutral-500">{service.customer_phone}</p>
        </div>
        <ServiceStatusBadge status={service.status} />
      </div>

      <div className="border-t border-neutral-100 pt-3">
        <p className="text-xs text-neutral-500">Kendaraan</p>
        <p className="text-sm text-neutral-900">
          {service.police_plate ?? '—'}
          {vehicleParts.length > 0 ? ` · ${vehicleParts.join(' ')}` : ''}
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">Keluhan</p>
        <p className="text-sm text-neutral-900">{service.complaint}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>Tipe harga: {customerTypeLabel[service.customer_type_used]}</span>
        {service.is_warranty_claim && (
          <span className="text-warning-700 font-medium">Klaim Garansi</span>
        )}
      </div>

      <div className="border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        <p>Mekanik: {service.mechanic_name ?? 'Belum ditugaskan'}</p>
        <p>Diterima oleh: {service.created_by_name}</p>
      </div>
    </Card>
  );
}
