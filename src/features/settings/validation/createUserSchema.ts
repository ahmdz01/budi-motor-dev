import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  phoneNumber: z
    .string()
    .min(9, 'Nomor HP tidak valid')
    .max(20)
    .regex(/^[0-9]+$/, 'Nomor HP hanya boleh angka'),
  pin: z
    .string()
    .length(4, 'PIN harus 4 digit')
    .regex(/^[0-9]+$/, 'PIN hanya boleh angka'),
  roleCode: z.enum(['owner', 'admin', 'kasir', 'mekanik', 'super_admin']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
