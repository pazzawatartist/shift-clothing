import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const [supabase, currentProfile] = await Promise.all([createClient(), getCurrentProfile()]);
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage employee accounts, roles, and access.</p>
      </div>
      <UsersClient profiles={profiles ?? []} currentUserId={currentProfile.id} />
    </div>
  );
}
