import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ProductStatus,
  ProductRow,
  ProductVariantRow,
  VariantStatus,
} from "@/types/database.types";

export interface ProductListFilters {
  search?: string;
  categoryId?: string;
  collectionId?: string;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}

export type ProductListItem = Pick<
  ProductRow,
  "id" | "sku" | "name" | "status" | "cost_price" | "selling_price" | "category_id"
> & {
  categories: { name: string } | null;
  product_images: { url: string; is_primary: boolean }[];
  // `quantity` (aliased inventory) comes back as a single object, not an array:
  // product_variant_id is UNIQUE on inventory, so PostgREST treats it as one-to-one.
  product_variants: { id: string; quantity: { quantity_on_hand: number } | null }[];
};

export async function listProducts(supabase: SupabaseClient<Database>, filters: ProductListFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "id, sku, name, status, cost_price, selling_price, category_id, categories(name), product_images(url, is_primary), product_variants(id, quantity:inventory(quantity_on_hand))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.collectionId) query = query.eq("collection_id", filters.collectionId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    products: (data ?? []) as unknown as ProductListItem[],
    count: count ?? 0,
    page,
    pageSize,
  };
}

export type ProductForEdit = ProductRow & {
  product_images: { id: string; url: string; alt: string | null; sort_order: number; is_primary: boolean }[];
  product_variants: (ProductVariantRow & {
    inventory: { quantity_on_hand: number; quantity_reserved: number; quantity_sold: number } | null;
  })[];
};

export async function getProductForEdit(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<ProductForEdit> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, product_images(id, url, alt, sort_order, is_primary), product_variants(*, inventory(quantity_on_hand, quantity_reserved, quantity_sold))"
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as ProductForEdit;
}

export type SellableVariant = Pick<ProductVariantRow, "id" | "sku" | "size" | "color" | "selling_price" | "barcode"> & {
  products: {
    id: string;
    name: string;
    status: ProductStatus;
    product_images: { url: string; is_primary: boolean }[];
  };
  inventory: { quantity_on_hand: number; quantity_reserved: number } | null;
};

export async function listActiveVariantsForSale(
  supabase: SupabaseClient<Database>,
  search?: string
): Promise<SellableVariant[]> {
  let query = supabase
    .from("product_variants")
    .select(
      "id, sku, size, color, selling_price, barcode, products!inner(id, name, status, product_images(url, is_primary)), inventory(quantity_on_hand, quantity_reserved)"
    )
    .eq("status", "active" satisfies VariantStatus)
    .eq("products.status", "active")
    .order("sku")
    .limit(50);

  if (search) {
    query = query.or(`sku.ilike.%${search}%,products.name.ilike.%${search}%,barcode.eq.${search}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SellableVariant[];
}
