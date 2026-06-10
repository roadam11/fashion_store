/**
 * Phase 5 — Admin RBAC canary + soft-delete + status-transition tests.
 *
 * All logic functions accept `actorRole: string` so tests can call them
 * directly as a non-admin without any session mocking. This is the
 * server-side enforcement guarantee: middleware is UX-only.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getTestClient, cleanDb } from "./helpers/db";
import { createUser, createCategory, createProduct, createVariant, createVariantWithProduct } from "./factories";
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminSoftDeleteProduct,
  adminCreateVariant,
  adminUpdateVariant,
  adminSoftDeleteVariant,
  adminUpdateOrderStatus,
  UnauthorizedError,
  InvalidStatusTransitionError,
} from "@/lib/admin/logic";
import { placeOrder, getOrdersForUser } from "@/lib/orders/logic";
import { fulfillOrder } from "@/lib/stripe/fulfillment";
import type { ShippingAddress } from "@/lib/validations/checkout";

const prisma = getTestClient();

const ADDRESS: ShippingAddress = {
  street: "הרצל 1", city: "תל אביב",
  zipCode: "6100000", country: "Israel", phone: "050-1234567",
};

beforeEach(() => cleanDb(prisma));
afterAll(() => prisma.$disconnect());

// ─── Helper: seed a user with cart ready for ordering ────────────────────────
async function seedUserWithCart(variantId: string, qty = 1) {
  const user = await createUser(prisma);
  await prisma.cartItem.create({ data: { userId: user.id, variantId, quantity: qty } });
  return user;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUTHZ CANARY — every admin mutation called with role="USER" must reject
// ═══════════════════════════════════════════════════════════════════════════════

describe("RBAC canary — non-admin user calling admin mutations directly", () => {
  it("adminCreateProduct rejects USER role", async () => {
    const cat = await createCategory(prisma);
    await expect(
      adminCreateProduct(prisma, "USER", {
        name: "Test Product", categoryId: cat.id,
        description: "A test description here", basePrice: 10000, images: [],
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("adminUpdateProduct rejects USER role", async () => {
    const cat = await createCategory(prisma);
    const p = await createProduct(prisma, cat.id);
    await expect(
      adminUpdateProduct(prisma, "USER", p.id, { name: "Hacked Name" })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("adminSoftDeleteProduct rejects USER role", async () => {
    const cat = await createCategory(prisma);
    const p = await createProduct(prisma, cat.id);
    await expect(
      adminSoftDeleteProduct(prisma, "USER", p.id)
    ).rejects.toThrow(UnauthorizedError);
  });

  it("adminCreateVariant rejects USER role", async () => {
    const cat = await createCategory(prisma);
    const p = await createProduct(prisma, cat.id);
    await expect(
      adminCreateVariant(prisma, "USER", {
        productId: p.id, sku: "SKU-X", size: "M", color: "black", stock: 5,
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("adminUpdateVariant rejects USER role", async () => {
    const cat = await createCategory(prisma);
    const p = await createProduct(prisma, cat.id);
    const v = await createVariant(prisma, p.id);
    await expect(
      adminUpdateVariant(prisma, "USER", v.id, { stock: 999 })
    ).rejects.toThrow(UnauthorizedError);
  });

  it("adminSoftDeleteVariant rejects USER role", async () => {
    const cat = await createCategory(prisma);
    const p = await createProduct(prisma, cat.id);
    const v = await createVariant(prisma, p.id);
    await expect(
      adminSoftDeleteVariant(prisma, "USER", v.id)
    ).rejects.toThrow(UnauthorizedError);
  });

  it("adminUpdateOrderStatus rejects USER role", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);
    await expect(
      adminUpdateOrderStatus(prisma, "USER", order.id, "SHIPPED")
    ).rejects.toThrow(UnauthorizedError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Admin happy path — ADMIN role succeeds
// ═══════════════════════════════════════════════════════════════════════════════

describe("admin mutations — ADMIN role succeeds", () => {
  it("creates, updates and soft-deletes a product", async () => {
    const cat = await createCategory(prisma);

    const product = await adminCreateProduct(prisma, "ADMIN", {
      name: "חולצת טסט", categoryId: cat.id,
      description: "תיאור ארוך מספיק לבדיקה", basePrice: 15000, images: [],
    });
    expect(product.basePrice).toBe(15000);
    expect(product.isActive).toBe(true);

    const updated = await adminUpdateProduct(prisma, "ADMIN", product.id, { basePrice: 20000 });
    expect(updated.basePrice).toBe(20000);

    const deleted = await adminSoftDeleteProduct(prisma, "ADMIN", product.id);
    expect(deleted.isActive).toBe(false);
    // still in DB (not hard-deleted)
    const inDb = await prisma.product.findUnique({ where: { id: product.id } });
    expect(inDb).not.toBeNull();
  });

  it("creates, updates and soft-deletes a variant", async () => {
    const cat = await createCategory(prisma);
    const p = await createProduct(prisma, cat.id);

    const v = await adminCreateVariant(prisma, "ADMIN", {
      productId: p.id, sku: "ADM-SKU-1", size: "L", color: "כחול", stock: 10,
    });
    expect(v.stock).toBe(10);

    const updated = await adminUpdateVariant(prisma, "ADMIN", v.id, { stock: 50 });
    expect(updated.stock).toBe(50);

    const deleted = await adminSoftDeleteVariant(prisma, "ADMIN", v.id);
    expect(deleted.isActive).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Soft-delete invariant — DB refuses hard-delete of ordered variant
// ═══════════════════════════════════════════════════════════════════════════════

describe("soft-delete invariant", () => {
  it("DB FK constraint refuses hard-delete of a variant referenced by an order", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    await placeOrder(prisma, user.id, ADDRESS);

    // Hard-delete attempt → DB must throw (FK RESTRICT on OrderItem.variantId)
    await expect(
      prisma.productVariant.delete({ where: { id: variant.id } })
    ).rejects.toThrow();

    // Soft-delete via admin logic is safe
    const softDeleted = await adminSoftDeleteVariant(prisma, "ADMIN", variant.id);
    expect(softDeleted.isActive).toBe(false);

    // Variant still exists in DB for receipt integrity
    const inDb = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(inDb).not.toBeNull();
  });

  it("soft-delete of product does not affect existing order snapshots", async () => {
    const { variant, product } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id, 2);
    const order = await placeOrder(prisma, user.id, ADDRESS);

    await adminSoftDeleteProduct(prisma, "ADMIN", product.id);

    // Order receipt still intact
    const item = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
    expect(item!.productName).toBeTruthy();
    expect(item!.priceAtTime).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Order status transitions
// ═══════════════════════════════════════════════════════════════════════════════

describe("adminUpdateOrderStatus", () => {
  it("valid transition PAID → PROCESSING succeeds", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);
    // Phase 6: placeOrder creates PENDING; fulfillOrder advances to PAID
    await fulfillOrder(prisma, order.id, "evt_admin_transition_001");

    const updated = await adminUpdateOrderStatus(prisma, "ADMIN", order.id, "PROCESSING");
    expect(updated.status).toBe("PROCESSING");
  });

  it("invalid transition DELIVERED → PENDING throws InvalidStatusTransitionError", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);
    // Phase 6: must reach PAID via fulfillOrder before admin transitions
    await fulfillOrder(prisma, order.id, "evt_admin_transition_002");

    // Walk to DELIVERED via valid transitions
    await adminUpdateOrderStatus(prisma, "ADMIN", order.id, "PROCESSING");
    await adminUpdateOrderStatus(prisma, "ADMIN", order.id, "SHIPPED");
    await adminUpdateOrderStatus(prisma, "ADMIN", order.id, "DELIVERED");

    await expect(
      adminUpdateOrderStatus(prisma, "ADMIN", order.id, "PENDING")
    ).rejects.toThrow(InvalidStatusTransitionError);
  });

  it("invalid transition CANCELLED → PROCESSING throws InvalidStatusTransitionError", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);
    await fulfillOrder(prisma, order.id, "evt_admin_transition_003");

    await adminUpdateOrderStatus(prisma, "ADMIN", order.id, "CANCELLED");
    await expect(
      adminUpdateOrderStatus(prisma, "ADMIN", order.id, "PROCESSING")
    ).rejects.toThrow(InvalidStatusTransitionError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. placeOrder status fix — v1 mock payment → PAID on creation
// ═══════════════════════════════════════════════════════════════════════════════

describe("placeOrder default status", () => {
  it("newly created order defaults to PENDING (awaiting Stripe payment confirmation)", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);
    expect(order.status).toBe("PENDING");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Account order history ownership (getOrdersForUser isolation)
// ═══════════════════════════════════════════════════════════════════════════════

describe("account — getOrdersForUser isolation", () => {
  it("user sees only their own orders, not other users'", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 10 });

    const userA = await seedUserWithCart(variant.id, 2);
    const userB = await seedUserWithCart(variant.id, 1);

    await placeOrder(prisma, userA.id, ADDRESS);
    await placeOrder(prisma, userB.id, ADDRESS);

    const ordersA = await getOrdersForUser(prisma, userA.id);
    const ordersB = await getOrdersForUser(prisma, userB.id);

    expect(ordersA).toHaveLength(1);
    expect(ordersB).toHaveLength(1);
    expect(ordersA[0].userId).toBe(userA.id);
    expect(ordersB[0].userId).toBe(userB.id);

    // Cross-contamination check: neither list contains the other user's order
    const allOrderIds = [...ordersA, ...ordersB].map((o) => o.id);
    expect(new Set(allOrderIds).size).toBe(2); // 2 distinct orders, no overlap
  });

  it("user with no orders gets an empty list (not another user's orders)", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const userA = await seedUserWithCart(variant.id);
    await placeOrder(prisma, userA.id, ADDRESS);

    const userB = await createUser(prisma); // no orders
    const ordersB = await getOrdersForUser(prisma, userB.id);
    expect(ordersB).toHaveLength(0);
  });
});
