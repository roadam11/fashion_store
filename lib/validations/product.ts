import { z } from "zod";

export const catalogParamsSchema = z.object({
  category: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().optional(),
});

export type CatalogParams = z.infer<typeof catalogParamsSchema>;
