import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InventoryTxnType } from "@/types/database.types";

export type InventoryOverviewRow = {
  id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_sold: number;
  reorder_level: number;
  product_variants: {
    id: string;
    sku: string;
    size: string;
    color: string;
    products: { id: string; name: string; category_id: string | null } | null;
  } | null;
};

export async function listInventory(
  supabase: SupabaseClient<Database>,
  filters: { search?: string; page?: number; pageSize?: number }
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("inventory")
    .select(
      "id, quantity_on_hand, quantity_reserved, quantity_sold, reorder_level, product_variants!inner(id, sku, size, color, products(id, name, category_id))",
      { count: "exact" }
    )
    .order("quantity_on_hand", { ascending: true })
    .range(from, to);

  if (filters.search) {
    query = query.or(`sku.ilike.%${filters.search}%,products.name.ilike.%${filters.search}%`, {
      referencedTable: "product_variants",
    });
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    items: (data ?? []) as unknown as InventoryOverviewRow[],
    count: count ?? 0,
    page,
    pageSize,
  };
}

export type InventoryTransactionWithContext = {
  id: string;
  transaction_type: InventoryTxnType;
  quantity: number;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  product_variants: {
    sku: string;
    size: string;
    color: string;
    products: { name: string } | null;
  } | null;
  profiles: { full_name: string } | null;
};

export async function listInventoryMovements(
  supabase: SupabaseClient<Database>,
  filters: { page?: number; pageSize?: number; type?: InventoryTxnType }
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("inventory_transactions")
    .select(
      "id, transaction_type, quantity, reference_type, notes, created_at, product_variants(sku, size, color, products(name)), profiles(full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.type) query = query.eq("transaction_type", filters.type);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    items: (data ?? []) as unknown as InventoryTransactionWithContext[],
    count: count ?? 0,
    page,
    pageSize,
  };
}
