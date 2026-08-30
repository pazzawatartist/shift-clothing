import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getPurchaseDetail } from "@/services/purchasing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReceiveItemControl } from "@/components/purchasing/receive-item-control";
import { formatCurrency } from "@/lib/utils/currency";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const purchase = await getPurchaseDetail(supabase, id);
  if (!purchase) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{purchase.purchase_number}</h1>
          <p className="text-muted-foreground">{format(new Date(purchase.order_date), "d MMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={purchase.status} />
          <StatusBadge status={purchase.payment_status} />
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
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Receive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.purchase_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.product_variants?.products?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.product_variants?.sku} — {item.product_variants?.size}/{item.product_variants?.color}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.quantity_received}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total_cost)}</TableCell>
                    <TableCell>
                      <ReceiveItemControl purchaseItemId={item.id} remaining={item.quantity - item.quantity_received} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{purchase.suppliers?.name}</p>
              {purchase.suppliers?.contact_person && <p className="text-muted-foreground">{purchase.suppliers.contact_person}</p>}
              {purchase.suppliers?.phone && <p className="text-muted-foreground">{purchase.suppliers.phone}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between text-base font-bold">
                <span>Total Cost</span>
                <span>{formatCurrency(purchase.total_cost)}</span>
              </div>
              {purchase.reference_number && (
                <p className="pt-2 text-muted-foreground">Ref: {purchase.reference_number}</p>
              )}
              {purchase.notes && <p className="text-muted-foreground">{purchase.notes}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
