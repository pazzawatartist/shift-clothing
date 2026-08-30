import { z } from "zod";

export const returnItemSchema = z
  .object({
    order_item_id: z.string().uuid(),
    product_variant_id: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
    action: z.enum(["refund", "exchange"]),
    exchange_variant_id: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.action !== "exchange" || !!data.exchange_variant_id, {
    message: "Select a variant to exchange for",
    path: ["exchange_variant_id"],
  });
export type ReturnItemInput = z.infer<typeof returnItemSchema>;

export const createReturnSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.enum(["wrong_size", "wrong_color", "damaged", "defective", "change_of_mind", "other"]),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(returnItemSchema).min(1, "Select at least one item to return"),
});
export type CreateReturnInput = z.infer<typeof createReturnSchema>;

export const resolveReturnSchema = z.object({
  return_id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "completed"]),
});
export type ResolveReturnInput = z.infer<typeof resolveReturnSchema>;
