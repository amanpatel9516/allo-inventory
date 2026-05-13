import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseReservation } from '@/lib/reservationEngine';

// Force the route to be evaluated dynamically
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Check authorization header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      }
    });

    let releasedCount = 0;
    for (const r of expiredReservations) {
      try {
        await releaseReservation(r.id);
        releasedCount++;
      } catch (err) {
        console.error(`Failed to release expired reservation ${r.id}:`, err);
        // Continue processing others even if one fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      released: releasedCount,
      totalExpired: expiredReservations.length 
    });
  } catch (error) {
    console.error('Cron job failed', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Cron job failed to execute completely' },
      { status: 500 }
    );
  }
}
