import { NextRequest, NextResponse } from 'next/server';
import { confirmReservation } from '@/lib/reservationEngine';
import { ConflictError, ExpiredError, NotFoundError } from '@/lib/errors';
import { withIdempotency } from '@/lib/idempotency';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idempotencyKey = req.headers.get('idempotency-key');
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  const handler = async (): Promise<any> => {
    try {
      const reservation = await confirmReservation(id);

      return {
        status: 200,
        body: { reservation }
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return { status: 404, body: { error: 'NOT_FOUND', message: error.message, requestId } };
      }
      if (error instanceof ExpiredError) {
        return { status: 410, body: { error: 'RESERVATION_EXPIRED', message: error.message, requestId } };
      }
      if (error instanceof ConflictError) {
        return { status: 409, body: { error: 'CONFLICT', message: error.message, requestId } };
      }

      console.error('Confirm reservation failed:', error);
      return { status: 500, body: { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId } };
    }
  };

  const { status, body, fromCache } = await withIdempotency(idempotencyKey, handler);

  const headers = new Headers();
  if (fromCache) {
    headers.set('Idempotent-Replayed', 'true');
  }

  return NextResponse.json(body, { status, headers });
}
