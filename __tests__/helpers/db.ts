import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let _client: PrismaClient | null = null;

export function getTestClient(): PrismaClient {
  if (!_client) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    _client = new PrismaClient({ adapter });
  }
  return _client;
}

export async function cleanDb(prisma: PrismaClient) {
  // Delete in reverse FK order; RESTART IDENTITY resets sequences
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "CartItem", "OrderItem", "Order", "Address", "ProductVariant", "Product", "Category", "User", "ProcessedEvent" RESTART IDENTITY CASCADE`
  );
}
