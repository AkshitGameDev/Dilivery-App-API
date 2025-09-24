// scripts/seed.js
import 'dotenv/config';
import { prisma } from '../src/db.js';

async function upsertOrderWithJob({
  externalId,
  grand = 25,
  pickup = { lat: 43.653, lng: -79.383 },
  drop = { lat: 43.650, lng: -79.380 },
}) {
  const order = await prisma.order.upsert({
    where: { platform_externalId: { platform: 'custom', externalId } },
    update: {},
    create: {
      platform: 'custom',
      externalId,
      status: 'CREATED',
      currency: 'CAD',
      grand,
      customerName: `Customer ${externalId}`,
      placedAt: new Date(),
      items: [
        { sku: 'SKU1', name: 'Burger', qty: 1, price: grand - 5 },
      ],
      shippingAddr: { line1: '123 King St', city: 'Toronto', state: 'ON', country: 'CA' },
    },
  });

  const existingOpen = await prisma.job.findFirst({
    where: { orderId: order.id, status: 'OPEN' },
    select: { id: true },
  });

  if (!existingOpen) {
    await prisma.job.create({
      data: {
        orderId: order.id,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        status: 'OPEN',
      },
    });
  }

  return order.id;
}

async function main() {
  // One baseline order (your original)
  await upsertOrderWithJob({
    externalId: 'ORD-1001',
    grand: 25.5,
    pickup: { lat: 43.653, lng: -79.383 },
    drop: { lat: 43.660, lng: -79.400 },
  });

  // A couple more around downtown Toronto for Q2 testing
  await upsertOrderWithJob({
    externalId: 'ORD-1002',
    grand: 18.0,
    pickup: { lat: 43.648, lng: -79.380 }, // near Union
    drop: { lat: 43.642, lng: -79.389 },
  });

  await upsertOrderWithJob({
    externalId: 'ORD-1003',
    grand: 32.0,
    pickup: { lat: 43.657, lng: -79.395 }, // Kensington-ish
    drop: { lat: 43.655, lng: -79.370 },
  });

  console.log('Seed OK: orders + OPEN jobs are ready for Q2 tests');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
