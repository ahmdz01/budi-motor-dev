import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2, 'Nama barang minimal 2 karakter').max(150),
  categoryId: z.string().uuid('Pilih kategori').nullable(),
  brandId: z.string().uuid('Pilih merek').nullable(),
  locationLabel: z.string().max(30).optional(),
  minStock: z.coerce.number().int().min(0, 'Minimal 0'),
  barcode: z.string().max(50).optional(),
  priceGeneral: z.coerce.number().positive('Harga harus lebih dari 0'),
  priceService: z.coerce.number().positive('Harga harus lebih dari 0'),
  priceWorkshop: z.coerce.number().positive('Harga harus lebih dari 0'),
});

export type ProductInput = z.infer<typeof productSchema>;
