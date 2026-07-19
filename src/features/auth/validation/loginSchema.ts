import { z } from 'zod';

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, 'Nomor HP minimal 10 digit')
    .max(15, 'Nomor HP maksimal 15 digit')
    .regex(/^[0-9]+$/, 'Nomor HP hanya boleh berisi angka'),
  pin: z
    .string()
    .length(4, 'PIN harus tepat 4 digit')
    .regex(/^[0-9]+$/, 'PIN hanya boleh berisi angka'),
});

export type LoginInput = z.infer<typeof loginSchema>;