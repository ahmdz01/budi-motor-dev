import { z } from 'zod';

export const forgotPinSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, 'Nomor HP minimal 10 digit')
    .max(15, 'Nomor HP maksimal 15 digit')
    .regex(/^[0-9]+$/, 'Nomor HP hanya boleh berisi angka'),
});

export type ForgotPinInput = z.infer<typeof forgotPinSchema>;
