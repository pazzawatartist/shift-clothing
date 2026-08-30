import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReturnStatus } from "@/types/database.types";

export type ReturnListItem = {
  id: string;
  return_number: string;
  status: ReturnStatus;
  reason: string;
  refund_amount: number;
  created_at: string;
  orders: { order_number: string } | null;
  customers: { full_name: string } | null;
};

export async function listReturns(supabase: SupabaseClient<Database>, filters: { status?: ReturnStatus }) {
  let query = supabase
    .from("returns")
    .select("id, return_number, status, reason, refund_amount, created_at, orders(order_number), customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ReturnListItem[];
}

export type ReturnDetail = {
  id: string;
  return_number: string;
  status: ReturnStatus;
  reason: string;
  notes: string | null;
  refund_amount: number;
  created_at: string;
  orders: { order_number: string } | null;
  return_items: {
    id: string;
    quantity: number;
    action: string;
    product_variants: { sku: string; size: string; color: string; products: { name: string } | null } | null;
  }[];
};

export async function getReturnDetail(supabase: SupabaseClient<Database>, id: string): Promise<ReturnDetail | null> {
  const { data, error } = await supabase
    .from("returns")
    .select(
      "*, orders(order_number), return_items(id, quantity, action, product_variants(sku, size, color, products(name)))"
    )
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as ReturnDetail;
}
