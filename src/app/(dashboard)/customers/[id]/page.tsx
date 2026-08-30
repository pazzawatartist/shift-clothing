import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCustomerProfile } from "@/services/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { ShoppingBag } from "lucide-react";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const customer = await getCustomerProfile(supabase, id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{customer.full_name}</h1>
        <p className="text-muted-foreground">Customer since {format(new Date(customer.created_at), "d MMM yyyy")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{customer.total_orders}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(customer.total_spent)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Purchase</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {customer.last_purchase_at ? format(new Date(customer.last_purchase_at), "d MMM yyyy") : "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.orders.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No orders yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/sales/orders/${o.id}`} className="font-medium text-primary hover:underline">
                          {o.order_number}
                        </Link>
                        <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "d MMM yyyy")}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(o.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Phone:</span> {customer.phone ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {customer.email ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Address:</span> {customer.address ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Birthday:</span>{" "}
              {customer.birthday ? format(new Date(customer.birthday), "d MMM yyyy") : "—"}
            </p>
            {customer.notes && (
              <p className="pt-2">
                <span className="text-muted-foreground">Notes:</span> {customer.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
