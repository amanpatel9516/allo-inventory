import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.inventoryLedger.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // 2. Create Warehouses
  const wMumbai = await prisma.warehouse.create({
    data: { name: 'Mumbai Central', location: 'Mumbai, MH' },
  });
  const wDelhi = await prisma.warehouse.create({
    data: { name: 'Delhi North', location: 'New Delhi, DL' },
  });
  const wBlr = await prisma.warehouse.create({
    data: { name: 'Bengaluru South', location: 'Bengaluru, KA' },
  });

  const warehouses = [wMumbai, wDelhi, wBlr];

  // 3. Create Products
  const productsData = [
    { sku: 'ALO-VIT-D3-60', name: 'Allo Vitamin D3 - 60 Capsules', description: 'High potency D3 supplements for bone health.', imageUrl: '/images/vit-d3.png' },
    { sku: 'ALO-PROB-30', name: 'Allo Daily Probiotics - 30 Capsules', description: 'Gut health support with 50B CFU.', imageUrl: '/images/probiotics.png' },
    { sku: 'ALO-WHEY-1KG', name: 'Allo Grass-Fed Whey Protein - 1kg', description: 'Premium chocolate whey protein.', imageUrl: '/images/whey-protein.png' },
    { sku: 'ALO-MAT-01', name: 'Allo Premium Yoga Mat', description: 'Non-slip eco-friendly exercise mat.', imageUrl: '/images/yoga-mat.png' },
    { sku: 'ALO-SLEEP-30', name: 'Allo Deep Sleep Gummies - 30 Ct', description: 'Melatonin and L-Theanine for restful sleep.', imageUrl: '/images/sleep-gummies.png' },
    { sku: 'ALO-ASH-60', name: 'Allo KSM-66 Ashwagandha', description: 'Pure root extract for stress and anxiety support.', imageUrl: '/images/ashwagandha.png' },
    { sku: 'ALO-MAG-90', name: 'Allo Magnesium Glycinate', description: 'High absorption magnesium for muscle recovery.', imageUrl: '/images/magnesium.png' },
    { sku: 'ALO-COL-300G', name: 'Allo Collagen Peptides', description: 'Hydrolyzed bovine collagen for skin and hair.', imageUrl: '/images/collagen.png' },
    { sku: 'ALO-MULTI-60', name: 'Allo Daily Multivitamin', description: 'Comprehensive blend of 24 essential vitamins.', imageUrl: '/images/multivitamin.png' },
  ];

  const products = await Promise.all(
    productsData.map(p => prisma.product.create({ data: p }))
  );

  // 4. Create Inventory Ledger
  for (const product of products) {
    for (const warehouse of warehouses) {
      // Create varied stock levels
      // Let's make some items low stock and some out of stock in certain warehouses
      let totalQty = Math.floor(Math.random() * 50) + 1; // 1 to 50
      
      // Specifically create a low stock scenario for one product to easily demo 409
      if (product.sku === 'ALO-SLEEP-30' && warehouse.name === 'Mumbai Central') {
        totalQty = 2;
      }
      if (product.sku === 'ALO-MAT-01' && warehouse.name === 'Delhi North') {
        totalQty = 0;
      }

      await prisma.inventoryLedger.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalQty: totalQty,
          reservedQty: 0,
        },
      });
    }
  }

  // 5. Create an expired reservation to demo cron cleanup
  const demoProduct = products[0];
  const demoWarehouse = warehouses[0];
  
  // First increment reservedQty
  await prisma.inventoryLedger.update({
    where: {
      productId_warehouseId: {
        productId: demoProduct.id,
        warehouseId: demoWarehouse.id,
      }
    },
    data: { reservedQty: { increment: 1 } }
  });

  // Then create expired reservation
  await prisma.reservation.create({
    data: {
      productId: demoProduct.id,
      warehouseId: demoWarehouse.id,
      qty: 1,
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 1000 * 60 * 60), // Expired 1 hour ago
    }
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
