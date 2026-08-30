import Link from "next/link";
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Package,
  PackageX,
  PackageMinus,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/services/dashboard";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";

export default async function DashboardPage() {
  const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
  const { summary, salesSeries, topProducts, salesByCategory, recentOrders, lowStockItems } =
    await getDashboardData(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {profile.full_name.split(" ")[0]} 👋</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening in your store today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={formatCurrency(summary.todays_sales)} icon={Wallet} />
        <StatCard label="Today's Orders" value={String(summary.todays_orders)} icon={ShoppingBag} />
        <StatCard label="Total Revenue" value={formatCurrency(summary.total_revenue)} icon={TrendingUp} />
        <StatCard label="Net Profit" value={formatCurrency(summary.net_profit)} icon={Wallet} tone="success" />
        <StatCard label="Total Expenses" value={formatCurrency(summary.total_expenses)} icon={Receipt} />
        <StatCard label="Products Sold Today" value={String(summary.products_sold_today)} icon={Package} />
        <StatCard
          label="Low Stock Products"
          value={String(summary.low_stock_count)}
          icon={PackageMinus}
          tone="warning"
        />
        <StatCard
          label="Out of Stock"
          value={String(summary.out_of_stock_count)}
          icon={PackageX}
          tone="destructive"
        />
        <StatCard label="Pending Orders" value={String(summary.pending_orders)} icon={Clock} tone="warning" />
        <StatCard label="Completed Orders" value={String(summary.completed_orders)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={salesByCategory} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No orders yet" description="Sales will show up here once you start ringing them up." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/sales/orders/${order.id}`} className="font-medium text-primary hover:underline">
                          {order.order_number}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), "d MMM yyyy, h:mm a")}
                        </p>
                      </TableCell>
                      <TableCell>{order.customers?.full_name ?? "Walk-in"}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockItems.length === 0 ? (
              <EmptyState icon={Package} title="Stock levels look good" />
            ) : (
              lowStockItems.map((item) => (
                <div key={item.inventory_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.size} / {item.color}
                    </p>
                  </div>
                  <Badge variant={item.quantity_on_hand === 0 ? "destructive" : "warning"}>
                    {item.quantity_on_hand} left
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No sales yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.product_name}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell className="text-right">{p.units_sold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
