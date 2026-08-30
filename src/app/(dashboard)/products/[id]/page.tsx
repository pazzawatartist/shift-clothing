import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductForEdit } from "@/services/products";
import { ProductForm } from "@/components/products/product-form";
import { ProductImageManager } from "@/components/products/product-image-manager";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [product, { data: categories }, { data: collections }, { data: suppliers }] = await Promise.all([
    getProductForEdit(supabase, id).catch(() => null),
    supabase.from("categories").select("id, name").eq("status", "active").order("name"),
    supabase.from("collections").select("id, name").eq("status", "active").order("name"),
    supabase.from("suppliers").select("id, name").eq("status", "active").order("name"),
  ]);

  if (!product) notFound();

  const variantStock: Record<string, number> = {};
  for (const v of product.product_variants ?? []) {
    variantStock[v.id] = v.inventory?.quantity_on_hand ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground">SKU: {product.sku}</p>
      </div>

      <ProductImageManager productId={product.id} images={product.product_images ?? []} />

      <ProductForm
        mode="edit"
        initialProduct={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description,
          category_id: product.category_id,
          collection_id: product.collection_id,
          supplier_id: product.supplier_id,
          brand: product.brand,
          status: product.status,
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          discount_price: product.discount_price,
          manufacturing_cost: product.manufacturing_cost,
          packaging_cost: product.packaging_cost,
          other_cost: product.other_cost,
          variants: (product.product_variants ?? []).map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            barcode: v.barcode,
            cost_price: v.cost_price,
            selling_price: v.selling_price,
            reorder_level: v.reorder_level,
            status: v.status,
            initial_stock: 0,
          })),
          variantStock,
        }}
        categories={categories ?? []}
        collections={collections ?? []}
        suppliers={suppliers ?? []}
      />
    </div>
  );
}
