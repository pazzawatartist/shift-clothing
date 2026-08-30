import { createClient } from "@/lib/supabase/server";
import { PosClient } from "@/components/sales/pos-client";

export default async function PosPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("status", "active").order("name"),
    supabase.from("settings").select("tax_percentage").single(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Point of Sale</h1>
        <p className="text-muted-foreground">Search products, build the cart, and check out.</p>
      </div>
      <PosClient categories={categories ?? []} taxPercentage={settings?.tax_percentage ?? 0} />
    </div>
  );
}
