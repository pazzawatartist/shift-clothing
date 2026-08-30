import { createClient } from "@/lib/supabase/server";
import { listSuppliersWithStats } from "@/services/purchasing";
import { SuppliersClient } from "./suppliers-client";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const suppliers = await listSuppliersWithStats(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <p className="text-muted-foreground">Manage supplier contacts and view their purchase history.</p>
      </div>
      <SuppliersClient suppliers={suppliers} />
    </div>
  );
}
