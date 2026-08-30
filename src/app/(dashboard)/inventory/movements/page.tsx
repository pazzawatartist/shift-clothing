import { History } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { listInventoryMovements } from "@/services/inventory";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import type { InventoryTxnType } from "@/types/database.types";

const TYPE_TONE: Record<InventoryTxnType, "success" | "destructive" | "secondary" | "warning"> = {
  stock_in: "success",
  sale: "secondary",
  return: "success",
  damage: "destructive",
  stock_out: "destructive",
  adjustment: "warning",
  transfer: "warning",
};

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { items, count, page, pageSize } = await listInventoryMovements(supabase, {
    page: params.page ? Number(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock Movements</h1>
        <p className="text-muted-foreground">Full audit trail of every inventory change.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={History} title="No stock movements yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(txn.created_at), "d MMM yyyy, h:mm a")}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{txn.product_variants?.products?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {txn.product_variants?.sku} — {txn.product_variants?.size}/{txn.product_variants?.color}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={TYPE_TONE[txn.transaction_type]} className="capitalize">
                      {txn.transaction_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${txn.quantity < 0 ? "text-destructive" : "text-success"}`}>
                    {txn.quantity > 0 ? `+${txn.quantity}` : txn.quantity}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{txn.reference_type ?? "—"}</TableCell>
                  <TableCell className="text-sm">{txn.profiles?.full_name ?? "System"}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{txn.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination total={count} page={page} pageSize={pageSize} />
        </>
      )}
    </div>
  );
}
