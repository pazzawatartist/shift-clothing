import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CustomerRow, OrderStatus } from "@/types/database.types";

export async function listCustomers(
  supabase: SupabaseClient<Database>,
  filters: { search?: string; page?: number; pageSize?: number }
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);

  const { data, count, error } = await query;
  if (error) throw error;

  return { customers: (data ?? []) as CustomerRow[], count: count ?? 0, page, pageSize };
}

export type CustomerProfile = CustomerRow & {
  orders: {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: number;
    created_at: string;
  }[];
};

export async function getCustomerProfile(supabase: SupabaseClient<Database>, id: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*, orders(id, order_number, status, total_amount, created_at)")
    .eq("id", id)
    .order("created_at", { referencedTable: "orders", ascending: false })
    .single();
  if (error) return null;
  return data as unknown as CustomerProfile;
}
