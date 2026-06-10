import type { PrismaClient } from "@/app/generated/prisma/client";
import bcrypt from "bcryptjs";

let seq = 0;
const next = () => ++seq;

export async function createUser(
  prisma: PrismaClient,
  overrides: { email?: string; role?: "USER" | "ADMIN" } = {}
) {
  const n = next();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${n}@test.com`,
      password: await bcrypt.hash("password", 4), // low rounds for speed
      name: `Test User ${n}`,
      role: overrides.role ?? "USER",
    },
  });
}

export async function createCategory(prisma: PrismaClient, slug?: string) {
  const n = next();
  const s = slug ?? `cat-${n}`;
  return prisma.category.upsert({
    where: { slug: s },
    update: {},
    create: { name: `Category ${n}`, slug: s },
  });
}

export async function createProduct(
  prisma: PrismaClient,
  categoryId: string,
  overrides: { basePrice?: number } = {}
) {
  const n = next();
  return prisma.product.create({
    data: {
      categoryId,
      name: `Product ${n}`,
      slug: `product-${n}`,
      description: "Test product",
      basePrice: overrides.basePrice ?? 10000,
      images: [],
    },
  });
}

export async function createVariant(
  prisma: PrismaClient,
  productId: string,
  overrides: { size?: string; color?: string; stock?: number } = {}
) {
  const n = next();
  return prisma.productVariant.create({
    data: {
      productId,
      sku: `SKU-${n}`,
      size: overrides.size ?? "M",
      color: overrides.color ?? "שחור",
      stock: overrides.stock ?? 20,
    },
  });
}

/** Convenience: category + product + variant in one call */
export async function createVariantWithProduct(
  prisma: PrismaClient,
  overrides: { size?: string; color?: string; stock?: number; basePrice?: number } = {}
) {
  const category = await createCategory(prisma);
  const product = await createProduct(prisma, category.id, { basePrice: overrides.basePrice });
  const variant = await createVariant(prisma, product.id, overrides);
  return { category, product, variant };
}
