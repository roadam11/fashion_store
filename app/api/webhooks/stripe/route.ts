import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature, fulfillOrder } from "@/lib/stripe/fulfillment";

// Disable body parsing — Stripe requires the raw body for signature verification
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;
  try {
    event = verifyWebhookSignature(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      metadata?: { orderId?: string };
    };

    // Guard: only fulfill on confirmed payment.
    // Unpaid completions (free sessions, buy-now-pay-later in async PROCESSING
    // state) must NOT touch stock or order status — silently ack and move on.
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const orderId = session.metadata?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId in metadata" }, { status: 400 });
    }

    try {
      await fulfillOrder(prisma, orderId, event.id);
    } catch (err) {
      // Only transient errors reach here (OutOfStockError is caught inside
      // fulfillOrder and resolved as NEEDS_ATTENTION). Return 500 so Stripe retries.
      console.error("[stripe webhook] fulfillOrder failed:", err);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }
  // All other event types (payment_intent.payment_failed, checkout.session.expired,
  // checkout.session.async_payment_failed, etc.) fall through here — silently acked.

  return NextResponse.json({ received: true });
}
