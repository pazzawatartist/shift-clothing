import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderRow } from "@/types/database.types";

export interface DashboardSummary {
  todays_sales: number;
  todays_orders: number;
  total_revenue: number;
  total_cogs: number;
  total_expenses: number;
  products_sold_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_orders: number;
  completed_orders: number;
}

export interface DashboardSummaryWithProfit extends DashboardSummary {
  net_profit: number;
}

export async function getDashboardData(supabase: SupabaseClient<Database>) {
  const [summaryRes, seriesRes, topProductsRes, categoryRes, recentOrdersRes, lowStockRes] = await Promise.all([
    supabase.rpc("get_dashboard_summary"),
    supabase.rpc("get_sales_series", { p_granularity: "daily", p_days: 14 }),
    supabase.rpc("get_top_products", { p_limit: 5, p_days: 30 }),
    supabase.rpc("get_sales_by_category", { p_days: 30 }),
    supabase
      .from("orders")
      .select("id, order_number, status, total_amount, created_at, sales_channel, customers(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.rpc("get_low_stock_items", { p_limit: 8 }),
  ]);

  const summary = (summaryRes.data ?? {}) as unknown as DashboardSummary;
  const netProfit =
    (summary.total_revenue ?? 0) - (summary.total_cogs ?? 0) - (summary.total_expenses ?? 0);

  return {
    summary: { ...summary, net_profit: netProfit },
    salesSeries: seriesRes.data ?? [],
    topProducts: topProductsRes.data ?? [],
    salesByCategory: categoryRes.data ?? [],
    recentOrders: (recentOrdersRes.data ?? []) as unknown as (Pick<
      OrderRow,
      "id" | "order_number" | "status" | "total_amount" | "created_at" | "sales_channel"
    > & { customers: { full_name: string } | null })[],
    lowStockItems: lowStockRes.data ?? [],
  };
}
