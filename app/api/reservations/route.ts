import { NextRequest, NextResponse } from 'next/server';
import { CreateReservationSchema } from '@/lib/schemas';
import { createReservation } from '@/lib/reservationEngine';
import { ConflictError } from '@/lib/errors';
import { withIdempotency } from '@/lib/idempotency';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get('idempotency-key');
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  const handler = async (): Promise<any> => {
    try {
      const body = await req.json();
      const parsed = CreateReservationSchema.safeParse(body);

      if (!parsed.success) {
        return {
          status: 400,
          body: { error: 'VALIDATION_ERROR', message: 'Invalid request payload', requestId }
        };
      }

      const reservation = await createReservation({
        ...parsed.data,
        idempotencyKey
      });

      // Layer 3 - Redis TTL as safety net
      await redis.set(`reservation:expire:${reservation.id}`, "1", { px: 10 * 60 * 1000 });

      return {
        status: 201,
        body: { reservation }
      };

    } catch (error) {
      if (error instanceof ConflictError) {
        return {
          status: 409,
          body: { error: 'INSUFFICIENT_STOCK', message: error.message, requestId }
        };
      }
      
      console.error('Create reservation failed:', error);
      return {
        status: 500,
        body: { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId }
      };
    }
  };

  const { status, body, fromCache } = await withIdempotency(idempotencyKey, handler);

  const headers = new Headers();
  if (fromCache) {
    headers.set('Idempotent-Replayed', 'true');
  }

  return NextResponse.json(body, { status, headers });
}
