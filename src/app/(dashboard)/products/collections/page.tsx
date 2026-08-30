import { createClient } from "@/lib/supabase/server";
import { CollectionsClient } from "./collections-client";

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data: collections } = await supabase.from("collections").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="text-muted-foreground">Group products into seasonal or themed drops.</p>
      </div>
      <CollectionsClient collections={collections ?? []} />
    </div>
  );
}
