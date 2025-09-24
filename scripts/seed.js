import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Upsert order so running seed twice is safe
  const order = await prisma.order.upsert({
    where: { platform_externalId: { platform: "custom", externalId: "ORD-1001" } },
    update: {},
    create: {
      platform: "custom",
      externalId: "ORD-1001",
      status: "CREATED",
      currency: "CAD",
      grand: 25.5,
      customerName: "Test Customer",
      placedAt: new Date()
    }
  });

  // Create one OPEN job if none exists for this order
  const existing = await prisma.job.findFirst({
    where: { orderId: order.id, status: "OPEN" }
  });
  if (!existing) {
    await prisma.job.create({
      data: {
        orderId: order.id,
        pickupLat: 43.653,
        pickupLng: -79.383,
        dropLat: 43.66,
        dropLng: -79.4,
        status: "OPEN"
      }
    });
  }

  console.log("Seed OK");
}
main().finally(() => prisma.$disconnect());
