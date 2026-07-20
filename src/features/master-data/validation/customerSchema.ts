import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  phoneNumber: z
    .string()
    .min(9, 'Nomor HP tidak valid')
    .max(20)
    .regex(/^[0-9+ -]+$/, 'Nomor HP hanya boleh angka'),
  customerType: z.enum(['general', 'service', 'workshop']),
  address: z.string().max(500).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;