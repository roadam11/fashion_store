import type { PrismaClient } from "@/app/generated/prisma/client";

type CartOwner =
  | { userId: string; sessionId?: never }
  | { sessionId: string; userId?: never };

export class CartOwnershipError extends Error {
  constructor() {
    super("Cart item does not belong to this owner");
    this.name = "CartOwnershipError";
  }
}

function ownerWhere(owner: CartOwner) {
  return owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId };
}

function uniqueKey(owner: CartOwner, variantId: string) {
  if (owner.userId) {
    return { userId_variantId: { userId: owner.userId, variantId } };
  }
  return { sessionId_variantId: { sessionId: owner.sessionId!, variantId } };
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getCartItems(prisma: PrismaClient, owner: CartOwner) {
  return prisma.cartItem.findMany({
    where: ownerWhere(owner),
    include: {
      variant: {
        include: { product: { select: { id: true, name: true, slug: true, basePrice: true, images: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Mutate ──────────────────────────────────────────────────────────────────

export async function addToCart(
  prisma: PrismaClient,
  owner: CartOwner,
  variantId: string,
  quantity: number
) {
  // Prisma upsert maps to INSERT … ON CONFLICT DO UPDATE — fully atomic, no TOCTOU.
  return prisma.cartItem.upsert({
    where: uniqueKey(owner, variantId),
    update: { quantity: { increment: quantity } },
    create: { ...ownerWhere(owner), variantId, quantity },
  });
}

export async function updateCartItemQuantity(
  prisma: PrismaClient,
  owner: CartOwner,
  cartItemId: string,
  quantity: number
) {
  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
  if (!item) throw new Error("Cart item not found");

  const owned = owner.userId
    ? item.userId === owner.userId
    : item.sessionId === owner.sessionId;
  if (!owned) throw new CartOwnershipError();

  return prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
}

export async function removeCartItem(
  prisma: PrismaClient,
  owner: CartOwner,
  cartItemId: string
) {
  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
  if (!item) throw new Error("Cart item not found");

  const owned = owner.userId
    ? item.userId === owner.userId
    : item.sessionId === owner.sessionId;
  if (!owned) throw new CartOwnershipError();

  return prisma.cartItem.delete({ where: { id: cartItemId } });
}

// ─── Merge (guest → user on login) ───────────────────────────────────────────

export async function mergeGuestCart(
  prisma: PrismaClient,
  { userId, sessionId }: { userId: string; sessionId: string }
) {
  const guestItems = await prisma.cartItem.findMany({ where: { sessionId } });
  if (guestItems.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const item of guestItems) {
      const existing = await tx.cartItem.findUnique({
        where: { userId_variantId: { userId, variantId: item.variantId } },
      });

      if (existing) {
        // Overlap: sum quantities, discard guest row
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
        await tx.cartItem.delete({ where: { id: item.id } });
      } else {
        // No overlap: transfer ownership
        await tx.cartItem.update({
          where: { id: item.id },
          data: { userId, sessionId: null },
        });
      }
    }
  });
}
