import { createClient } from "@/lib/supabase/server";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { getDateRangeFromPreset, type RangePreset } from "@/lib/utils/date-range";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { PrintButton } from "@/components/shared/print-button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import { BarChart3 } from "lucide-react";

type Row = {
  id: string;
  quantity: number;
  line_total: number;
  product_name_snapshot: string;
  orders: { order_number: string; created_at: string; customers: { full_name: string } | null } | null;
};

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.range as RangePreset) ?? "month";
  const { from, to } = getDateRangeFromPreset(preset, params.from, params.to);

  const supabase = await createClient();
  const { data } = await supabase
    .from("order_items")
    .select(
      "id, quantity, line_total, product_name_snapshot, orders!inner(order_number, created_at, status, customers(full_name))"
    )
    .eq("orders.status", "completed")
    .gte("orders.created_at", from)
    .lte("orders.created_at", `${to}T23:59:59`)
    .order("created_at", { referencedTable: "orders", ascending: false })
    .limit(500);

  const rows = (data ?? []) as unknown as Row[];
  const totalRevenue = rows.reduce((sum, r) => sum + r.line_total, 0);
  const totalUnits = rows.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sales Report</h1>
          <p className="text-muted-foreground">
            {from} to {to} — {totalUnits} units, {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <ExportCsvButton
            filename={`sales-report-${from}-to-${to}.csv`}
            columns={[
              { key: "date", label: "Date" },
              { key: "order", label: "Order" },
              { key: "customer", label: "Customer" },
              { key: "product", label: "Product" },
              { key: "quantity", label: "Quantity" },
              { key: "revenue", label: "Revenue" },
            ]}
            rows={rows.map((r) => ({
              date: r.orders ? format(new Date(r.orders.created_at), "yyyy-MM-dd") : "",
              order: r.orders?.order_number ?? "",
              customer: r.orders?.customers?.full_name ?? "Walk-in",
              product: r.product_name_snapshot,
              quantity: r.quantity,
              revenue: r.line_total,
            }))}
          />
        </div>
      </div>

      <DateRangeFilter />

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <EmptyState icon={BarChart3} title="No sales in this period" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {r.orders ? format(new Date(r.orders.created_at), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>{r.orders?.order_number}</TableCell>
                    <TableCell>{r.orders?.customers?.full_name ?? "Walk-in"}</TableCell>
                    <TableCell>{r.product_name_snapshot}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
