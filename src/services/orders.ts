import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderStatus, SalesChannel } from "@/types/database.types";

export type OrderListItem = {
  id: string;
  order_number: string;
  status: OrderStatus;
  sales_channel: SalesChannel;
  payment_status: string;
  payment_method: string | null;
  total_amount: number;
  created_at: string;
  customers: { full_name: string } | null;
};

export async function listOrders(
  supabase: SupabaseClient<Database>,
  filters: { search?: string; status?: OrderStatus; channel?: SalesChannel; page?: number; pageSize?: number }
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("id, order_number, status, sales_channel, payment_status, payment_method, total_amount, created_at, customers(full_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) query = query.ilike("order_number", `%${filters.search}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.channel) query = query.eq("sales_channel", filters.channel);

  const { data, count, error } = await query;
  if (error) throw error;

  return { orders: (data ?? []) as unknown as OrderListItem[], count: count ?? 0, page, pageSize };
}

export type OrderDetail = {
  id: string;
  order_number: string;
  status: OrderStatus;
  sales_channel: SalesChannel;
  payment_status: string;
  payment_method: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  shipping_address: string | null;
  shipping_notes: string | null;
  notes: string | null;
  created_at: string;
  customers: { id: string; full_name: string; phone: string | null; email: string | null } | null;
  order_items: {
    id: string;
    product_name_snapshot: string;
    variant_label_snapshot: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
    product_variant_id: string;
  }[];
  payments: { id: string; amount: number; method: string; paid_at: string }[];
  order_status_history: { id: string; status: OrderStatus; note: string | null; created_at: string }[];
};

export async function getOrderDetail(supabase: SupabaseClient<Database>, id: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, customers(id, full_name, phone, email), order_items(*), payments(id, amount, method, paid_at), order_status_history(id, status, note, created_at)"
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "order_status_history", ascending: true })
    .single();

  if (error) return null;
  return data as unknown as OrderDetail;
}
