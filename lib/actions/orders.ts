"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { placeOrder, getOrdersForUser, getOrderById } from "@/lib/orders/logic";
import { shippingAddressSchema } from "@/lib/validations/checkout";

function requireAuth() {
  // Thin helper — every public export calls this.
  return auth().then((session) => {
    if (!session?.user?.id) redirect("/auth/login");
    return session.user.id;
  });
}

// Client payload: ONLY the shipping address (items/prices fetched from DB in placeOrder).
export async function placeOrderAction(rawAddress: unknown) {
  const userId = await requireAuth();
  const address = shippingAddressSchema.parse(rawAddress);
  return placeOrder(prisma, userId, address);
}

export async function getOrdersAction() {
  const userId = await requireAuth();
  return getOrdersForUser(prisma, userId);
}

export async function getOrderByIdAction(orderId: string) {
  const userId = await requireAuth();
  return getOrderById(prisma, orderId, userId);
}
