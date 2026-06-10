"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminSoftDeleteProduct,
  adminCreateVariant,
  adminUpdateVariant,
  adminSoftDeleteVariant,
  adminUpdateOrderStatus,
  getDashboardStats,
  UnauthorizedError,
} from "@/lib/admin/logic";
import { uploadProductImage } from "@/lib/cloudinary";
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
} from "@/lib/validations/admin";

async function getAdminRole(): Promise<string> {
  const session = await auth();
  // Pass the actual role into the logic — logic re-checks it.
  // If session is missing, pass "ANONYMOUS" so logic throws UnauthorizedError.
  return session?.user?.role ?? "ANONYMOUS";
}

// ─── Image upload ─────────────────────────────────────────────────────────────

export async function uploadProductImageAction(formData: FormData) {
  const role = await getAdminRole();
  if (role !== "ADMIN") throw new UnauthorizedError();

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadProductImage(buffer, file.name);
}

// ─── Product actions ──────────────────────────────────────────────────────────

export async function createProductAction(rawData: unknown) {
  const role = await getAdminRole();
  const data = createProductSchema.parse(rawData);
  const product = await adminCreateProduct(prisma, role, data);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return product;
}

export async function updateProductAction(productId: string, rawData: unknown) {
  const role = await getAdminRole();
  const data = updateProductSchema.parse(rawData);
  const product = await adminUpdateProduct(prisma, role, productId, data);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return product;
}

export async function softDeleteProductAction(productId: string) {
  const role = await getAdminRole();
  const product = await adminSoftDeleteProduct(prisma, role, productId);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return product;
}

// ─── Variant actions ──────────────────────────────────────────────────────────

export async function createVariantAction(rawData: unknown) {
  const role = await getAdminRole();
  const data = createVariantSchema.parse(rawData);
  const variant = await adminCreateVariant(prisma, role, data);
  revalidatePath("/admin/products");
  return variant;
}

export async function updateVariantAction(variantId: string, rawData: unknown) {
  const role = await getAdminRole();
  const data = updateVariantSchema.parse(rawData);
  const variant = await adminUpdateVariant(prisma, role, variantId, data);
  revalidatePath("/admin/products");
  return variant;
}

export async function softDeleteVariantAction(variantId: string) {
  const role = await getAdminRole();
  const variant = await adminSoftDeleteVariant(prisma, role, variantId);
  revalidatePath("/admin/products");
  return variant;
}

// ─── Order status ─────────────────────────────────────────────────────────────

export async function updateOrderStatusAction(orderId: string, newStatus: string) {
  const role = await getAdminRole();
  const order = await adminUpdateOrderStatus(prisma, role, orderId, newStatus);
  revalidatePath("/admin/orders");
  return order;
}

// ─── Dashboard stats (read-only — ADMIN check via middleware + page guard) ───

export async function getDashboardStatsAction() {
  const role = await getAdminRole();
  if (role !== "ADMIN") throw new UnauthorizedError();
  return getDashboardStats(prisma);
}
