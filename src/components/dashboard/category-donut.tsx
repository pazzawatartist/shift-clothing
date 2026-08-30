"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";

const COLORS = [
  "hsl(24, 95%, 53%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 82%, 60%)",
];

export function CategoryDonut({ data }: { data: { category_name: string; revenue: number }[] }) {
  if (data.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No sales data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="revenue"
          nameKey="category_name"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
