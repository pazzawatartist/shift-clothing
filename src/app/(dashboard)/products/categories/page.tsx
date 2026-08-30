import { createClient } from "@/lib/supabase/server";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-muted-foreground">Organize products into browsable categories.</p>
      </div>
      <CategoriesClient categories={categories ?? []} />
    </div>
  );
}
