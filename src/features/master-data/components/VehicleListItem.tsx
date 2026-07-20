import { Card } from '@/shared/components/Card';
import type { Vehicle } from '../types';

export function VehicleListItem({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Card className="p-3">
      <p className="text-sm font-medium text-neutral-900">
        {vehicle.police_plate ?? 'Tanpa plat nomor'}
      </p>
      <p className="text-xs text-neutral-500">
        {[vehicle.motor_brand, vehicle.motor_model].filter(Boolean).join(' ') ||
          'Merek/model tidak diisi'}
      </p>
      {vehicle.notes && <p className="mt-1 text-xs text-neutral-400">{vehicle.notes}</p>}
    </Card>
  );
}