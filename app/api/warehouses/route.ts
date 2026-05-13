import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
        location: true,
      }
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error('Failed to fetch warehouses', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}
