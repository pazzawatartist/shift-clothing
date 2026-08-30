"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { collectionSchema } from "@/lib/validations/catalog";
import { slugify } from "@/lib/utils/sku";

export type FormResult = { error?: string; success?: boolean };

export async function upsertCollection(id: string | null, input: unknown): Promise<FormResult> {
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const supabase = await createClient();

  const payload = {
    name: data.name,
    slug: slugify(data.slug || data.name),
    description: data.description || null,
    season: data.season || null,
    status: data.status,
  };

  const { error } = id
    ? await supabase.from("collections").update(payload).eq("id", id)
    : await supabase.from("collections").insert(payload);

  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/products/collections");
  return { success: true };
}

export async function deleteCollection(id: string): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/products/collections");
  return { success: true };
}
