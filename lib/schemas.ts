import { z } from 'zod';

export const CreateReservationSchema = z.object({
  productId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  qty: z.number().int().min(1).max(100)
});

export const ApiErrorSchema = z.object({
  error: z.enum(['INSUFFICIENT_STOCK', 'RESERVATION_EXPIRED', 'NOT_FOUND', 'VALIDATION_ERROR', 'INTERNAL_ERROR', 'CONFLICT']),
  message: z.string(),
  requestId: z.string().optional()
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
