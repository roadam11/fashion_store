import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const updateCartSchema = z.object({
  cartItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const removeCartSchema = z.object({
  cartItemId: z.string().min(1),
});
