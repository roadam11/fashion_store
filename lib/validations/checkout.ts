import { z } from "zod";

export const shippingAddressSchema = z.object({
  street: z.string().min(2),
  city: z.string().min(2),
  zipCode: z.string().min(4),
  country: z.string().min(2).default("Israel"),
  phone: z.string().regex(/^\+?[\d\s\-()\u05d0-\u05ea]{7,20}$/, "מספר טלפון לא תקין"),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
