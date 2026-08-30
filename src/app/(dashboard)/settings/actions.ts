"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toFriendlyError } from "@/lib/errors";
import { settingsSchema, inviteUserSchema, updateUserSchema } from "@/lib/validations/settings";
import type { UserRole, UserStatus } from "@/types/database.types";
import { promoCodeSchema } from "@/lib/validations/order";
import { getCurrentProfile } from "@/lib/auth/current-user";

export type FormResult = { error?: string; success?: boolean };

export async function updateSettings(input: unknown): Promise<FormResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("settings")
    .update({
      business_name: data.business_name,
      logo_url: data.logo_url || null,
      address: data.address || null,
      contact_number: data.contact_number || null,
      email: data.email || null,
      social_media: data.social_media ?? {},
      currency: data.currency,
      tax_percentage: data.tax_percentage,
      low_stock_threshold: data.low_stock_threshold,
      auto_deduct_on: data.auto_deduct_on,
      updated_by: user?.id ?? null,
    })
    .eq("id", true);

  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/settings");
  revalidatePath("/sales/pos");
  return { success: true };
}

export async function upsertPromoCode(id: string | null, input: unknown): Promise<FormResult> {
  const parsed = promoCodeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const supabase = await createClient();

  const payload = {
    code: data.code.toUpperCase(),
    type: data.type,
    value: data.value,
    max_discount_amount: data.max_discount_amount || null,
    min_order_amount: data.min_order_amount,
    usage_limit: data.usage_limit || null,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    status: data.status,
  };

  const { error } = id
    ? await supabase.from("promo_codes").update(payload).eq("id", id)
    : await supabase.from("promo_codes").insert(payload);

  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/settings");
  return { success: true };
}

export async function inviteUser(input: unknown): Promise<FormResult> {
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const currentProfile = await getCurrentProfile();
  if (currentProfile.role !== "admin") {
    return { error: "Only admins can invite users" };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.inviteUserByEmail(data.email, {
    data: { full_name: data.full_name },
  });

  if (error) return { error: toFriendlyError(error) };

  if (created.user) {
    await admin.from("profiles").update({ role: data.role }).eq("id", created.user.id);
  }

  revalidatePath("/users");
  return { success: true };
}

export async function updateUser(input: unknown): Promise<FormResult> {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const currentProfile = await getCurrentProfile();
  if (currentProfile.role !== "admin") {
    return { error: "Only admins can manage users" };
  }
  if (data.user_id === currentProfile.id) {
    return { error: "You cannot change your own role or status" };
  }

  const admin = createAdminClient();
  const patch: { role?: UserRole; status?: UserStatus } = {};
  if (data.role) patch.role = data.role;
  if (data.status) patch.status = data.status;

  const { error } = await admin.from("profiles").update(patch).eq("id", data.user_id);
  if (error) return { error: toFriendlyError(error) };

  revalidatePath("/users");
  return { success: true };
}
