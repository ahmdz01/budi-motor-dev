import { z } from 'zod';

export const categoryBrandSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Nama maksimal 50 karakter'),
});

export type CategoryBrandInput = z.infer<typeof categoryBrandSchema>;
