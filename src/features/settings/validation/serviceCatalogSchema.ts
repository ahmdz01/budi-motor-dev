import { z } from 'zod';

export const serviceCatalogSchema = z.object({
  name: z.string().min(2, 'Nama jasa minimal 2 karakter.').max(100),
  defaultPrice: z.coerce.number().positive('Harga harus lebih dari 0.'),
  // Kolom warranty_days di DB nullable — string kosong dari input
  // HTML harus dianggap "tidak diisi", bukan tercoerce ke 0 (yang
  // akan gagal cek positive() padahal memang sengaja dikosongkan).
  warrantyDays: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().positive('Harus lebih dari 0 hari.').optional()
  ),
  isActive: z.boolean(),
});

export type ServiceCatalogInput = z.infer<typeof serviceCatalogSchema>;
