'use client';

import { use } from 'react';
import { useServiceDetail } from '@/features/service/hooks/useServiceDetail';
import { useServiceStatusHistory } from '@/features/service/hooks/useServiceStatusHistory';
import { useServiceItems } from '@/features/service/hooks/useServiceItems';
import { ServiceDetailHeader } from '@/features/service/components/ServiceDetailHeader';
import { ServiceStatusHistoryTimeline } from '@/features/service/components/ServiceStatusHistoryTimeline';
import { ServiceStatusActions } from '@/features/service/components/ServiceStatusActions';
import { ServiceItemsList } from '@/features/service/components/ServiceItemsList';
import { AddServiceItemForm } from '@/features/service/components/AddServiceItemForm';
import { useCurrentUser } from '@/shared/contexts/UserContext';

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: service, isLoading, error } = useServiceDetail(id);
  const { data: history } = useServiceStatusHistory(id);
  const { data: items } = useServiceItems(id);
  const itemsTotal = (items ?? []).reduce((sum, i) => sum + i.subtotal, 0);
  const { roleCode, id: currentUserId } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="p-4">
        <p className="text-danger-600 text-sm">{error?.message ?? 'Servis tidak ditemukan.'}</p>
      </div>
    );
  }

  const canAddItem =
    service.status === 'in_progress' &&
    (['owner', 'admin', 'kasir', 'super_admin'].includes(roleCode) ||
      (roleCode === 'mekanik' && service.mechanic_id === currentUserId));

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <ServiceDetailHeader service={service} />
      <ServiceStatusActions
        service={service}
        hasItems={(items ?? []).length > 0}
        itemsTotal={itemsTotal}
      />
      <ServiceItemsList items={items ?? []} />
      {canAddItem && <AddServiceItemForm service={service} />}
      {history && <ServiceStatusHistoryTimeline history={history} />}
    </div>
  );
}
