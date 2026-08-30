import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PurchaseStatus } from "@/types/database.types";

export type PurchaseListItem = {
  id: string;
  purchase_number: string;
  status: PurchaseStatus;
  payment_status: string;
  order_date: string;
  total_cost: number;
  suppliers: { name: string } | null;
};

export async function listPurchases(
  supabase: SupabaseClient<Database>,
  filters: { supplierId?: string; status?: PurchaseStatus }
) {
  let query = supabase
    .from("purchases")
    .select("id, purchase_number, status, payment_status, order_date, total_cost, suppliers(name)")
    .order("order_date", { ascending: false })
    .limit(100);

  if (filters.supplierId) query = query.eq("supplier_id", filters.supplierId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PurchaseListItem[];
}

export type PurchaseDetail = {
  id: string;
  purchase_number: string;
  status: PurchaseStatus;
  payment_status: string;
  order_date: string;
  expected_date: string | null;
  reference_number: string | null;
  notes: string | null;
  subtotal: number;
  total_cost: number;
  suppliers: { name: string; contact_person: string | null; phone: string | null } | null;
  purchase_items: {
    id: string;
    quantity: number;
    quantity_received: number;
    unit_cost: number;
    total_cost: number;
    product_variants: { sku: string; size: string; color: string; products: { name: string } | null } | null;
  }[];
};

export async function getPurchaseDetail(supabase: SupabaseClient<Database>, id: string): Promise<PurchaseDetail | null> {
  const { data, error } = await supabase
    .from("purchases")
    .select(
      "*, suppliers(name, contact_person, phone), purchase_items(id, quantity, quantity_received, unit_cost, total_cost, product_variants(sku, size, color, products(name)))"
    )
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as PurchaseDetail;
}

export type SupplierWithStats = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  purchases: { total_cost: number }[];
};

export async function listSuppliersWithStats(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, contact_person, phone, email, status, purchases(total_cost)")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as SupplierWithStats[];
}
