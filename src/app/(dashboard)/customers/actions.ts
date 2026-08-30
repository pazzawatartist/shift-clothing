"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { customerSchema } from "@/lib/validations/customer";

export type FormResult = { error?: string; success?: boolean; id?: string };

export async function upsertCustomer(id: string | null, input: unknown): Promise<FormResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const supabase = await createClient();

  const payload = {
    full_name: data.full_name,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    birthday: data.birthday || null,
    notes: data.notes || null,
  };

  if (id) {
    const { error } = await supabase.from("customers").update(payload).eq("id", id);
    if (error) return { error: toFriendlyError(error) };
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, id };
  }

  const { data: created, error } = await supabase.from("customers").insert(payload).select("id").single();
  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/customers");
  return { success: true, id: created.id };
}

export async function deleteCustomer(id: string): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/customers");
  return { success: true };
}
