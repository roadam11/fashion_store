import type { PrismaClient } from "@/app/generated/prisma/client";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/validations/checkout";

// ─── Domain errors ────────────────────────────────────────────────────────────

export class AddressNotFoundError extends Error {
  constructor(addressId: string) {
    super(`Address not found: ${addressId}`);
    this.name = "AddressNotFoundError";
  }
}

// ─── Address management ───────────────────────────────────────────────────────

export async function getAddressForUser(
  prisma: PrismaClient,
  userId: string,
  addressId: string
) {
  const addr = await prisma.address.findUnique({ where: { id: addressId } });
  // Reject if address doesn't exist OR belongs to a different user (IDOR)
  if (!addr || addr.userId !== userId) throw new AddressNotFoundError(addressId);
  return addr;
}

export async function saveAddressForUser(
  prisma: PrismaClient,
  userId: string,
  data: ShippingAddress
) {
  const validated = shippingAddressSchema.parse(data);
  return prisma.address.create({
    data: {
      userId,
      street: validated.street,
      city: validated.city,
      zipCode: validated.zipCode,
      country: validated.country,
      phone: validated.phone,
    },
  });
}

export async function getSavedAddresses(prisma: PrismaClient, userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
