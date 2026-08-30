import { createClient } from "@/lib/supabase/server";
import { NewPurchaseForm } from "@/components/purchasing/new-purchase-form";

export default async function NewPurchasePage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").eq("status", "active").order("name");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Purchase Order</h1>
        <p className="text-muted-foreground">Order stock from a supplier.</p>
      </div>
      <NewPurchaseForm suppliers={suppliers ?? []} />
    </div>
  );
}
