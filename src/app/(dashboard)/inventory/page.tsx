import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listInventory } from "@/services/inventory";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";

export default async function InventoryOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  const { items, count, page, pageSize } = await listInventory(supabase, {
    search: params.search,
    page: params.page ? Number(params.page) : 1,
  });
  const canManage = profile.role === "admin" || profile.role === "manager";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Overview</h1>
          <p className="text-muted-foreground">{count} variant{count === 1 ? "" : "s"} tracked</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/inventory/stock-in">
              <Plus className="h-4 w-4" /> Stock In / Adjust
            </Link>
          </Button>
        )}
      </div>

      <SearchBox placeholder="Search by SKU or product name..." />

      {items.length === 0 ? (
        <EmptyState icon={Boxes} title="No inventory yet" description="Add products with variants to start tracking stock." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const variant = item.product_variants;
                const available = item.quantity_on_hand - item.quantity_reserved;
                const status =
                  item.quantity_on_hand === 0 ? "out" : item.quantity_on_hand <= item.reorder_level ? "low" : "ok";
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{variant?.products?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{variant?.sku}</TableCell>
                    <TableCell>
                      {variant?.size} / {variant?.color}
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.quantity_on_hand}</TableCell>
                    <TableCell className="text-right">{item.quantity_reserved}</TableCell>
                    <TableCell className="text-right">{available}</TableCell>
                    <TableCell className="text-right">{item.quantity_sold}</TableCell>
                    <TableCell>
                      {status === "out" && <Badge variant="destructive">Out of stock</Badge>}
                      {status === "low" && <Badge variant="warning">Low stock</Badge>}
                      {status === "ok" && <Badge variant="success">In stock</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination total={count} page={page} pageSize={pageSize} />
        </>
      )}
    </div>
  );
}
