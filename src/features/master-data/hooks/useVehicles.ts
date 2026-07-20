'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { Vehicle } from '../types';
import type { VehicleInput } from '../validation/vehicleSchema';

export function useVehicles(customerId: string) {
  return useQuery({
    queryKey: ['vehicles', customerId],
    queryFn: async (): Promise<Vehicle[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!customerId,
  });
}

export function useCreateVehicle(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VehicleInput) => {
      const supabase = createClient();
      const { error } = await supabase.from('vehicles').insert({
        customer_id: customerId,
        police_plate: input.policePlate || null,
        motor_brand: input.motorBrand || null,
        motor_model: input.motorModel || null,
        notes: input.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', customerId] });
    },
  });
}