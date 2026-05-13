import { prisma } from './prisma';
import { ConflictError, ExpiredError, NotFoundError } from './errors';
import { CreateReservationInput } from './schemas';
import { Reservation, InventoryLedger } from '@prisma/client';
import { redis } from './redis';

export async function createReservation({
  productId,
  warehouseId,
  qty,
  idempotencyKey,
}: CreateReservationInput & { idempotencyKey?: string | null }): Promise<Reservation> {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Acquire a row-level lock on the inventory row.
    // SELECT FOR UPDATE blocks other concurrent transactions trying to
    // reserve the same SKU/warehouse. SKIP LOCKED means we fail fast
    // instead of queuing (which would cause timeouts).
    const ledger = await tx.$queryRaw<InventoryLedger[]>`
      SELECT * FROM "InventoryLedger"
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
      FOR UPDATE SKIP LOCKED
    `;

    // Step 2: If no row returned, another tx has the lock -> 409
    if (ledger.length === 0) {
      throw new ConflictError('Resource locked by concurrent request');
    }

    const row = ledger[0];
    const available = row.totalQty - row.reservedQty;

    // Step 3: Check available stock
    if (available < qty) {
      throw new ConflictError('Insufficient stock');
    }

    // Step 4: Atomically increment reservedQty
    await tx.inventoryLedger.update({
      where: { id: row.id },
      data: { reservedQty: { increment: qty } },
    });

    // Step 5: Create the reservation record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const reservation = await tx.reservation.create({
      data: {
        productId,
        warehouseId,
        qty,
        status: 'PENDING',
        expiresAt,
        idempotencyKey: idempotencyKey ?? null,
      },
      include: { product: true, warehouse: true },
    });

    return reservation;
  });
}

export async function confirmReservation(id: string): Promise<Reservation> {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status === 'CONFIRMED') {
      return reservation; // Idempotent success
    }

    if (reservation.status === 'RELEASED') {
      throw new ConflictError('Reservation already released');
    }

    if (reservation.expiresAt < new Date()) {
      // Lazy cleanup: If it's expired but still PENDING, we release it now and throw 410
      await releaseReservationInternal(tx, reservation);
      throw new ExpiredError('Reservation expired');
    }

    return await tx.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { product: true, warehouse: true },
    });
  });
}

export async function releaseReservation(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({ where: { id } });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status === 'RELEASED' || reservation.status === 'CONFIRMED') {
      return; // Already handled
    }

    await releaseReservationInternal(tx, reservation);
  });
}

// Internal helper to release inside a transaction
async function releaseReservationInternal(tx: any, reservation: Reservation) {
  // Release logic
  await tx.reservation.update({
    where: { id: reservation.id },
    data: { status: 'RELEASED' },
  });

  // Decrement reservedQty
  await tx.inventoryLedger.update({
    where: {
      productId_warehouseId: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
    },
    data: { reservedQty: { decrement: reservation.qty } },
  });
}
