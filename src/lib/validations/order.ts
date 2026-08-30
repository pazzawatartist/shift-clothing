import { z } from "zod";

export const cartItemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const createOrderSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  sales_channel: z.enum(["pos", "online"]).default("pos"),
  items: z.array(cartItemSchema).min(1, "Add at least one product to the cart"),
  payment_method: z.enum(["cash", "gcash", "maya", "bank_transfer", "card", "other"]).optional().nullable(),
  discount_type: z.enum(["fixed", "percentage"]).optional().nullable(),
  discount_value: z.coerce.number().min(0).default(0),
  promo_code: z.string().max(40).optional().nullable(),
  shipping_amount: z.coerce.number().min(0).default(0),
  shipping_address: z.string().max(500).optional().nullable(),
  shipping_notes: z.string().max(500).optional().nullable(),
  amount_paid: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "processing", "ready", "completed", "cancelled", "refunded"]),
  note: z.string().max(500).optional().nullable(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const promoCodeSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(40),
  type: z.enum(["fixed", "percentage"]),
  value: z.coerce.number().positive("Value must be greater than zero"),
  max_discount_amount: z.coerce.number().min(0).optional().nullable(),
  min_order_amount: z.coerce.number().min(0).default(0),
  usage_limit: z.coerce.number().int().positive().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});
export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
