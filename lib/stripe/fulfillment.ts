import Stripe from "stripe";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { OutOfStockError } from "@/lib/orders/logic";

// ─── Signature verification ───────────────────────────────────────────────────
// Thin wrapper so tests can call this directly without an HTTP layer.

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_000");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────
//
// Called from the webhook handler after signature verification.
// Idempotent: if stripeEventId already exists in ProcessedEvent, returns early.
// Atomic: all writes (stock decrement, status update, cart clear) are in one
// transaction. If any step fails (e.g. out of stock), nothing is committed and
// the webhook handler returns 500 so Stripe will retry.

export async function fulfillOrder(
  prisma: PrismaClient,
  orderId: string,
  stripeEventId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency check — upsert will fail silently if already processed
    const existing = await tx.processedEvent.findUnique({
      where: { id: stripeEventId },
    });
    if (existing) return; // already fulfilled — safe to re-ack to Stripe

    // Lock the order row and fetch items
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    // Atomic stock decrement — the anti-overselling invariant
    for (const item of order.items) {
      const res = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (res.count === 0) throw new OutOfStockError(item.variantId);
    }

    // Advance order status to PAID
    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });

    // Clear the user's cart (order now owns the intent)
    await tx.cartItem.deleteMany({ where: { userId: order.userId } });

    // Record this event as processed — prevents double-fulfillment on retry
    await tx.processedEvent.create({ data: { id: stripeEventId } });
  });
}
