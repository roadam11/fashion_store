"use server";

import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  addToCart,
  getCartItems,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart/logic";
import { addToCartSchema, removeCartSchema, updateCartSchema } from "@/lib/validations/cart";

// Cart merge on login is handled in lib/auth.ts signIn callback — single source of truth.

async function getOwner() {
  const session = await auth();
  if (session?.user?.id) return { userId: session.user.id };
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;
  if (!sessionId) throw new Error("No session");
  return { sessionId };
}

export async function getCartAction() {
  const owner = await getOwner();
  return getCartItems(prisma, owner);
}

export async function addToCartAction(variantId: string, quantity: number) {
  const parsed = addToCartSchema.parse({ variantId, quantity });
  const owner = await getOwner();
  return addToCart(prisma, owner, parsed.variantId, parsed.quantity);
}

export async function updateCartItemAction(cartItemId: string, quantity: number) {
  const parsed = updateCartSchema.parse({ cartItemId, quantity });
  const owner = await getOwner();
  return updateCartItemQuantity(prisma, owner, parsed.cartItemId, parsed.quantity);
}

export async function removeCartItemAction(cartItemId: string) {
  const parsed = removeCartSchema.parse({ cartItemId });
  const owner = await getOwner();
  return removeCartItem(prisma, owner, parsed.cartItemId);
}
