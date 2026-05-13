import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true
      }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error('Failed to fetch reservation', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch reservation' },
      { status: 500 }
    );
  }
}
