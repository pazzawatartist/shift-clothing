import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/products/product-form";

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: collections }, { data: suppliers }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("status", "active").order("name"),
    supabase.from("collections").select("id, name").eq("status", "active").order("name"),
    supabase.from("suppliers").select("id, name").eq("status", "active").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Product</h1>
        <p className="text-muted-foreground">Add a new clothing product with its size/color variants.</p>
      </div>
      <ProductForm
        mode="create"
        categories={categories ?? []}
        collections={collections ?? []}
        suppliers={suppliers ?? []}
      />
    </div>
  );
}
