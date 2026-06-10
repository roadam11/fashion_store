import type { PrismaClient, OrderStatus } from "@/app/generated/prisma/client";
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
} from "@/lib/validations/admin";

// ─── Domain errors ────────────────────────────────────────────────────────────

export class UnauthorizedError extends Error {
  constructor(msg = "Admin role required") {
    super(msg);
    this.name = "UnauthorizedError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid status transition: ${from} → ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

// ─── RBAC guard ───────────────────────────────────────────────────────────────
// Called at the TOP of every admin mutation — middleware is UX-only.

function requireAdmin(role: string): void {
  if (role !== "ADMIN") throw new UnauthorizedError();
}

// ─── Status transition map ────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING:         ["PAID", "CANCELLED"],
  PAID:            ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING:      ["SHIPPED", "CANCELLED"],
  SHIPPED:         ["DELIVERED"],
  DELIVERED:       [],
  CANCELLED:       [],
  REFUNDED:        [],
  NEEDS_ATTENTION: ["REFUNDED"], // admin resolves: issue Stripe refund → mark REFUNDED
};

// ─── Slug helper ──────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0590-\u05fe-]/g, "")
      .slice(0, 60) +
    "-" +
    crypto.randomUUID().slice(0, 8)
  );
}

// ─── Product CRUD ─────────────────────────────────────────────────────────────

export async function adminCreateProduct(
  prisma: PrismaClient,
  actorRole: string,
  data: CreateProductInput
) {
  requireAdmin(actorRole);
  return prisma.product.create({
    data: {
      name: data.name,
      slug: toSlug(data.name),
      description: data.description,
      basePrice: data.basePrice,
      images: data.images,
      categoryId: data.categoryId,
    },
  });
}

export async function adminUpdateProduct(
  prisma: PrismaClient,
  actorRole: string,
  productId: string,
  data: UpdateProductInput
) {
  requireAdmin(actorRole);
  return prisma.product.update({ where: { id: productId }, data });
}

export async function adminSoftDeleteProduct(
  prisma: PrismaClient,
  actorRole: string,
  productId: string
) {
  requireAdmin(actorRole);
  // Both writes in one transaction — if the process dies between them,
  // variants won't be deactivated while the product stays visible.
  return prisma.$transaction(async (tx) => {
    await tx.productVariant.updateMany({
      where: { productId },
      data: { isActive: false },
    });
    return tx.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  });
}

// ─── Variant CRUD ─────────────────────────────────────────────────────────────

export async function adminCreateVariant(
  prisma: PrismaClient,
  actorRole: string,
  data: CreateVariantInput
) {
  requireAdmin(actorRole);
  return prisma.productVariant.create({
    data: {
      productId: data.productId,
      sku: data.sku,
      size: data.size,
      color: data.color,
      stock: data.stock,
      priceOverride: data.priceOverride ?? null,
    },
  });
}

export async function adminUpdateVariant(
  prisma: PrismaClient,
  actorRole: string,
  variantId: string,
  data: UpdateVariantInput
) {
  requireAdmin(actorRole);
  return prisma.productVariant.update({ where: { id: variantId }, data });
}

export async function adminSoftDeleteVariant(
  prisma: PrismaClient,
  actorRole: string,
  variantId: string
) {
  requireAdmin(actorRole);
  // Never hard-delete — OrderItem.variantId FK is RESTRICT.
  // Soft-delete preserves receipt integrity while hiding from catalog.
  return prisma.productVariant.update({
    where: { id: variantId },
    data: { isActive: false },
  });
}

// ─── Order status management ──────────────────────────────────────────────────

export async function adminUpdateOrderStatus(
  prisma: PrismaClient,
  actorRole: string,
  orderId: string,
  newStatus: string
) {
  requireAdmin(actorRole);

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];

  if (!allowed.includes(newStatus as OrderStatus)) {
    throw new InvalidStatusTransitionError(order.status, newStatus);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus as OrderStatus },
  });
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(prisma: PrismaClient) {
  const [revenueAgg, totalOrders, activeProducts, totalUsers] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
    }),
    prisma.order.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count(),
  ]);

  return {
    revenueAgorot: revenueAgg._sum.totalAmount ?? 0, // stays Int; format in UI
    totalOrders,
    activeProducts,
    totalUsers,
  };
}
