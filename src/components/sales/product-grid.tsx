"use client";

import * as React from "react";
import { Search, Shirt } from "lucide-react";
import { usePosCatalog, type PosProduct } from "@/hooks/use-pos-catalog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { VariantSelectDialog } from "./variant-select-dialog";
import { EmptyState } from "@/components/shared/empty-state";

export function ProductGrid({
  categories,
  onAddToCart,
}: {
  categories: { id: string; name: string }[];
  onAddToCart: (product: PosProduct, variant: PosProduct["variants"][number]) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [activeProduct, setActiveProduct] = React.useState<PosProduct | null>(null);
  const { data: products = [], isLoading } = usePosCatalog(search, categoryId);

  const debouncedSetSearch = useDebouncedCallback(setSearch, 300);

  function handleProductClick(product: PosProduct) {
    const onlyVariant = product.variants.length === 1 ? product.variants[0] : undefined;
    if (onlyVariant) {
      onAddToCart(product, onlyVariant);
      return;
    }
    setActiveProduct(product);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products..."
            onChange={(e) => debouncedSetSearch(e.target.value)}
          />
        </div>
        <Select value={categoryId ?? "all"} onValueChange={(v) => setCategoryId(v === "all" ? null : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading products...</p>
        ) : products.length === 0 ? (
          <EmptyState icon={Shirt} title="No products found" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const totalAvailable = p.variants.reduce((sum, v) => sum + Math.max(v.available, 0), 0);
              return (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  disabled={totalAvailable <= 0}
                  className="flex flex-col overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="flex aspect-square items-center justify-center bg-muted">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Shirt className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(p.selling_price)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <VariantSelectDialog
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onSelect={(variant) => {
          if (activeProduct) onAddToCart(activeProduct, variant);
          setActiveProduct(null);
        }}
      />
    </div>
  );
}
