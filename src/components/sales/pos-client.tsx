"use client";

import * as React from "react";
import { ProductGrid } from "./product-grid";
import { CartPanel, addToCart, type CartLine } from "./cart-panel";
import type { PosProduct } from "@/hooks/use-pos-catalog";

export function PosClient({
  categories,
  taxPercentage,
}: {
  categories: { id: string; name: string }[];
  taxPercentage: number;
}) {
  const [cart, setCart] = React.useState<CartLine[]>([]);

  function handleAddToCart(product: PosProduct, variant: PosProduct["variants"][number]) {
    setCart((prev) => addToCart(prev, product, variant));
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <div className="overflow-hidden rounded-lg border bg-card p-4">
        <ProductGrid categories={categories} onAddToCart={handleAddToCart} />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card p-4">
        <CartPanel cart={cart} setCart={setCart} taxPercentage={taxPercentage} />
      </div>
    </div>
  );
}
