import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getTestClient, cleanDb } from "./helpers/db";
import { createUser, createVariantWithProduct } from "./factories";
import {
  placeOrder,
  getOrdersForUser,
  getOrderById,
  OutOfStockError,
  EmptyCartError,
  InactiveVariantError,
} from "@/lib/orders/logic";
import type { ShippingAddress } from "@/lib/validations/checkout";

const prisma = getTestClient();

const ADDRESS: ShippingAddress = {
  street: "הרצל 1",
  city: "תל אביב",
  zipCode: "6100000",
  country: "Israel",
  phone: "050-1234567",
};

beforeEach(() => cleanDb(prisma));
afterAll(() => prisma.$disconnect());

// ─── Helper: seed a user with one cart item ───────────────────────────────────
async function seedUserWithCart(variantId: string, qty: number) {
  const user = await createUser(prisma);
  await prisma.cartItem.create({ data: { userId: user.id, variantId, quantity: qty } });
  return user;
}

// ─── Canary: stock=1, two concurrent placeOrder calls ────────────────────────

describe("placeOrder — concurrency / overselling prevention", () => {
  it("stock=1, two concurrent calls → exactly one succeeds, one throws OutOfStockError, stock=0 never negative", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 1 });

    const [userA, userB] = await Promise.all([
      seedUserWithCart(variant.id, 1),
      seedUserWithCart(variant.id, 1),
    ]);

    const results = await Promise.allSettled([
      placeOrder(prisma, userA.id, ADDRESS),
      placeOrder(prisma, userB.id, ADDRESS),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(OutOfStockError);

    const after = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(after!.stock).toBe(0);
  });

  it("N=10 concurrent orders on stock=M=5 → exactly 5 succeed, 5 fail, stock=0", async () => {
    const N = 10;
    const M = 5;
    const { variant } = await createVariantWithProduct(prisma, { stock: M });

    const users = await Promise.all(
      Array.from({ length: N }, () => seedUserWithCart(variant.id, 1))
    );

    const results = await Promise.allSettled(
      users.map((u) => placeOrder(prisma, u.id, ADDRESS))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(M);
    expect(failed).toHaveLength(N - M);
    failed.forEach((r) => {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(OutOfStockError);
    });

    const after = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(after!.stock).toBe(0);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("placeOrder — edge cases", () => {
  it("empty cart throws EmptyCartError (not a silent empty order)", async () => {
    const user = await createUser(prisma);
    await expect(placeOrder(prisma, user.id, ADDRESS)).rejects.toThrow(EmptyCartError);
  });

  it("cart with inactive variant throws InactiveVariantError before touching stock", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 10 });
    await prisma.productVariant.update({ where: { id: variant.id }, data: { isActive: false } });

    const user = await seedUserWithCart(variant.id, 1);

    await expect(placeOrder(prisma, user.id, ADDRESS)).rejects.toThrow(InactiveVariantError);

    // Stock must be untouched
    const after = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(after!.stock).toBe(10);
  });

  it("totalAmount === Σ(priceAtTime × quantity) strictly", async () => {
    // Two variants with known prices
    const { variant: v1, product: p1 } = await createVariantWithProduct(prisma, { basePrice: 10000 });
    const { variant: v2 } = await createVariantWithProduct(prisma, { basePrice: 25000 });
    // v2 has a priceOverride
    await prisma.productVariant.update({ where: { id: v2.id }, data: { priceOverride: 30000 } });

    const user = await createUser(prisma);
    await prisma.cartItem.createMany({
      data: [
        { userId: user.id, variantId: v1.id, quantity: 3 }, // 3 × 10000 = 30000
        { userId: user.id, variantId: v2.id, quantity: 2 }, // 2 × 30000 = 60000
      ],
    });

    const order = await placeOrder(prisma, user.id, ADDRESS);

    expect(order.totalAmount).toBe(90000); // 30000 + 60000

    // Each line's priceAtTime must match what was in the DB
    const line1 = order.items.find((i) => i.variantId === v1.id)!;
    const line2 = order.items.find((i) => i.variantId === v2.id)!;
    expect(line1.priceAtTime).toBe(10000); // basePrice (no override)
    expect(line2.priceAtTime).toBe(30000); // priceOverride wins
    expect(order.totalAmount).toBe(
      line1.priceAtTime * line1.quantity + line2.priceAtTime * line2.quantity
    );
  });
});

// ─── Snapshot correctness ─────────────────────────────────────────────────────

describe("placeOrder — snapshots", () => {
  it("order receipt unchanged after product price changes", async () => {
    const { variant, product } = await createVariantWithProduct(prisma, { basePrice: 20000 });
    const user = await seedUserWithCart(variant.id, 1);

    const order = await placeOrder(prisma, user.id, ADDRESS);
    expect(order.items[0].priceAtTime).toBe(20000);

    // Merchant changes price after the fact
    await prisma.product.update({ where: { id: product.id }, data: { basePrice: 99900 } });

    const fetched = await getOrderById(prisma, order.id, user.id);
    expect(fetched!.items[0].priceAtTime).toBe(20000); // unchanged
    expect(fetched!.totalAmount).toBe(20000);           // unchanged
  });

  it("OrderItem stores all required snapshot fields", async () => {
    const { variant, product } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id, 2);

    const order = await placeOrder(prisma, user.id, ADDRESS);
    const item = order.items[0];

    expect(item.productName).toBe(product.name); // exact match, not just truthy
    expect(item.variantSku).toBe(variant.sku);
    expect(item.size).toBe(variant.size);
    expect(item.color).toBe(variant.color);
    expect(item.priceAtTime).toBeGreaterThan(0);
  });
});

// ─── Transaction rollback ─────────────────────────────────────────────────────

describe("placeOrder — transaction rollback", () => {
  it("first variant stock restored when second variant is out of stock", async () => {
    const { variant: v1 } = await createVariantWithProduct(prisma, { stock: 5 });
    const { variant: v2 } = await createVariantWithProduct(prisma, { stock: 0 }); // will fail

    const user = await createUser(prisma);
    await prisma.cartItem.createMany({
      data: [
        { userId: user.id, variantId: v1.id, quantity: 1 },
        { userId: user.id, variantId: v2.id, quantity: 1 },
      ],
    });

    await expect(placeOrder(prisma, user.id, ADDRESS)).rejects.toThrow(OutOfStockError);

    // v1 stock must be fully restored (transaction rolled back)
    const after1 = await prisma.productVariant.findUnique({ where: { id: v1.id } });
    expect(after1!.stock).toBe(5);

    // Cart must also be untouched (no partial order committed)
    const cartItems = await prisma.cartItem.findMany({ where: { userId: user.id } });
    expect(cartItems).toHaveLength(2);
  });
});

// ─── Ownership ────────────────────────────────────────────────────────────────

describe("order ownership", () => {
  it("user can only read their own orders", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 10 });
    const userA = await seedUserWithCart(variant.id, 1);
    const userB = await createUser(prisma);

    const order = await placeOrder(prisma, userA.id, ADDRESS);

    // userB gets nothing
    const ordersB = await getOrdersForUser(prisma, userB.id);
    expect(ordersB).toHaveLength(0);

    // userB cannot fetch userA's order by ID
    const result = await getOrderById(prisma, order.id, userB.id);
    expect(result).toBeNull();
  });

  it("cart is cleared after successful order", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 10 });
    const user = await seedUserWithCart(variant.id, 2);

    await placeOrder(prisma, user.id, ADDRESS);

    const cartItems = await prisma.cartItem.findMany({ where: { userId: user.id } });
    expect(cartItems).toHaveLength(0);
  });
});
