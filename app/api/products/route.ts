import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0; // Disable static caching for this route

export async function GET() {
  try {
    // 1. Lazy cleanup: Release any expired reservations before computing available
    await prisma.reservation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'RELEASED' }
    });

    // NOTE: If we update many to RELEASED, we must also decrement the reservedQty 
    // in InventoryLedger. In a true system, this lazy cleanup might be better done
    // safely through the cron job or a specialized stored procedure since we need to
    // atomically decrement the inventory counts. For this demo, let's execute a raw query
    // to fix up the reservedQty based on actual PENDING and CONFIRMED reservations to ensure correctness.

    await prisma.$executeRaw`
      UPDATE "InventoryLedger"
      SET "reservedQty" = (
        SELECT COALESCE(SUM(qty), 0)
        FROM "Reservation"
        WHERE "Reservation"."productId" = "InventoryLedger"."productId" 
          AND "Reservation"."warehouseId" = "InventoryLedger"."warehouseId"
          AND ("status" = 'PENDING' OR "status" = 'CONFIRMED')
      );
    `;

    // 2. Fetch products with nested inventory and warehouse info
    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true
          }
        }
      }
    });

    // 3. Format the response with "Confidence-Adjusted" available stock (Novelty A)
    const formattedProducts = products.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      warehouses: p.inventory.map(inv => {
        const actualAvailable = inv.totalQty - inv.reservedQty;
        
        // NOVELTY A: Calculate "Shadow Stock" buffer based on warehouse reliability
        // If reliability is 0.9, we keep 10% as a safety buffer for ghost inventory
        const reliability = inv.warehouse.reliabilityScore;
        const confidenceBuffer = Math.ceil(inv.totalQty * (1 - reliability));
        const confidenceAdjustedAvailable = Math.max(0, actualAvailable - confidenceBuffer);

        return {
          warehouseId: inv.warehouse.id,
          warehouseName: inv.warehouse.name,
          reliabilityScore: reliability,
          actualAvailable: actualAvailable,
          confidenceBuffer: confidenceBuffer,
          available: confidenceAdjustedAvailable, // This is what the public sees
          isConfidenceReduced: confidenceBuffer > 0
        };
      })
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Failed to fetch products', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
