import { z } from 'zod';

// Sengaja HANYA berisi field yang di-register langsung ke react-hook-form
// (input teks/pilihan sederhana). customerId & vehicleId TIDAK di sini —
// keduanya dikelola sebagai state terpisah di ServiceIntakeForm (pola sama
// dengan categoryId/brandId di ProductForm) karena dipilih lewat komponen
// picker custom, bukan input biasa, lalu digabung saat submit.
export const serviceIntakeFormSchema = z.object({
  complaint: z
    .string()
    .min(3, 'Keluhan minimal 3 karakter.')
    .max(500, 'Keluhan maksimal 500 karakter.'),
  customerTypeUsed: z.enum(['general', 'service', 'workshop']),
  isWarrantyClaim: z.boolean(),
});

export type ServiceIntakeFormValues = z.infer<typeof serviceIntakeFormSchema>;