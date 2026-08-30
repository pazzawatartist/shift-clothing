"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { expenseSchema } from "@/lib/validations/expense";

export type FormResult = { error?: string; success?: boolean };

export async function upsertExpense(id: string | null, input: unknown): Promise<FormResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    category: data.category,
    description: data.description,
    amount: data.amount,
    expense_date: data.expense_date,
    payment_method: data.payment_method,
    receipt_url: data.receipt_url || null,
    notes: data.notes || null,
    created_by: user?.id ?? null,
  };

  const { error } = id
    ? await supabase.from("expenses").update(payload).eq("id", id)
    : await supabase.from("expenses").insert(payload);

  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports/profit-loss");
  return { success: true };
}

export async function deleteExpense(id: string): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/expenses");
  return { success: true };
}
