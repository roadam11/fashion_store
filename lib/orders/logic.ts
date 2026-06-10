import type { PrismaClient, Order, OrderItem } from "@/app/generated/prisma/client";
import type { ShippingAddress } from "@/lib/validations/checkout";

// ─── Domain errors ────────────────────────────────────────────────────────────

export class OutOfStockError extends Error {
  variantId: string;
  constructor(variantId: string) {
    super(`Out of stock: ${variantId}`);
    this.name = "OutOfStockError";
    this.variantId = variantId;
  }
}

export class EmptyCartError extends Error {
  constructor() {
    super("Cart is empty — cannot place order");
    this.name = "EmptyCartError";
  }
}

export class InactiveVariantError extends Error {
  variantId: string;
  constructor(variantId: string) {
    super(`Variant is no longer available: ${variantId}`);
    this.name = "InactiveVariantError";
    this.variantId = variantId;
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getOrdersForUser(prisma: PrismaClient, userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(
  prisma: PrismaClient,
  orderId: string,
  userId: string
): Promise<(Order & { items: OrderItem[] }) | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.userId !== userId) return null;
  return order;
}

// ─── Core: placeOrder ─────────────────────────────────────────────────────────
//
// Client payload contains ONLY the shipping address.
// All cart items, prices, and totals are fetched/computed server-side.
// Stock decrement is the synchronous mock of payment completion for v1.
// In Phase 6 (Stripe), extract the transaction block into the webhook handler.

export async function placeOrder(
  prisma: PrismaClient,
  userId: string,
  address: ShippingAddress
): Promise<Order & { items: OrderItem[] }> {
  // ── 1. Fetch cart from DB — zero-trust, nothing from client ──────────────
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      variant: {
        include: {
          product: { select: { name: true, basePrice: true, isActive: true } },
        },
      },
    },
  });

  // ── 2. Validate ───────────────────────────────────────────────────────────
  if (cartItems.length === 0) throw new EmptyCartError();

  for (const item of cartItems) {
    if (!item.variant.isActive || !item.variant.product.isActive) {
      throw new InactiveVariantError(item.variantId);
    }
  }

  // ── 3. Server-authoritative pricing — never trust the client ─────────────
  const lines = cartItems.map((item) => ({
    variantId: item.variantId,
    quantity: item.quantity,
    // priceOverride wins when set; otherwise falls back to product basePrice
    priceAtTime: item.variant.priceOverride ?? item.variant.product.basePrice,
    productName: item.variant.product.name,
    variantSku: item.variant.sku,
    size: item.variant.size,
    color: item.variant.color,
  }));

  const totalAmount = lines.reduce(
    (sum, l) => sum + l.priceAtTime * l.quantity,
    0
  );

  // ── 4. Single atomic transaction ──────────────────────────────────────────
  //
  // READ COMMITTED isolation (Postgres default) is sufficient:
  // the conditional updateMany acquires a row-level lock on the variant row,
  // so a concurrent transaction sees the committed decrement and count===0.
  return prisma.$transaction(async (tx) => {
    // 4a. Atomic stock decrement — the anti-overselling invariant
    for (const line of lines) {
      const res = await tx.productVariant.updateMany({
        where: { id: line.variantId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (res.count === 0) throw new OutOfStockError(line.variantId);
    }

    // 4b. Create order with flat shipping snapshot
    const order = await tx.order.create({
      data: {
        userId,
        totalAmount,
        status: "PENDING",
        shippingStreet: address.street,
        shippingCity: address.city,
        shippingZipCode: address.zipCode,
        shippingCountry: address.country,
        shippingPhone: address.phone,
        items: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            priceAtTime: l.priceAtTime,
            productName: l.productName,
            variantSku: l.variantSku,
            size: l.size,
            color: l.color,
          })),
        },
      },
      include: { items: true },
    });

    // 4c. Clear cart in same transaction — atomicity with the order creation
    await tx.cartItem.deleteMany({ where: { userId } });

    return order;
  });
}
