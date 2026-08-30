import { createClient } from "@/lib/supabase/server";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { getDateRangeFromPreset, type RangePreset } from "@/lib/utils/date-range";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { PrintButton } from "@/components/shared/print-button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { TrendingUp } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

export default async function ProductPerformanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.range as RangePreset) ?? "month";
  const { from, to } = getDateRangeFromPreset(preset, params.from, params.to);
  const days = Math.max(differenceInCalendarDays(new Date(to), new Date(from)) + 1, 1);

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_top_products", { p_limit: 100, p_days: days });
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Product Performance</h1>
          <p className="text-muted-foreground">
            {from} to {to}
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <ExportCsvButton
            filename={`product-performance-${from}-to-${to}.csv`}
            columns={[
              { key: "product", label: "Product" },
              { key: "units", label: "Units Sold" },
              { key: "revenue", label: "Revenue" },
            ]}
            rows={rows.map((r) => ({ product: r.product_name, units: r.units_sold, revenue: r.revenue }))}
          />
        </div>
      </div>

      <DateRangeFilter />

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No sales in this period" />
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
                {rows.map((r) => (
                  <TableRow key={r.product_name}>
                    <TableCell className="font-medium">{r.product_name}</TableCell>
                    <TableCell className="text-right">{r.units_sold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
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
