import { z } from "zod";

export const purchaseItemSchema = z.object({
  product_variant_id: z.string().uuid("Select a variant"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unit_cost: z.coerce.number().min(0, "Unit cost cannot be negative"),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;

export const purchaseSchema = z.object({
  supplier_id: z.string().uuid("Select a supplier"),
  reference_number: z.string().max(100).optional().nullable(),
  order_date: z.string().min(1, "Order date is required"),
  expected_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;
