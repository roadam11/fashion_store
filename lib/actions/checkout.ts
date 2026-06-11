"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { placeOrder } from "@/lib/orders/logic";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/validations/checkout";
import {
  getAddressForUser,
  saveAddressForUser,
} from "@/lib/checkout/logic";

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

async function buildAndRedirectToStripe(userId: string, address: ShippingAddress) {
  const stripe = getStripe();
  const order = await placeOrder(prisma, userId, address);

  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: "ils",
      product_data: { name: `${item.productName} (${item.size} / ${item.color})` },
      unit_amount: item.priceAtTime, // agorot — Stripe's smallest ILS unit
    },
    quantity: item.quantity,
  }));

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: { orderId: order.id },
    success_url: `${process.env.NEXTAUTH_URL}/checkout/success?order=${order.id}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/checkout/cancel`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return { url: checkoutSession.url! };
}

// ─── Public actions ───────────────────────────────────────────────────────────

export async function createCheckoutSessionAction(address: ShippingAddress) {
  const userId = await requireAuth();
  const validated = shippingAddressSchema.parse(address);
  return buildAndRedirectToStripe(userId, validated);
}

export async function createCheckoutFromSavedAddressAction(addressId: string) {
  const userId = await requireAuth();
  // IDOR guard: throws AddressNotFoundError if address doesn't belong to this user
  const saved = await getAddressForUser(prisma, userId, addressId);
  const address: ShippingAddress = {
    street: saved.street,
    city: saved.city,
    zipCode: saved.zipCode,
    country: saved.country,
    phone: saved.phone,
  };
  return buildAndRedirectToStripe(userId, address);
}

export async function saveAddressAction(data: ShippingAddress) {
  const userId = await requireAuth();
  return saveAddressForUser(prisma, userId, data);
}
