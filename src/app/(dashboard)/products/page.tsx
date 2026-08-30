import Link from "next/link";
import { Plus, Shirt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listProducts } from "@/services/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { ProductFilters } from "@/components/products/product-filters";
import { Pagination } from "@/components/shared/pagination";
import type { ProductStatus } from "@/types/database.types";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ products, count, page, pageSize }, { data: categories }] = await Promise.all([
    listProducts(supabase, {
      search: params.search,
      categoryId: params.category,
      status: params.status as ProductStatus | undefined,
      page: params.page ? Number(params.page) : 1,
    }),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">{count} product{count === 1 ? "" : "s"} total</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      <ProductFilters categories={categories ?? []} />

      {products.length === 0 ? (
        <EmptyState icon={Shirt} title="No products found" description="Try adjusting your filters, or add your first product." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const primaryImage = p.product_images?.find((img) => img.is_primary) ?? p.product_images?.[0];
                const totalStock = (p.product_variants ?? []).reduce(
                  (sum, v) => sum + (v.quantity?.quantity_on_hand ?? 0),
                  0
                );
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3 font-medium text-primary hover:underline">
                        {primaryImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={primaryImage.url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                            <Shirt className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                    <TableCell>{p.categories?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "success" : p.status === "draft" ? "secondary" : "outline"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell className="text-right">{totalStock}</TableCell>
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
