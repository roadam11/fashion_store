import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().min(1),
  description: z.string().min(10),
  basePrice: z.number().int().positive(), // always agorot, never Float
  images: z.array(z.string()).default([]),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  categoryId: z.string().min(1).optional(),
  description: z.string().min(10).optional(),
  basePrice: z.number().int().positive().optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const createVariantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  stock: z.number().int().nonnegative(),
  priceOverride: z.number().int().positive().nullable().optional(),
});

export const updateVariantSchema = z.object({
  sku: z.string().min(1).optional(),
  size: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  stock: z.number().int().nonnegative().optional(),
  priceOverride: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateOrderStatusSchema = z.object({
  newStatus: z.enum([
    "PENDING", "PAID", "PROCESSING", "SHIPPED",
    "DELIVERED", "CANCELLED", "REFUNDED",
  ]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
