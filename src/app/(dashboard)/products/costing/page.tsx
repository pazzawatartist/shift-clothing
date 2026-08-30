import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { EmptyState } from "@/components/shared/empty-state";
import { Calculator } from "lucide-react";

export default async function CostingPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, selling_price, manufacturing_cost, packaging_cost, other_cost")
    .order("name");

  const rows = (products ?? []).map((p) => {
    const totalCost = p.manufacturing_cost + p.packaging_cost + p.other_cost;
    const grossProfit = p.selling_price - totalCost;
    const margin = p.selling_price > 0 ? (grossProfit / p.selling_price) * 100 : 0;
    return { ...p, totalCost, grossProfit, margin };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Product Costing</h1>
        <p className="text-muted-foreground">Manufacturing + packaging + other costs vs. selling price, per product.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon={Calculator} title="No products yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Manufacturing</TableHead>
                  <TableHead className="text-right">Packaging</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(p.manufacturing_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.packaging_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.other_cost)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.totalCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell className="text-right font-medium text-success">{formatCurrency(p.grossProfit)}</TableCell>
                    <TableCell className="text-right">{formatPercent(p.margin)}</TableCell>
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
