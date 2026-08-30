"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { purchaseSchema } from "@/lib/validations/purchase";

export type FormResult = { error?: string; success?: boolean; id?: string };

export async function createPurchase(input: unknown): Promise<FormResult> {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createClient();
  const { data: purchaseId, error } = await supabase.rpc("create_purchase", {
    p_supplier_id: data.supplier_id,
    p_reference_number: data.reference_number || null,
    p_order_date: data.order_date,
    p_expected_date: data.expected_date || null,
    p_notes: data.notes || null,
    p_items: data.items,
  });

  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/purchasing/purchases");
  return { success: true, id: purchaseId ?? undefined };
}

export async function receivePurchaseItem(purchaseItemId: string, quantity: number): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_purchase_item", {
    p_purchase_item_id: purchaseItemId,
    p_quantity: quantity,
  });
  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/purchasing/purchases");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updatePurchasePaymentStatus(
  purchaseId: string,
  status: "unpaid" | "partial" | "paid"
): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_purchase_payment_status", {
    p_purchase_id: purchaseId,
    p_payment_status: status,
  });
  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/purchasing/purchases");
  return { success: true };
}
