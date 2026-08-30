"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

export function SalesChart({ data }: { data: { bucket: string; revenue: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: format(new Date(d.bucket), "d MMM") }));

  if (chartData.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No sales data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `₱${v / 1000}k`} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
