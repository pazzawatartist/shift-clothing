import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/services/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderTimeline } from "@/components/sales/order-timeline";
import { OrderStatusControl } from "@/components/sales/order-status-control";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const order = await getOrderDetail(supabase, id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">{format(new Date(order.created_at), "d MMM yyyy, h:mm a")}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <OrderStatusControl orderId={order.id} currentStatus={order.status} />
          {order.status === "completed" && (
            <Button variant="outline" asChild>
              <Link href={`/sales/returns/new?order_id=${order.id}`}>Start Return</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.product_name_snapshot}</p>
                      <p className="text-xs text-muted-foreground">{item.variant_label_snapshot}</p>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(order.shipping_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatCurrency(order.amount_paid)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customers?.full_name ?? "Walk-in customer"}</p>
              {order.customers?.phone && <p className="text-muted-foreground">{order.customers.phone}</p>}
              {order.customers?.email && <p className="text-muted-foreground">{order.customers.email}</p>}
              {order.shipping_address && (
                <p className="pt-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Ship to:</span> {order.shipping_address}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline history={order.order_status_history} placedAt={order.created_at} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
