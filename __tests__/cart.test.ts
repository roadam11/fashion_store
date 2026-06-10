import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getTestClient, cleanDb } from "./helpers/db";
import { createUser, createVariantWithProduct } from "./factories";
import {
  addToCart,
  getCartItems,
  removeCartItem,
  updateCartItemQuantity,
  mergeGuestCart,
  CartOwnershipError,
} from "@/lib/cart/logic";

const prisma = getTestClient();

beforeEach(() => cleanDb(prisma));
afterAll(() => prisma.$disconnect());

// ─── 1. Merge sums quantities — no duplicate rows ─────────────────────────────

describe("mergeGuestCart", () => {
  it("sums quantities when user already has the same variant — @@unique holds", async () => {
    const user = await createUser(prisma);
    const { variant } = await createVariantWithProduct(prisma);
    const sessionId = "session-merge-test";

    // Guest has qty 2
    await prisma.cartItem.create({ data: { sessionId, variantId: variant.id, quantity: 2 } });
    // User already has qty 3 for same variant
    await prisma.cartItem.create({ data: { userId: user.id, variantId: variant.id, quantity: 3 } });

    await mergeGuestCart(prisma, { userId: user.id, sessionId });

    const userItems = await prisma.cartItem.findMany({ where: { userId: user.id } });
    expect(userItems).toHaveLength(1);
    expect(userItems[0].quantity).toBe(5); // 2 + 3

    const guestItems = await prisma.cartItem.findMany({ where: { sessionId } });
    expect(guestItems).toHaveLength(0); // guest row deleted
  });

  it("transfers items with no overlap — sessionId cleared, userId set", async () => {
    const user = await createUser(prisma);
    const { variant: v1 } = await createVariantWithProduct(prisma);
    const { variant: v2 } = await createVariantWithProduct(prisma);
    const sessionId = "session-transfer-test";

    await prisma.cartItem.createMany({
      data: [
        { sessionId, variantId: v1.id, quantity: 1 },
        { sessionId, variantId: v2.id, quantity: 2 },
      ],
    });

    await mergeGuestCart(prisma, { userId: user.id, sessionId });

    const userItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(userItems).toHaveLength(2);
    expect(userItems.every((i) => i.sessionId === null)).toBe(true);

    const guestItems = await prisma.cartItem.findMany({ where: { sessionId } });
    expect(guestItems).toHaveLength(0);
  });

  it("is a no-op when guest cart is empty", async () => {
    const user = await createUser(prisma);
    await expect(
      mergeGuestCart(prisma, { userId: user.id, sessionId: "no-items-session" })
    ).resolves.toBeUndefined();
  });
});

// ─── 2. Ownership — user A cannot read or mutate user B's cart ────────────────

describe("cart ownership", () => {
  it("getCartItems returns only items belonging to the requesting user", async () => {
    const userA = await createUser(prisma, { email: "a@test.com" });
    const userB = await createUser(prisma, { email: "b@test.com" });
    const { variant } = await createVariantWithProduct(prisma);

    await addToCart(prisma, { userId: userB.id }, variant.id, 3);

    const cartA = await getCartItems(prisma, { userId: userA.id });
    expect(cartA).toHaveLength(0); // A sees nothing of B's cart
  });

  it("removeCartItem throws CartOwnershipError when user targets another user's item", async () => {
    const userA = await createUser(prisma, { email: "a2@test.com" });
    const userB = await createUser(prisma, { email: "b2@test.com" });
    const { variant } = await createVariantWithProduct(prisma);

    const item = await addToCart(prisma, { userId: userB.id }, variant.id, 1);

    await expect(
      removeCartItem(prisma, { userId: userA.id }, item.id)
    ).rejects.toThrow(CartOwnershipError);
  });

  it("updateCartItemQuantity throws CartOwnershipError when user targets another user's item", async () => {
    const userA = await createUser(prisma, { email: "a3@test.com" });
    const userB = await createUser(prisma, { email: "b3@test.com" });
    const { variant } = await createVariantWithProduct(prisma);

    const item = await addToCart(prisma, { userId: userB.id }, variant.id, 1);

    await expect(
      updateCartItemQuantity(prisma, { userId: userA.id }, item.id, 5)
    ).rejects.toThrow(CartOwnershipError);
  });

  it("guest sessionId isolation — different sessions cannot see each other's items", async () => {
    const { variant } = await createVariantWithProduct(prisma);

    await addToCart(prisma, { sessionId: "session-alice" }, variant.id, 2);

    const bobCart = await getCartItems(prisma, { sessionId: "session-bob" });
    expect(bobCart).toHaveLength(0);
  });
});

// ─── 3. sessionId → userId transfer on login ─────────────────────────────────

describe("addToCart idempotency", () => {
  it("adding same variant twice increments quantity — no duplicate rows", async () => {
    const user = await createUser(prisma);
    const { variant } = await createVariantWithProduct(prisma);

    await addToCart(prisma, { userId: user.id }, variant.id, 2);
    await addToCart(prisma, { userId: user.id }, variant.id, 3);

    const items = await prisma.cartItem.findMany({ where: { userId: user.id } });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it("adding same variant twice as guest increments quantity — @@unique holds", async () => {
    const { variant } = await createVariantWithProduct(prisma);
    const sessionId = "session-idem";

    await addToCart(prisma, { sessionId }, variant.id, 1);
    await addToCart(prisma, { sessionId }, variant.id, 4);

    const items = await prisma.cartItem.findMany({ where: { sessionId } });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });
});
