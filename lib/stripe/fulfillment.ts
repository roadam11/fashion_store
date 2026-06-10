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
//
// Happy path (stock available):
//   Single atomic transaction: idempotency check → stock decrement →
//   order → PAID → cart clear → ProcessedEvent insert.
//   Same event ID delivered twice = no-op (dedup via ProcessedEvent).
//
// Sad path (stock exhausted after customer paid):
//   Main transaction throws OutOfStockError and rolls back (no partial decrement).
//   A second transaction marks the order NEEDS_ATTENTION and writes ProcessedEvent
//   so Stripe retries see the dedup record and get 200 — no infinite retry loop.
//   Admin must resolve manually (issue refund in Stripe dashboard → update to REFUNDED).
//
// Any other error re-throws → webhook returns 500 → Stripe retries (transient fault).

export async function fulfillOrder(
  prisma: PrismaClient,
  orderId: string,
  stripeEventId: string
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.processedEvent.findUnique({
        where: { id: stripeEventId },
      });
      if (existing) return;

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      // Atomic stock decrement — anti-overselling invariant
      for (const item of order.items) {
        const res = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (res.count === 0) throw new OutOfStockError(item.variantId);
      }

      await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      await tx.cartItem.deleteMany({ where: { userId: order.userId } });
      await tx.processedEvent.create({ data: { id: stripeEventId } });
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      // Customer was charged but stock is exhausted — no rollback-safe refund here.
      // Mark for admin attention; commit ProcessedEvent so Stripe stops retrying.
      await prisma.$transaction(async (tx) => {
        // Re-check: a concurrent delivery may have already handled this
        const alreadyHandled = await tx.processedEvent.findUnique({
          where: { id: stripeEventId },
        });
        if (alreadyHandled) return;
        await tx.order.update({
          where: { id: orderId },
          data: { status: "NEEDS_ATTENTION" },
        });
        await tx.processedEvent.create({ data: { id: stripeEventId } });
      });
      return; // don't rethrow — webhook returns 200, Stripe stops retrying
    }
    throw err; // transient fault → webhook returns 500 → Stripe retries
  }
}
