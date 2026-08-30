import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { listPurchases } from "@/services/purchasing";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import type { PurchaseStatus } from "@/types/database.types";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const purchases = await listPurchases(supabase, {
    supplierId: params.supplier,
    status: params.status as PurchaseStatus | undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-muted-foreground">Stock-in orders placed with suppliers.</p>
        </div>
        <Button asChild>
          <Link href="/purchasing/purchases/new">
            <Plus className="h-4 w-4" /> New Purchase
          </Link>
        </Button>
      </div>

      {purchases.length === 0 ? (
        <EmptyState icon={Truck} title="No purchase orders yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/purchasing/purchases/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.purchase_number}
                  </Link>
                </TableCell>
                <TableCell>{p.suppliers?.name}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(p.order_date), "d MMM yyyy")}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={p.payment_status} />
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(p.total_cost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
