/**
 * Phase 6 — Stripe canary tests (written RED before any implementation).
 *
 * Three contracts:
 *   1. placeOrder creates PENDING order — stock NOT decremented, cart NOT cleared
 *   2. verifyWebhookSignature rejects bad/missing signatures, accepts valid ones
 *   3. fulfillOrder is idempotent — processing the same Stripe event ID twice
 *      decrements stock exactly once and creates exactly one ProcessedEvent row
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import Stripe from "stripe";
import { getTestClient, cleanDb } from "./helpers/db";
import {
  createUser,
  createVariantWithProduct,
} from "./factories";
import { placeOrder } from "@/lib/orders/logic";
import {
  fulfillOrder,
  verifyWebhookSignature,
} from "@/lib/stripe/fulfillment";
import type { ShippingAddress } from "@/lib/validations/checkout";

const prisma = getTestClient();

const ADDRESS: ShippingAddress = {
  street: "הרצל 1",
  city: "תל אביב",
  zipCode: "6100000",
  country: "Israel",
  phone: "050-1234567",
};

const FAKE_WEBHOOK_SECRET = "whsec_test_secret_for_canary_tests_only";

beforeEach(() => cleanDb(prisma));
afterAll(() => prisma.$disconnect());

// ─── Helper ───────────────────────────────────────────────────────────────────

async function seedUserWithCart(variantId: string, qty = 1) {
  const user = await createUser(prisma);
  await prisma.cartItem.create({
    data: { userId: user.id, variantId, quantity: qty },
  });
  return user;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Canary 1 — placeOrder creates PENDING, stock and cart untouched
// ═══════════════════════════════════════════════════════════════════════════════

describe("Canary 1 — placeOrder (Phase 6 behaviour)", () => {
  it("creates order with status PENDING", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);
    expect(order.status).toBe("PENDING");
  });

  it("does NOT decrement stock", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id, 2);
    await placeOrder(prisma, user.id, ADDRESS);
    const v = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(v.stock).toBe(5); // unchanged
  });

  it("does NOT clear the cart", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    await placeOrder(prisma, user.id, ADDRESS);
    const cartCount = await prisma.cartItem.count({
      where: { userId: user.id },
    });
    expect(cartCount).toBe(1); // still in cart until payment confirmed
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Canary 2 — verifyWebhookSignature rejects bad/missing, accepts valid
// ═══════════════════════════════════════════════════════════════════════════════

describe("Canary 2 — webhook signature verification", () => {
  const payload = JSON.stringify({
    id: "evt_test_001",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_abc", metadata: { orderId: "order_1" } } },
  });

  it("throws on missing / wrong signature", () => {
    expect(() =>
      verifyWebhookSignature(payload, "bad-signature", FAKE_WEBHOOK_SECRET)
    ).toThrow();

    expect(() =>
      verifyWebhookSignature(payload, "", FAKE_WEBHOOK_SECRET)
    ).toThrow();
  });

  it("returns the event when signature is valid", () => {
    const stripe = new Stripe("sk_test_000");
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: FAKE_WEBHOOK_SECRET,
    });
    const event = verifyWebhookSignature(payload, header, FAKE_WEBHOOK_SECRET);
    expect(event.id).toBe("evt_test_001");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Canary 3 — fulfillOrder is idempotent (same event ID processed twice = once)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Canary 3 — fulfillOrder idempotency", () => {
  it("stock decremented exactly once when same event delivered twice", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id, 2);
    const order = await placeOrder(prisma, user.id, ADDRESS);

    const EVT = "evt_idempotency_test_001";

    // First delivery — should fulfill
    await fulfillOrder(prisma, order.id, EVT);

    // Second delivery — same event, should be a no-op
    await fulfillOrder(prisma, order.id, EVT);

    const v = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(v.stock).toBe(3); // 5 - 2 = 3, NOT 5 - 4 = 1

    const evtCount = await prisma.processedEvent.count({
      where: { id: EVT },
    });
    expect(evtCount).toBe(1); // exactly one dedup record
  });

  it("cart cleared exactly once (idempotent cart clear)", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);

    const EVT = "evt_idempotency_test_002";
    await fulfillOrder(prisma, order.id, EVT);
    await fulfillOrder(prisma, order.id, EVT); // no-op

    const cartCount = await prisma.cartItem.count({
      where: { userId: user.id },
    });
    expect(cartCount).toBe(0);
  });

  it("order status is PAID after fulfillment", async () => {
    const { variant } = await createVariantWithProduct(prisma, { stock: 5 });
    const user = await seedUserWithCart(variant.id);
    const order = await placeOrder(prisma, user.id, ADDRESS);

    await fulfillOrder(prisma, order.id, "evt_idempotency_test_003");

    const fulfilled = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(fulfilled.status).toBe("PAID");
  });
});
