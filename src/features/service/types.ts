export type ServiceStatus =
  | 'waiting'
  | 'pending_approval'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'cancelled';

export interface ServiceListItem {
  id: string;
  status: ServiceStatus;
  complaint: string;
  customer_type_used: 'general' | 'service' | 'workshop';
  is_warranty_claim: boolean;
  mechanic_id: string | null;
  created_at: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_id: string | null;
  police_plate: string | null;
  motor_brand: string | null;
  motor_model: string | null;
}