import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { StockMovementForm } from "@/components/inventory/stock-movement-form";

export default async function StockInPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin" && profile.role !== "manager") {
    redirect("/inventory");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock In / Adjustment</h1>
        <p className="text-muted-foreground">Record inbound stock, damage, transfers, or manual corrections.</p>
      </div>
      <StockMovementForm />
    </div>
  );
}
