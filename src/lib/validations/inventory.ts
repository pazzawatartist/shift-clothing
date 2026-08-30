import { z } from "zod";

export const stockMovementSchema = z.object({
  product_variant_id: z.string().uuid("Select a variant"),
  type: z.enum(["stock_in", "stock_out", "adjustment", "damage", "transfer"]),
  quantity: z.coerce.number().int().refine((v) => v !== 0, "Quantity cannot be zero"),
  notes: z.string().max(500).optional().nullable(),
});
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
