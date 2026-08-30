import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { PrintButton } from "@/components/shared/print-button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { Boxes } from "lucide-react";

type Row = {
  id: string;
  quantity_on_hand: number;
  quantity_sold: number;
  reorder_level: number;
  product_variants: {
    sku: string;
    size: string;
    color: string;
    cost_price: number;
    products: { name: string } | null;
  } | null;
};

export default async function InventoryReportPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory")
    .select("id, quantity_on_hand, quantity_sold, reorder_level, product_variants(sku, size, color, cost_price, products(name))")
    .order("quantity_on_hand", { ascending: true })
    .limit(1000);

  const rows = (data ?? []) as unknown as Row[];
  const totalValue = rows.reduce((sum, r) => sum + r.quantity_on_hand * (r.product_variants?.cost_price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory Report</h1>
          <p className="text-muted-foreground">Stock valuation at cost: {formatCurrency(totalValue)}</p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <ExportCsvButton
            filename="inventory-report.csv"
            columns={[
              { key: "product", label: "Product" },
              { key: "sku", label: "SKU" },
              { key: "variant", label: "Variant" },
              { key: "on_hand", label: "On Hand" },
              { key: "sold", label: "Sold" },
              { key: "reorder_level", label: "Reorder Level" },
              { key: "value", label: "Stock Value" },
            ]}
            rows={rows.map((r) => ({
              product: r.product_variants?.products?.name ?? "",
              sku: r.product_variants?.sku ?? "",
              variant: `${r.product_variants?.size ?? ""}/${r.product_variants?.color ?? ""}`,
              on_hand: r.quantity_on_hand,
              sold: r.quantity_sold,
              reorder_level: r.reorder_level,
              value: r.quantity_on_hand * (r.product_variants?.cost_price ?? 0),
            }))}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <EmptyState icon={Boxes} title="No inventory data" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.product_variants?.products?.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.product_variants?.sku} — {r.product_variants?.size}/{r.product_variants?.color}
                    </TableCell>
                    <TableCell className="text-right">{r.quantity_on_hand}</TableCell>
                    <TableCell className="text-right">{r.quantity_sold}</TableCell>
                    <TableCell className="text-right">{r.reorder_level}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.quantity_on_hand * (r.product_variants?.cost_price ?? 0))}
                    </TableCell>
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
