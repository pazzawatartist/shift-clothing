import { PackageMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

export default async function LowStockPage() {
  const supabase = await createClient();
  const { data: items } = await supabase.rpc("get_low_stock_items", { p_limit: 200 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Low Stock</h1>
        <p className="text-muted-foreground">Variants at or below their reorder level.</p>
      </div>

      {!items || items.length === 0 ? (
        <EmptyState icon={PackageMinus} title="Nothing is low on stock" description="Every variant is above its reorder level." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.inventory_id}>
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell>
                  {item.size} / {item.color}
                </TableCell>
                <TableCell className="text-right font-medium">{item.quantity_on_hand}</TableCell>
                <TableCell className="text-right">{item.reorder_level}</TableCell>
                <TableCell>
                  <Badge variant={item.quantity_on_hand === 0 ? "destructive" : "warning"}>
                    {item.quantity_on_hand === 0 ? "Out of stock" : "Low stock"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
