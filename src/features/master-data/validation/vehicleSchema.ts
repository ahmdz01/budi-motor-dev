import { z } from 'zod';

export const vehicleSchema = z.object({
  policePlate: z.string().max(20).optional(),
  motorBrand: z.string().max(50).optional(),
  motorModel: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;