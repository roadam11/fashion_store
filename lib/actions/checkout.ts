"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { placeOrder } from "@/lib/orders/logic";
import type { ShippingAddress } from "@/lib/validations/checkout";

export async function createCheckoutSessionAction(address: ShippingAddress) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const userId = session.user.id;
  const stripe = getStripe();

  // Create PENDING order — no stock decrement yet
  const order = await placeOrder(prisma, userId, address);

  // Build line items from the order's snapshot (server-authoritative prices)
  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: "ils",
      product_data: { name: `${item.productName} (${item.size} / ${item.color})` },
      unit_amount: item.priceAtTime, // already in agorot (= Stripe's smallest unit for ILS)
    },
    quantity: item.quantity,
  }));

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: { orderId: order.id },
    success_url: `${process.env.NEXTAUTH_URL}/account?order=${order.id}&status=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/checkout?cancelled=true`,
  });

  // Persist the Stripe session ID so the webhook can look up the order
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return { url: checkoutSession.url! };
}
