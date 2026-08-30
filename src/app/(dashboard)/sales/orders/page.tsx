import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listOrders } from "@/services/orders";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import type { OrderStatus } from "@/types/database.types";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { orders, count, page, pageSize } = await listOrders(supabase, {
    search: params.search,
    status: params.status as OrderStatus | undefined,
    page: params.page ? Number(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">{count} order{count === 1 ? "" : "s"} total</p>
      </div>

      <SearchBox placeholder="Search by order number..." />

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/sales/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "d MMM yyyy, h:mm a")}</p>
                  </TableCell>
                  <TableCell>{order.customers?.full_name ?? "Walk-in"}</TableCell>
                  <TableCell className="capitalize">{order.sales_channel}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.payment_status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
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
