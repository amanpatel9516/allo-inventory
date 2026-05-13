import { NextRequest, NextResponse } from 'next/server';
import { releaseReservation } from '@/lib/reservationEngine';
import { NotFoundError } from '@/lib/errors';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    await releaseReservation(id);
    return NextResponse.json({ success: true, message: 'Reservation released' }, { status: 200 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: 'NOT_FOUND', message: error.message, requestId }, { status: 404 });
    }

    console.error('Release reservation failed:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId },
      { status: 500 }
    );
  }
}
