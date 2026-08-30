import { Undo2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { listReturns } from "@/services/returns";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResolveReturnButtons } from "@/components/sales/resolve-return-buttons";
import { formatCurrency } from "@/lib/utils/currency";

export default async function ReturnsPage() {
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  const returns = await listReturns(supabase, {});
  const canResolve = profile.role === "admin" || profile.role === "manager";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Returns &amp; Exchanges</h1>
        <p className="text-muted-foreground">Start a return from an order&apos;s detail page.</p>
      </div>

      {returns.length === 0 ? (
        <EmptyState icon={Undo2} title="No return requests" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Refund</TableHead>
              {canResolve && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">{r.return_number}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "d MMM yyyy")}</p>
                </TableCell>
                <TableCell>{r.orders?.order_number}</TableCell>
                <TableCell>{r.customers?.full_name ?? "—"}</TableCell>
                <TableCell className="capitalize">{r.reason.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right">{formatCurrency(r.refund_amount)}</TableCell>
                {canResolve && (
                  <TableCell className="text-right">
                    <ResolveReturnButtons returnId={r.id} status={r.status} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
