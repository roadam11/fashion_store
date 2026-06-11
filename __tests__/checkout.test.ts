/**
 * Checkout — server-side tests.
 *
 * Covers:
 *   1. saveAddressForUser — persists address, rejects invalid data
 *   2. getAddressForUser  — returns address when owned, throws on IDOR / missing
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ZodError } from "zod";
import { getTestClient, cleanDb } from "./helpers/db";
import { createUser } from "./factories";
import {
  saveAddressForUser,
  getAddressForUser,
  AddressNotFoundError,
} from "@/lib/checkout/logic";

const prisma = getTestClient();

beforeEach(() => cleanDb(prisma));
afterAll(() => prisma.$disconnect());

const VALID_ADDRESS = {
  street: "הרצל 1",
  city: "תל אביב",
  zipCode: "6100000",
  country: "Israel",
  phone: "050-1234567",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. saveAddressForUser
// ═══════════════════════════════════════════════════════════════════════════════

describe("saveAddressForUser", () => {
  it("persists address in DB under the correct userId", async () => {
    const user = await createUser(prisma);
    const addr = await saveAddressForUser(prisma, user.id, VALID_ADDRESS);

    expect(addr.userId).toBe(user.id);
    expect(addr.street).toBe("הרצל 1");
    expect(addr.city).toBe("תל אביב");
    expect(addr.zipCode).toBe("6100000");
    expect(addr.phone).toBe("050-1234567");
  });

  it("throws ZodError when phone is invalid", async () => {
    const user = await createUser(prisma);
    await expect(
      saveAddressForUser(prisma, user.id, { ...VALID_ADDRESS, phone: "abc" })
    ).rejects.toThrow(ZodError);
  });

  it("throws ZodError when street is too short", async () => {
    const user = await createUser(prisma);
    await expect(
      saveAddressForUser(prisma, user.id, { ...VALID_ADDRESS, street: "א" })
    ).rejects.toThrow(ZodError);
  });

  it("throws ZodError when city is too short", async () => {
    const user = await createUser(prisma);
    await expect(
      saveAddressForUser(prisma, user.id, { ...VALID_ADDRESS, city: "ת" })
    ).rejects.toThrow(ZodError);
  });

  it("multiple addresses can be saved for the same user", async () => {
    const user = await createUser(prisma);
    await saveAddressForUser(prisma, user.id, VALID_ADDRESS);
    await saveAddressForUser(prisma, user.id, { ...VALID_ADDRESS, street: "דיזנגוף 50" });

    const count = await prisma.address.count({ where: { userId: user.id } });
    expect(count).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. getAddressForUser — IDOR protection
// ═══════════════════════════════════════════════════════════════════════════════

describe("getAddressForUser — IDOR protection", () => {
  it("returns the address when it belongs to the requesting user", async () => {
    const user = await createUser(prisma);
    const saved = await saveAddressForUser(prisma, user.id, VALID_ADDRESS);

    const fetched = await getAddressForUser(prisma, user.id, saved.id);
    expect(fetched.id).toBe(saved.id);
    expect(fetched.userId).toBe(user.id);
  });

  it("throws AddressNotFoundError when address belongs to a different user", async () => {
    const userA = await createUser(prisma);
    const userB = await createUser(prisma);
    const addrA = await saveAddressForUser(prisma, userA.id, VALID_ADDRESS);

    // User B attempts to access User A's address — IDOR attack
    await expect(
      getAddressForUser(prisma, userB.id, addrA.id)
    ).rejects.toThrow(AddressNotFoundError);
  });

  it("throws AddressNotFoundError when the address ID does not exist", async () => {
    const user = await createUser(prisma);
    await expect(
      getAddressForUser(prisma, user.id, "nonexistent-address-id")
    ).rejects.toThrow(AddressNotFoundError);
  });

  it("user A cannot use user B's address even if they know the ID", async () => {
    const userA = await createUser(prisma);
    const userB = await createUser(prisma);
    const addrB = await saveAddressForUser(prisma, userB.id, {
      ...VALID_ADDRESS,
      street: "רחוב פרטי 7",
    });

    await expect(
      getAddressForUser(prisma, userA.id, addrB.id)
    ).rejects.toThrow(AddressNotFoundError);

    // Sanity: userB can still access their own address
    const fetched = await getAddressForUser(prisma, userB.id, addrB.id);
    expect(fetched.street).toBe("רחוב פרטי 7");
  });
});
