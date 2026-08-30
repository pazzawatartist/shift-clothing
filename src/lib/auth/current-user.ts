import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database.types";

/** Fetches the signed-in user's profile. Redirects to /login if missing (should never happen behind middleware). */
export async function getCurrentProfile(): Promise<ProfileRow> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) {
    redirect("/login");
  }

  return profile;
}
