"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { createOrderSchema, updateOrderStatusSchema } from "@/lib/validations/order";
import { createReturnSchema, resolveReturnSchema } from "@/lib/validations/return";

export type FormResult = { error?: string; success?: boolean; id?: string };

export async function createOrder(input: unknown): Promise<FormResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid order" };
  const data = parsed.data;

  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_customer_id: data.customer_id || null,
    p_sales_channel: data.sales_channel,
    p_items: data.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
    p_payment_method: data.payment_method || null,
    p_discount_type: data.discount_type || null,
    p_discount_value: data.discount_value,
    p_promo_code: data.promo_code || null,
    p_shipping_amount: data.shipping_amount,
    p_shipping_address: data.shipping_address || null,
    p_shipping_notes: data.shipping_notes || null,
    p_amount_paid: data.amount_paid,
    p_notes: data.notes || null,
  });

  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/sales/orders");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/customers");
  return { success: true, id: orderId ?? undefined };
}

export async function updateOrderStatus(input: unknown): Promise<FormResult> {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: data.order_id,
    p_new_status: data.status,
    p_note: data.note || null,
  });

  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${data.order_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  return { success: true };
}

export async function createReturnRequest(input: unknown): Promise<FormResult> {
  const parsed = createReturnSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createClient();
  const { data: returnId, error } = await supabase.rpc("create_return_request", {
    p_order_id: data.order_id,
    p_reason: data.reason,
    p_items: data.items,
    p_notes: data.notes || null,
  });

  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/sales/returns");
  return { success: true, id: returnId ?? undefined };
}

export async function resolveReturn(input: unknown): Promise<FormResult> {
  const parsed = resolveReturnSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_return", {
    p_return_id: data.return_id,
    p_new_status: data.status,
  });

  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/sales/returns");
  revalidatePath("/inventory");
  return { success: true };
}
