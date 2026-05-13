import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const AdminActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('REFILL'),
    productId: z.string(),
    warehouseId: z.string(),
    amount: z.number().positive()
  }),
  z.object({
    type: z.literal('REPORT_DISCREPANCY'),
    warehouseId: z.string()
  }),
  z.object({
    type: z.literal('MARK_SUCCESS'),
    warehouseId: z.string()
  })
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = AdminActionSchema.parse(body);

    if (action.type === 'REFILL') {
      const updated = await prisma.inventoryLedger.update({
        where: {
          productId_warehouseId: {
            productId: action.productId,
            warehouseId: action.warehouseId
          }
        },
        data: {
          totalQty: { increment: action.amount }
        }
      });
      return NextResponse.json({ success: true, updated });
    }

    if (action.type === 'REPORT_DISCREPANCY' || action.type === 'MARK_SUCCESS') {
      const warehouse = await prisma.warehouse.findUnique({ where: { id: action.warehouseId } });
      if (!warehouse) throw new Error('Warehouse not found');

      const isSuccess = action.type === 'MARK_SUCCESS';
      
      // NOVELTY A+ (Laplace Smoothing): 
      // We assume every warehouse starts with 5 "phantom" successes.
      // This prevents the trust from crashing to 0% on the very first error.
      const BASE_SUCCESSES = 5; 
      
      const currentSuccess = (warehouse.successCount || 0);
      const currentRejection = (warehouse.rejectionCount || 0);
      
      const newSuccessCount = isSuccess ? currentSuccess + 1 : currentSuccess;
      const newRejectionCount = !isSuccess ? currentRejection + 1 : currentRejection;
      
      const totalEvents = newSuccessCount + newRejectionCount + BASE_SUCCESSES;
      const newScore = (newSuccessCount + BASE_SUCCESSES) / totalEvents;

      await prisma.warehouse.update({
        where: { id: action.warehouseId },
        data: {
          successCount: newSuccessCount,
          rejectionCount: newRejectionCount,
          reliabilityScore: newScore
        }
      });
      return NextResponse.json({ success: true, newScore });
    }

    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error) {
    console.error('[ADMIN_API_ERROR]', error);
    return NextResponse.json({ error: 'FAILED_TO_PROCESS', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
  }
}

export async function GET() {
  const inventory = await prisma.inventoryLedger.findMany({
    include: {
      product: true,
      warehouse: true
    },
    orderBy: [
      { product: { name: 'asc' } },
      { warehouse: { name: 'asc' } }
    ]
  });

  return NextResponse.json(inventory);
}
