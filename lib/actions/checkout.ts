"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { placeOrder } from "@/lib/orders/logic";
import { fulfillOrder } from "@/lib/stripe/fulfillment";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/validations/checkout";
import {
  getAddressForUser,
  saveAddressForUser,
} from "@/lib/checkout/logic";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const MOCK_PAYMENTS = process.env.MOCK_PAYMENTS === "true";

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Mock path: skip Stripe entirely, fulfill immediately, redirect to success page
async function buildAndFulfillLocally(userId: string, address: ShippingAddress) {
  const order = await placeOrder(prisma, userId, address);
  // Use a synthetic event ID so the ProcessedEvent dedup table stays consistent
  const mockEventId = `mock_${order.id}`;
  await fulfillOrder(prisma, order.id, mockEventId);
  return { url: `${BASE_URL}/checkout/success?order=${order.id}` };
}

async function buildAndRedirectToStripe(userId: string, address: ShippingAddress) {
  if (MOCK_PAYMENTS) return buildAndFulfillLocally(userId, address);

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
    success_url: `${BASE_URL}/checkout/success?order=${order.id}`,
    cancel_url: `${BASE_URL}/checkout/cancel`,
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
