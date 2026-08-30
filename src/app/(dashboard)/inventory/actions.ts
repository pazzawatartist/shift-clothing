"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { stockMovementSchema } from "@/lib/validations/inventory";

export type FormResult = { error?: string; success?: boolean };

export async function recordStockMovement(input: unknown): Promise<FormResult> {
  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_manual_stock_movement", {
    p_variant_id: data.product_variant_id,
    p_type: data.type,
    p_quantity: data.quantity,
    p_notes: data.notes || null,
  });

  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/inventory/low-stock");
  revalidatePath("/dashboard");
  return { success: true };
}
