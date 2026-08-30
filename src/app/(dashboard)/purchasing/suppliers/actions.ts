"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { supplierSchema } from "@/lib/validations/catalog";

export type FormResult = { error?: string; success?: boolean };

export async function upsertSupplier(id: string | null, input: unknown): Promise<FormResult> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const supabase = await createClient();

  const payload = {
    name: data.name,
    contact_person: data.contact_person || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    notes: data.notes || null,
    status: data.status,
  };

  const { error } = id
    ? await supabase.from("suppliers").update(payload).eq("id", id)
    : await supabase.from("suppliers").insert(payload);

  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/purchasing/suppliers");
  return { success: true };
}

export async function deleteSupplier(id: string): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/purchasing/suppliers");
  return { success: true };
}
